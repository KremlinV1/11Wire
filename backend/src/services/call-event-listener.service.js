/**
 * Call Event Listener Service
 * 
 * Handles real-time call event listening and processing
 */

const signalWireService = require('./signalwire.service');
const callLogService = require('./call-log.service');
const callSchedulerService = require('./call-scheduler.service');
const db = require('../models');
const logger = require('../utils/logger');
const config = require('../config');
const { EventEmitter } = require('events');

// Call event emitter for internal pub/sub
const callEventEmitter = new EventEmitter();

// Active listeners
const activeListeners = new Map();

/**
 * Initialize real-time call event listeners
 * @returns {Object} Listener status
 */
const initializeEventListeners = async () => {
  try {
    // Get SignalWire client
    const client = await signalWireService.getClient();
    
    // Set up SignalWire event listeners if not already connected
    if (!activeListeners.has('global')) {
      const listener = await setupCallEventListeners(client);
      activeListeners.set('global', listener);
      
      logger.info('Real-time call event listeners initialized');
    }
    
    return {
      success: true,
      listenersActive: activeListeners.size,
      status: 'initialized'
    };
  } catch (error) {
    logger.error(`Error initializing call event listeners: ${error.message}`);
    throw error;
  }
};

/**
 * Set up SignalWire event listeners
 * @param {Object} client - SignalWire client
 * @returns {Object} Listener information
 */
const setupCallEventListeners = async (client) => {
  try {
    // Create a new listener with call filters
    const listener = {
      id: `global-${Date.now()}`,
      created: new Date(),
      events: []
    };
    
    // Event handlers
    const callStartedHandler = (call) => {
      handleCallEvent('call.started', call);
      listener.events.push({
        type: 'call.started',
        callSid: call.id,
        timestamp: new Date()
      });
    };
    
    const callAnsweredHandler = (call) => {
      handleCallEvent('call.answered', call);
      listener.events.push({
        type: 'call.answered',
        callSid: call.id,
        timestamp: new Date()
      });
    };
    
    const callEndedHandler = (call) => {
      handleCallEvent('call.ended', call);
      listener.events.push({
        type: 'call.ended',
        callSid: call.id,
        timestamp: new Date()
      });
    };
    
    const recordingStartedHandler = (call, recording) => {
      handleRecordingEvent('recording.started', call, recording);
      listener.events.push({
        type: 'recording.started',
        callSid: call.id,
        recordingSid: recording.id,
        timestamp: new Date()
      });
    };
    
    const recordingEndedHandler = (call, recording) => {
      handleRecordingEvent('recording.ended', call, recording);
      listener.events.push({
        type: 'recording.ended',
        callSid: call.id,
        recordingSid: recording.id,
        timestamp: new Date()
      });
    };
    
    // Set up event handlers on the client
    client.on('call.started', callStartedHandler);
    client.on('call.answered', callAnsweredHandler);
    client.on('call.ended', callEndedHandler);
    client.on('recording.started', recordingStartedHandler);
    client.on('recording.ended', recordingEndedHandler);
    
    // Store cleanup function
    listener.cleanup = () => {
      client.off('call.started', callStartedHandler);
      client.off('call.answered', callAnsweredHandler);
      client.off('call.ended', callEndedHandler);
      client.off('recording.started', recordingStartedHandler);
      client.off('recording.ended', recordingEndedHandler);
    };
    
    logger.info(`SignalWire event listeners set up with ID ${listener.id}`);
    
    return listener;
  } catch (error) {
    logger.error(`Error setting up call event listeners: ${error.message}`);
    throw error;
  }
};

/**
 * Handle call events
 * @param {string} eventType - Type of event
 * @param {Object} call - Call object from SignalWire
 */
