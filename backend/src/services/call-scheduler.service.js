/**
 * Call Scheduler Service
 * 
 * Handles batch outbound call scheduling with retry logic
 */

const signalWireService = require('./signalwire.service');
const campaignService = require('./campaign.service');
const contactService = require('./contact.service');
const callLogService = require('./call-log.service');
const db = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

// Models
const { CallLog, Contact, Campaign } = db;

/**
 * Schedule a batch of calls for a campaign
 * @param {string} campaignId - ID of the campaign
 * @param {Array<string>} contactIds - Array of contact IDs to call
 * @param {Object} options - Scheduling options
 * @param {number} options.maxConcurrent - Maximum concurrent calls (default: 5)
 * @param {number} options.callDelay - Delay between calls in ms (default: 2000)
 * @param {boolean} options.useAmd - Use Answering Machine Detection (default: true)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelayMinutes - Delay between retries in minutes (default: 60)
 * @param {Object} options.retryOn - Status codes to retry on (default: busy, no-answer, failed)
 * @returns {Object} Schedule result
 */
const scheduleBatchCalls = async (campaignId, contactIds, options = {}) => {
  try {
    // Validate campaign exists
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Get default webhook URL from campaign or config
    const webhookUrl = campaign.webhookUrl || `${config.publicUrl}/api/calls/webhook`;

    // Default options
    const defaultOptions = {
      maxConcurrent: 5,
      callDelay: 2000, // 2 seconds between each call
      useAmd: true,
      maxRetries: 3,
      retryDelayMinutes: 60,
      retryOn: {
        busy: true,
        'no-answer': true,
        failed: true
      }
    };
    
    // Merge with provided options
    const callOptions = { ...defaultOptions, ...options };
    
    // Validate contacts exist
    const contacts = await Contact.findAll({
      where: { 
        id: contactIds
      }
    });
    
    if (contacts.length === 0) {
      throw new Error('No valid contacts found for batch call');
    }
    
    logger.info(`Scheduling batch of ${contacts.length} calls for campaign ${campaignId}`);
    
    // Create call queue entries
    const queueEntries = await createCallQueueEntries(campaignId, contacts, callOptions);
    
    // Start initial batch of calls
    await initiateFirstBatch(campaignId, callOptions.maxConcurrent);
    
    return {
      campaignId,
      scheduledCalls: contacts.length,
      queuedCalls: queueEntries.length,
      options: callOptions
    };
  } catch (error) {
    logger.error(`Error scheduling batch calls: ${error.message}`);
    throw error;
  }
};

/**
 * Create call queue entries for contacts
 * @param {string} campaignId - Campaign ID
 * @param {Array<Object>} contacts - Array of contact objects
 * @param {Object} options - Call options
 * @returns {Array<Object>} Created queue entries
 */
const createCallQueueEntries = async (campaignId, contacts, options) => {
  try {
    // Get campaign caller ID
    const campaign = await Campaign.findByPk(campaignId);
    const from = campaign.callerId || config.defaultCallerId;
    const phoneNumberId = campaign.phoneNumberId || null;
    
    // Current time
    const now = new Date();
    
    // Create queue entries
    const queueEntries = [];
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Calculate scheduled time with delay between calls
      const scheduledTime = new Date(now.getTime() + (i * options.callDelay));
      
      // Create queue entry
      const queueEntry = await db.CallQueue.create({
        campaignId,
        contactId: contact.id,
        phoneNumber: contact.phone,
        callerId: from,
        phoneNumberId,
        status: 'scheduled',
        priority: 1, // Default priority
        scheduledTime,
        attempts: 0,
        maxAttempts: options.maxRetries,
        useAmd: options.useAmd,
        metadata: {
          contactName: contact.name,
          contactEmail: contact.email,
          campaignName: campaign.name
        }
      });
      
      queueEntries.push(queueEntry);
    }
    
    logger.info(`Created ${queueEntries.length} call queue entries for campaign ${campaignId}`);
    return queueEntries;
  } catch (error) {
    logger.error(`Error creating call queue entries: ${error.message}`);
    throw error;
  }
};

/**
 * Initiate first batch of calls from the queue
 * @param {string} campaignId - Campaign ID
 * @param {number} maxConcurrent - Maximum concurrent calls
 * @returns {Array<Object>} Initiated calls
 */