const handleCallEvent = async (eventType, call) => {
  try {
    logger.info(`Call event received: ${eventType} for call ${call.id}`);
    
    // Find the call in our database
    const callLog = await db.CallLog.findOne({
      where: { callSid: call.id }
    });
    
    // Get full call details from SignalWire if needed
    const callDetails = call.direction ? call : await signalWireService.getCallDetails(call.id);
    
    // Process based on event type
    switch (eventType) {
      case 'call.started':
        // Call has been initiated
        if (callLog) {
          await callLog.update({
            status: 'in-progress',
            startTime: new Date(),
            metadata: {
              ...callLog.metadata,
              events: [...(callLog.metadata?.events || []), {
                type: eventType,
                timestamp: new Date().toISOString()
              }]
            }
          });
        } else {
          // Create new call log if not exists
          await db.CallLog.create({
            callSid: call.id,
            direction: callDetails.direction,
            phoneNumber: callDetails.to,
            status: 'in-progress',
            startTime: new Date(),
            metadata: {
              events: [{
                type: eventType,
                timestamp: new Date().toISOString()
              }],
              callDetails: {
                from: callDetails.from,
                to: callDetails.to,
                direction: callDetails.direction
              }
            }
          });
        }
        break;
      
      case 'call.answered':
        // Call has been answered
        if (callLog) {
          await callLog.update({
            status: 'answered',
            answerTime: new Date(),
            metadata: {
              ...callLog.metadata,
              events: [...(callLog.metadata?.events || []), {
                type: eventType,
                timestamp: new Date().toISOString()
              }]
            }
          });
        }
        break;
      
      case 'call.ended':
        // Call has ended
        if (callLog) {
          // Update the call log
          await callLog.update({
            status: callDetails.status || 'completed',
            endTime: new Date(),
            duration: callDetails.duration || 0,
            metadata: {
              ...callLog.metadata,
              events: [...(callLog.metadata?.events || []), {
                type: eventType,
                timestamp: new Date().toISOString()
              }],
              endReason: callDetails.status
            }
          });
          
          // Handle call completion for scheduled calls
          if (callLog.campaignId) {
            await callSchedulerService.handleCallCompletion(call.id, callDetails.status, {
              duration: callDetails.duration,
              endReason: callDetails.status
            });
          }
        }
        break;
    }
    
    // Emit event for subscribers
    callEventEmitter.emit(eventType, {
      callSid: call.id,
      timestamp: new Date(),
      callDetails
    });
    
    // Emit campaign-specific event if available
    if (callLog && callLog.campaignId) {
      callEventEmitter.emit(`${eventType}.campaign.${callLog.campaignId}`, {
        callSid: call.id,
        campaignId: callLog.campaignId,
        contactId: callLog.contactId,
        timestamp: new Date(),
        callDetails
      });
    }
  } catch (error) {
    logger.error(`Error handling call event ${eventType} for ${call.id}: ${error.message}`);
  }
};

/**
 * Handle recording events
 * @param {string} eventType - Type of event
 * @param {Object} call - Call object from SignalWire
 * @param {Object} recording - Recording object from SignalWire
 */
const handleRecordingEvent = async (eventType, call, recording) => {
  try {
    logger.info(`Recording event received: ${eventType} for call ${call.id}, recording ${recording.id}`);
    
    // Find the call in our database
    const callLog = await db.CallLog.findOne({
      where: { callSid: call.id }
    });
    
    // Process based on event type
    switch (eventType) {
      case 'recording.started':
        // Recording has started
        if (callLog) {
          await callLog.update({
            metadata: {
              ...callLog.metadata,
              events: [...(callLog.metadata?.events || []), {
                type: eventType,
                timestamp: new Date().toISOString(),
                recordingSid: recording.id
              }],
              recording: {
                ...callLog.metadata?.recording,
                recordingSid: recording.id,
                startTime: new Date().toISOString(),
                status: 'in-progress'
              }
            }
          });
        }
        
        // Create call recording entry
        await db.CallRecording.create({
          recordingSid: recording.id,
          callSid: call.id,
          status: 'in-progress',
          startTime: new Date(),
          metadata: {
            events: [{
              type: eventType,
              timestamp: new Date().toISOString()
            }]
          }
        });
        break;
      
      case 'recording.ended':
        // Recording has ended
        if (callLog) {
          // Get recording details
          const recordingDetails = await signalWireService.getRecordingDetails(recording.id);
          
          await callLog.update({
            recordingUrl: recordingDetails?.mediaUrl,
            metadata: {
              ...callLog.metadata,
              events: [...(callLog.metadata?.events || []), {
                type: eventType,
                timestamp: new Date().toISOString(),
                recordingSid: recording.id
              }],
              recording: {
                ...callLog.metadata?.recording,
                recordingSid: recording.id,
                endTime: new Date().toISOString(),
                status: 'completed',
                duration: recordingDetails?.duration || 0,
                url: recordingDetails?.mediaUrl
              }
            }
          });
        }
        
        // Update call recording entry
        await db.CallRecording.update({
          status: 'completed',
          endTime: new Date(),
          duration: recording.duration || 0,
          url: recording.mediaUrl,
          metadata: {
            events: [{
              type: eventType,
              timestamp: new Date().toISOString()
            }]
          }
        }, {
          where: { recordingSid: recording.id }
        });
        break;
    }
    
    // Emit event for subscribers
    callEventEmitter.emit(eventType, {
      callSid: call.id,
      recordingSid: recording.id,
      timestamp: new Date(),
      recordingDetails: recording
    });
    
    // Emit campaign-specific event if available
    if (callLog && callLog.campaignId) {
      callEventEmitter.emit(`${eventType}.campaign.${callLog.campaignId}`, {
        callSid: call.id,
        recordingSid: recording.id,
        campaignId: callLog.campaignId,
        timestamp: new Date(),
        recordingDetails: recording
      });
    }
  } catch (error) {
    logger.error(`Error handling recording event ${eventType} for ${recording.id}: ${error.message}`);
  }
};

/**
 * Subscribe to call events
 * @param {string} eventType - Type of event to subscribe to
 * @param {function} callback - Callback function
 * @param {Object} filter - Event filter options
 * @returns {Object} Subscription information
 */
const subscribeToCallEvents = (eventType, callback, filter = {}) => {
  try {
    // Validate event type
    const validEventTypes = [
      'call.started', 'call.answered', 'call.ended',
      'recording.started', 'recording.ended'
    ];
    
    if (!validEventTypes.includes(eventType) && !eventType.startsWith('call.') && !eventType.startsWith('recording.')) {
      throw new Error(`Invalid event type: ${eventType}`);
    }
    
    // Create event name with filter
    let eventName = eventType;
    
    // Add campaign filter if specified
    if (filter.campaignId) {
      eventName = `${eventType}.campaign.${filter.campaignId}`;
    }
    
    // Subscribe to the event
    callEventEmitter.on(eventName, callback);
    
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    logger.info(`New subscription ${subscriptionId} created for event ${eventName}`);
    
    return {
      id: subscriptionId,
      eventType,
      eventName,
      filter,
      created: new Date(),
      unsubscribe: () => {
        callEventEmitter.off(eventName, callback);
        logger.info(`Subscription ${subscriptionId} removed for event ${eventName}`);
      }
    };
  } catch (error) {
    logger.error(`Error subscribing to call events: ${error.message}`);
    throw error;
  }
};

/**
 * Set up webhooks for call events
 * @param {string} webhookUrl - URL to send webhooks to
 * @param {Array<string>} eventTypes - Event types to send webhooks for
 * @param {Object} filter - Event filter options
 * @returns {Object} Webhook configuration
 */