const initiateFirstBatch = async (campaignId, maxConcurrent) => {
  try {
    // Find queue entries that are ready to be called
    const queueEntries = await db.CallQueue.findAll({
      where: {
        campaignId,
        status: 'scheduled',
        scheduledTime: {
          [db.Sequelize.Op.lte]: new Date() // Only get entries scheduled now or in the past
        }
      },
      order: [
        ['priority', 'DESC'], // Higher priority first
        ['scheduledTime', 'ASC'] // Earlier scheduled time first
      ],
      limit: maxConcurrent
    });
    
    if (queueEntries.length === 0) {
      logger.info(`No calls to initiate for campaign ${campaignId}`);
      return [];
    }
    
    // Get campaign details for webhook
    const campaign = await Campaign.findByPk(campaignId);
    const webhookUrl = campaign.webhookUrl || `${config.publicUrl}/api/calls/webhook`;
    
    // Initiate calls
    const initiatedCalls = [];
    
    for (const entry of queueEntries) {
      try {
        // Update entry status
        await entry.update({ status: 'in-progress', startTime: new Date() });
        
        // Initiate call
        const callResult = await signalWireService.makeOutboundCall(
          entry.phoneNumber,
          entry.callerId,
          webhookUrl,
          {
            campaignId,
            contactId: entry.contactId,
            queueId: entry.id,
            useAmd: entry.useAmd
          },
          entry.phoneNumberId
        );
        
        // Update queue entry with call SID
        await entry.update({ callSid: callResult.id });
        
        // Create call log entry
        await CallLog.create({
          callSid: callResult.id,
          campaignId,
          contactId: entry.contactId,
          phoneNumber: entry.phoneNumber,
          direction: 'outbound',
          status: 'initiated',
          startTime: new Date(),
          metadata: entry.metadata
        });
        
        initiatedCalls.push({
          queueId: entry.id,
          callSid: callResult.id,
          phoneNumber: entry.phoneNumber
        });
        
        logger.info(`Initiated call to ${entry.phoneNumber} for campaign ${campaignId}, call SID: ${callResult.id}`);
      } catch (error) {
        logger.error(`Error initiating call for queue entry ${entry.id}: ${error.message}`);
        
        // Mark as failed and eligible for retry
        await handleCallFailure(entry, 'failed', `Failed to initiate: ${error.message}`);
      }
    }
    
    return initiatedCalls;
  } catch (error) {
    logger.error(`Error initiating first batch of calls: ${error.message}`);
    throw error;
  }
};

/**
 * Process the call queue to initiate new calls and handle retries
 * @param {string} [campaignId] - Optional campaign ID to process
 * @returns {Object} Processing results
 */