const setupCallEventWebhooks = (webhookUrl, eventTypes, filter = {}) => {
  try {
    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Invalid webhook URL');
    }
    
    // Default to all event types if not specified
    const events = eventTypes && eventTypes.length > 0 ? eventTypes : [
      'call.started', 'call.answered', 'call.ended',
      'recording.started', 'recording.ended'
    ];
    
    // Create webhook ID
    const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Set up subscriptions for each event type
    const subscriptions = [];
    
    for (const eventType of events) {
      const subscription = subscribeToCallEvents(eventType, async (eventData) => {
        try {
          await sendWebhook(webhookUrl, eventType, eventData);
        } catch (error) {
          logger.error(`Error sending webhook for ${eventType}: ${error.message}`);
        }
      }, filter);
      
      subscriptions.push(subscription);
    }
    
    logger.info(`Call event webhooks set up for ${webhookUrl} with ID ${webhookId}`);
    
    return {
      id: webhookId,
      url: webhookUrl,
      events,
      filter,
      subscriptions,
      created: new Date(),
      // Function to remove all webhooks
      remove: () => {
        subscriptions.forEach(sub => sub.unsubscribe());
        logger.info(`Call event webhooks removed for ${webhookUrl}`);
      }
    };
  } catch (error) {
    logger.error(`Error setting up call event webhooks: ${error.message}`);
    throw error;
  }
};

/**
 * Send webhook with event data
 * @param {string} url - Webhook URL
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
const sendWebhook = async (url, eventType, data) => {
  try {
    const axios = require('axios');
    
    // Create webhook payload
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Add signature for security
    const signature = generateWebhookSignature(payload);
    
    // Send webhook
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-11Wire-Event': eventType,
        'X-11Wire-Signature': signature
      }
    });
    
    logger.info(`Webhook sent to ${url} for event ${eventType}, status: ${response.status}`);
  } catch (error) {
    logger.error(`Error sending webhook to ${url}: ${error.message}`);
    throw error;
  }
};

/**
 * Generate signature for webhook security
 * @param {Object} data - Webhook data
 * @returns {string} Signature
 */
const generateWebhookSignature = (data) => {
  try {
    const crypto = require('crypto');
    const signingSecret = config.webhookSigningSecret || 'default-secret';
    
    const payload = JSON.stringify(data);
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(payload)
      .digest('hex');
    
    return signature;
  } catch (error) {
    logger.error(`Error generating webhook signature: ${error.message}`);
    return '';
  }
};

/**
 * Get call events for a specific call
 * @param {string} callSid - Call SID
 * @returns {Array<Object>} Call events
 */
const getCallEvents = async (callSid) => {
  try {
    // Find the call in our database
    const callLog = await db.CallLog.findOne({
      where: { callSid }
    });
    
    if (!callLog) {
      throw new Error(`Call ${callSid} not found`);
    }
    
    // Extract events from metadata
    const events = callLog.metadata?.events || [];
    
    return events;
  } catch (error) {
    logger.error(`Error getting call events for ${callSid}: ${error.message}`);
    throw error;
  }
};

/**
 * Get call statistics for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Call statistics
 */
const getCallStatistics = async (campaignId) => {
  try {
    // Get call counts by status
    const statusCounts = await db.CallLog.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: { campaignId },
      group: ['status']
    });
    
    // Format into an object
    const counts = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.getDataValue('count'), 10);
      return acc;
    }, {
      'in-progress': 0,
      answered: 0,
      completed: 0,
      failed: 0,
      busy: 0,
      'no-answer': 0
    });
    
    // Calculate total
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Get average call duration
    const durationResult = await db.CallLog.findOne({
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('duration')), 'avgDuration']
      ],
      where: { 
        campaignId,
        duration: {
          [db.Sequelize.Op.not]: null
        }
      }
    });
    
    const avgDuration = durationResult ? parseFloat(durationResult.getDataValue('avgDuration')) || 0 : 0;
    
    return {
      campaignId,
      total,
      counts,
      avgDuration: Math.round(avgDuration),
      asOf: new Date()
    };
  } catch (error) {
    logger.error(`Error getting call statistics for campaign ${campaignId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  initializeEventListeners,
  subscribeToCallEvents,
  setupCallEventWebhooks,
  getCallEvents,
  getCallStatistics,
  callEventEmitter // Exposed for direct use in other modules
};