const processCallQueue = async (campaignId = null) => {
  try {
    // Get active campaigns with queued calls
    let campaigns;
    
    if (campaignId) {
      // Process specific campaign
      campaigns = [await Campaign.findByPk(campaignId)];
      if (!campaigns[0]) {
        throw new Error(`Campaign ${campaignId} not found`);
      }
    } else {
      // Get all active campaigns
      campaigns = await Campaign.findAll({
        where: {
          status: 'active'
        }
      });
    }
    
    const results = {
      processed: 0,
      initiated: 0,
      retries: 0,
      failed: 0
    };
    
    // Process each campaign
    for (const campaign of campaigns) {
      // Get current in-progress calls for the campaign
      const activeCalls = await db.CallQueue.count({
        where: {
          campaignId: campaign.id,
          status: 'in-progress'
        }
      });
      
      // Calculate how many new calls can be initiated
      const maxConcurrent = campaign.maxConcurrentCalls || 5;
      const availableSlots = Math.max(0, maxConcurrent - activeCalls);
      
      if (availableSlots === 0) {
        logger.info(`Campaign ${campaign.id} has reached maximum concurrent calls (${maxConcurrent})`);
        continue;
      }
      
      // Find queue entries ready for calling or retrying
      const now = new Date();
      const queueEntries = await db.CallQueue.findAll({
        where: {
          campaignId: campaign.id,
          status: ['scheduled', 'retry'],
          scheduledTime: {
            [db.Sequelize.Op.lte]: now
          },
          attempts: {
            [db.Sequelize.Op.lt]: db.Sequelize.col('maxAttempts')
          }
        },
        order: [
          ['priority', 'DESC'], // Higher priority first
          ['scheduledTime', 'ASC'] // Earlier scheduled time first
        ],
        limit: availableSlots
      });
      
      results.processed += queueEntries.length;
      
      // Initiate calls for each queue entry
      for (const entry of queueEntries) {
        try {
          // Update entry status and increment attempt counter
          await entry.update({ 
            status: 'in-progress', 
            startTime: now,
            attempts: entry.attempts + 1
          });
          
          // Get campaign webhook
          const webhookUrl = campaign.webhookUrl || `${config.publicUrl}/api/calls/webhook`;
          
          // Initiate call
          const callResult = await signalWireService.makeOutboundCall(
            entry.phoneNumber,
            entry.callerId,
            webhookUrl,
            {
              campaignId: campaign.id,
              contactId: entry.contactId,
              queueId: entry.id,
              useAmd: entry.useAmd,
              attempt: entry.attempts
            },
            entry.phoneNumberId
          );
          
          // Update queue entry with call SID
          await entry.update({ callSid: callResult.id });
          
          // Create or update call log
          await CallLog.create({
            callSid: callResult.id,
            campaignId: campaign.id,
            contactId: entry.contactId,
            phoneNumber: entry.phoneNumber,
            direction: 'outbound',
            status: 'initiated',
            startTime: now,
            metadata: {
              ...entry.metadata,
              attempt: entry.attempts
            }
          });
          
          // Count as retry or new initiation
          if (entry.attempts > 1) {
            results.retries++;
          } else {
            results.initiated++;
          }
          
          logger.info(`Initiated call to ${entry.phoneNumber} for campaign ${campaign.id}, attempt ${entry.attempts}, call SID: ${callResult.id}`);
        } catch (error) {
          logger.error(`Error initiating call for queue entry ${entry.id}: ${error.message}`);
          
          // Mark as failed and eligible for retry
          await handleCallFailure(entry, 'failed', `Failed to initiate: ${error.message}`);
          results.failed++;
        }
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Error processing call queue: ${error.message}`);
    throw error;
  }
};

/**
 * Handle completed call and update status
 * @param {string} callSid - Call SID
 * @param {string} status - Call status
 * @param {Object} callDetails - Additional call details
 * @returns {Object} Updated call status
 */
const handleCallCompletion = async (callSid, status, callDetails = {}) => {
  try {
    // Find the queue entry for this call
    const queueEntry = await db.CallQueue.findOne({
      where: { callSid }
    });
    
    if (!queueEntry) {
      logger.warn(`No queue entry found for call ${callSid}`);
      return { success: false, reason: 'No queue entry found' };
    }
    
    // Update call log
    await CallLog.update({
      status,
      endTime: new Date(),
      duration: callDetails.duration || 0,
      recordingUrl: callDetails.recordingUrl,
      transcription: callDetails.transcription,
      machineDetection: callDetails.machineDetection,
      metadata: {
        ...(await CallLog.findOne({ where: { callSid } }))?.metadata || {},
        ...callDetails
      }
    }, {
      where: { callSid }
    });
    
    // Determine if we need to retry
    const needsRetry = shouldRetryCall(status, queueEntry);
    
    if (needsRetry) {
      return await scheduleRetry(queueEntry, status, callDetails);
    } else {
      // Mark as completed
      await queueEntry.update({ 
        status: status === 'completed' ? 'completed' : 'failed',
        endTime: new Date(),
        result: status,
        resultDetails: callDetails
      });
      
      return { 
        success: true, 
        status, 
        queueId: queueEntry.id,
        retry: false,
        campaignId: queueEntry.campaignId,
        contactId: queueEntry.contactId
      };
    }
  } catch (error) {
    logger.error(`Error handling call completion for ${callSid}: ${error.message}`);
    throw error;
  }
};

/**
 * Handle call failure and determine if retry is needed
 * @param {Object} queueEntry - Call queue entry
 * @param {string} status - Failure status
 * @param {string} reason - Failure reason
 * @returns {Object} Result with retry information
 */
const handleCallFailure = async (queueEntry, status, reason) => {
  try {
    // Update call log if exists
    if (queueEntry.callSid) {
      await CallLog.update({
        status,
        endTime: new Date(),
        failureReason: reason
      }, {
        where: { callSid: queueEntry.callSid }
      });
    }
    
    // Check if we should retry
    if (queueEntry.attempts >= queueEntry.maxAttempts) {
      // No more retries - mark as failed
      await queueEntry.update({
        status: 'failed',
        endTime: new Date(),
        result: status,
        resultDetails: { reason }
      });
      
      return { 
        success: false, 
        status, 
        reason,
        retry: false,
        message: 'Maximum retry attempts reached' 
      };
    } else {
      // Schedule retry
      return await scheduleRetry(queueEntry, status, { reason });
    }
  } catch (error) {
    logger.error(`Error handling call failure for queue ${queueEntry.id}: ${error.message}`);
    throw error;
  }
};

/**
 * Determine if a call should be retried based on its status
 * @param {string} status - Call status
 * @param {Object} queueEntry - Queue entry
 * @returns {boolean} True if the call should be retried
 */
const shouldRetryCall = (status, queueEntry) => {
  // Don't retry if max attempts reached
  if (queueEntry.attempts >= queueEntry.maxAttempts) {
    return false;
  }
  
  // Statuses that are eligible for retry
  const retryStatuses = ['busy', 'no-answer', 'failed', 'machine'];
  
  // Don't retry successful calls or answering machine if not configured
  if (status === 'completed') {
    return false;
  }
  
  // Don't retry machine detection unless configured
  if (status === 'machine' && !queueEntry.retryOnMachine) {
    return false;
  }
  
  return retryStatuses.includes(status);
};

/**
 * Schedule a retry for a failed call
 * @param {Object} queueEntry - Queue entry
 * @param {string} status - Status of the failed call
 * @param {Object} details - Details about the failure
 * @returns {Object} Retry information
 */
const scheduleRetry = async (queueEntry, status, details = {}) => {
  try {
    // Get campaign retry settings
    const campaign = await Campaign.findByPk(queueEntry.campaignId);
    
    // Calculate retry delay - exponential backoff with campaign settings
    const retryDelayMinutes = campaign.retryDelayMinutes || 60;
    const exponentialFactor = campaign.retryExponentialFactor || 1.5;
    const baseDelay = retryDelayMinutes * 60 * 1000; // Convert to ms
    const attemptFactor = Math.pow(exponentialFactor, queueEntry.attempts);
    const retryDelay = baseDelay * attemptFactor;
    
    // Calculate next attempt time
    const now = new Date();
    const retryTime = new Date(now.getTime() + retryDelay);
    
    // Update queue entry
    await queueEntry.update({
      status: 'retry',
      scheduledTime: retryTime,
      lastAttemptStatus: status,
      lastAttemptTime: now,
      lastAttemptDetails: details
    });
    
    logger.info(`Scheduled retry #${queueEntry.attempts + 1} for ${queueEntry.phoneNumber} at ${retryTime}, campaign ${queueEntry.campaignId}`);
    
    return {
      success: true,
      status: 'retry-scheduled',
      queueId: queueEntry.id,
      retry: true,
      nextAttempt: queueEntry.attempts + 1,
      retryTime,
      delay: retryDelay / 60000 // Return delay in minutes
    };
  } catch (error) {
    logger.error(`Error scheduling retry for queue ${queueEntry.id}: ${error.message}`);
    throw error;
  }
};

/**
 * Cancel a scheduled call or batch of calls
 * @param {Object} filter - Filter criteria
 * @param {string} filter.campaignId - Cancel by campaign ID
 * @param {Array<string>} filter.contactIds - Cancel by contact IDs
 * @param {Array<string>} filter.queueIds - Cancel specific queue entries
 * @returns {Object} Cancellation results
 */
const cancelScheduledCalls = async (filter) => {
  try {
    // Build where clause based on filter
    const whereClause = {};
    
    if (filter.campaignId) {
      whereClause.campaignId = filter.campaignId;
    }
    
    if (filter.contactIds && filter.contactIds.length > 0) {
      whereClause.contactId = filter.contactIds;
    }
    
    if (filter.queueIds && filter.queueIds.length > 0) {
      whereClause.id = filter.queueIds;
    }
    
    // Only cancel calls that are scheduled or pending retry
    whereClause.status = ['scheduled', 'retry'];
    
    // Cancel the calls
    const cancelCount = await db.CallQueue.update({
      status: 'cancelled',
      result: 'cancelled',
      resultDetails: { reason: 'Cancelled by user' }
    }, {
      where: whereClause
    });
    
    logger.info(`Cancelled ${cancelCount[0]} scheduled calls with filter: ${JSON.stringify(filter)}`);
    
    return {
      success: true,
      cancelledCalls: cancelCount[0],
      filter
    };
  } catch (error) {
    logger.error(`Error cancelling scheduled calls: ${error.message}`);
    throw error;
  }
};

/**
 * Get call queue status for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Queue status
 */
const getCallQueueStatus = async (campaignId) => {
  try {
    // Get counts by status
    const counts = await db.CallQueue.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: { campaignId },
      group: ['status']
    });
    
    // Format into an object
    const statusCounts = counts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.getDataValue('count'), 10);
      return acc;
    }, {
      scheduled: 0,
      'in-progress': 0,
      completed: 0,
      failed: 0,
      retry: 0,
      cancelled: 0
    });
    
    // Calculate total
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    // Get next scheduled call time
    const nextScheduled = await db.CallQueue.findOne({
      where: {
        campaignId,
        status: ['scheduled', 'retry']
      },
      order: [['scheduledTime', 'ASC']]
    });
    
    return {
      campaignId,
      total,
      counts: statusCounts,
      nextScheduledCall: nextScheduled ? nextScheduled.scheduledTime : null,
      asOf: new Date()
    };
  } catch (error) {
    logger.error(`Error getting call queue status for campaign ${campaignId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  scheduleBatchCalls,
  processCallQueue,
  handleCallCompletion,
  handleCallFailure,
  cancelScheduledCalls,
  getCallQueueStatus
};
