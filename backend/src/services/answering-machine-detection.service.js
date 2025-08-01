/**
 * Answering Machine Detection Service
 * 
 * Handles detection and response for calls answered by voicemail/answering machines
 */

const signalWireService = require('./signalwire.service');
const callLogService = require('./call-log.service');
const db = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Configure SignalWire AMD options
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether AMD is enabled
 * @param {number} options.timeout - Detection timeout in seconds
 * @param {boolean} options.playBeep - Whether to play a beep after detection
 * @param {Object} options.actions - Actions for different outcomes
 * @returns {Object} AMD configuration
 */
const configureAmdOptions = (options = {}) => {
  // Default options
  const defaultOptions = {
    enabled: true,
    timeout: 30,
    playBeep: false,
    actions: {
      human: 'continue', // continue, transfer, message
      machine: 'message', // continue, hangup, message
      unknown: 'continue' // continue, hangup, transfer
    },
    messages: {
      machine: 'This is an automated call. Please call us back at your convenience.',
      human: null // No specific message for human detection by default
    }
  };

  // Merge with provided options
  return { ...defaultOptions, ...options };
};

/**
 * Generate TwiML for AMD
 * @param {Object} options - AMD options
 * @param {string} callbackUrl - URL for AMD results callback
 * @returns {string} TwiML with AMD
 */
const generateAmdTwiML = (options, callbackUrl) => {
  try {
    // Default options
    const amdOptions = configureAmdOptions(options);
    
    // Basic TwiML structure
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    // Add AMD detection
    twiml += `<DetectAnsweringMachine${amdOptions.timeout ? ` timeout="${amdOptions.timeout}"` : ''}${amdOptions.playBeep ? ' playBeep="true"' : ''} actionOnHuman="${callbackUrl}?result=human" actionOnMachine="${callbackUrl}?result=machine" actionOnDetectionFailure="${callbackUrl}?result=unknown"></DetectAnsweringMachine>`;
    
    // Close response
    twiml += '</Response>';
    
    return twiml;
  } catch (error) {
    logger.error(`Error generating AMD TwiML: ${error.message}`);
    throw error;
  }
};

/**
 * Handle AMD results from SignalWire webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string} TwiML response based on detection result
 */
const handleAmdResult = async (req, res) => {
  try {
    const { CallSid } = req.body;
    const result = req.query.result || 'unknown';
    
    logger.info(`AMD result for call ${CallSid}: ${result}`);
    
    // Look up the call in our database
    const callRecord = await db.CallLog.findOne({
      where: { callSid: CallSid }
    });
    
    if (!callRecord) {
      logger.warn(`Call not found for AMD result: ${CallSid}`);
      // Return basic TwiML to continue the call
      return signalWireService.generateTwiML({
        say: 'Thank you for answering. Please wait while we connect you.'
      });
    }
    
    // Update call record with detection result
    await callRecord.update({
      machineDetection: result,
      metadata: {
        ...callRecord.metadata,
        amdResult: result,
        amdTimestamp: new Date().toISOString()
      }
    });
    
    // Find the associated campaign for AMD settings
    const campaign = await db.Campaign.findByPk(callRecord.campaignId);
    
    // Get AMD options from campaign if available, or use defaults
    const amdOptions = configureAmdOptions(campaign?.amdOptions || {});
    
    // Determine action based on detection result
    let action;
    let message;
    
    switch (result) {
      case 'human':
        action = amdOptions.actions.human;
        message = amdOptions.messages.human;
        break;
      case 'machine':
        action = amdOptions.actions.machine;
        message = amdOptions.messages.machine;
        break;
      default:
        action = amdOptions.actions.unknown;
        message = null;
        break;
    }
    
    // Build response based on determined action
    let xmlResponse;
    
    switch (action) {
      case 'hangup':
        xmlResponse = signalWireService.generateTwiML({
          hangup: true
        });
        break;
      
      case 'message':
        if (message) {
          xmlResponse = signalWireService.generateTwiML({
            say: message,
            hangup: true
          });
        } else {
          // No message configured, just continue
          xmlResponse = signalWireService.generateTwiML({
            say: 'Thank you for answering. Please wait while we connect you.'
          });
        }
        break;
      
      case 'transfer':
        // Get the appropriate transfer destination
        const transferTo = campaign?.transferNumber || config.defaultTransferNumber;
        
        if (transferTo) {
          xmlResponse = signalWireService.generateTransferTwiML(transferTo, {
            callerId: campaign?.callerId || config.defaultCallerId,
            timeout: 30
          });
        } else {
          // No transfer destination, continue with call
          xmlResponse = signalWireService.generateTwiML({
            say: 'Thank you for answering. Please wait while we connect you.'
          });
        }
        break;
      
      case 'continue':
      default:
        // Just continue with the call flow
        xmlResponse = signalWireService.generateTwiML({
          say: 'Thank you for answering. Please wait while we connect you.'
        });
        break;
    }
    
    // Record action taken
    await callRecord.update({
      metadata: {
        ...callRecord.metadata,
        amdAction: action,
        amdMessage: message
      }
    });
    
    // Trigger webhooks or other integrations if configured
    if (campaign?.amdWebhook) {
      // Non-blocking webhook call
      triggerAmdWebhook(campaign.amdWebhook, {
        callSid: CallSid,
        campaignId: callRecord.campaignId,
        contactId: callRecord.contactId,
        result,
        action,
        timestamp: new Date().toISOString()
      }).catch(error => {
        logger.error(`Error triggering AMD webhook: ${error.message}`);
      });
    }
    
    return xmlResponse;
  } catch (error) {
    logger.error(`Error handling AMD result: ${error.message}`);
    
    // Return a basic response to continue the call
    return signalWireService.generateTwiML({
      say: 'Thank you for answering. Please wait while we connect you.'
    });
  }
};

/**
 * Trigger webhook with AMD results
 * @param {string} webhookUrl - URL to send webhook to
 * @param {Object} data - Data to include in webhook
 * @returns {Promise} Webhook result
 */
const triggerAmdWebhook = async (webhookUrl, data) => {
  try {
    const axios = require('axios');
    
    // Add signature for security
    const signature = generateWebhookSignature(data);
    
    // Send webhook
    await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-11Wire-Signature': signature
      }
    });
    
    logger.info(`AMD webhook sent to ${webhookUrl} for call ${data.callSid}`);
  } catch (error) {
    logger.error(`Error sending AMD webhook: ${error.message}`);
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
 * Get AMD statistics for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} AMD statistics
 */
const getAmdStatistics = async (campaignId) => {
  try {
    // Query for detection results
    const results = await db.CallLog.findAll({
      attributes: [
        'machineDetection',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        campaignId,
        machineDetection: {
          [db.Sequelize.Op.not]: null
        }
      },
      group: ['machineDetection']
    });
    
    // Format into an object
    const statistics = {
      total: 0,
      human: 0,
      machine: 0,
      unknown: 0
    };
    
    results.forEach(result => {
      const detection = result.machineDetection;
      const count = parseInt(result.getDataValue('count'), 10);
      
      statistics[detection] = count;
      statistics.total += count;
    });
    
    // Calculate percentages
    const percentages = {
      human: statistics.total ? Math.round((statistics.human / statistics.total) * 100) : 0,
      machine: statistics.total ? Math.round((statistics.machine / statistics.total) * 100) : 0,
      unknown: statistics.total ? Math.round((statistics.unknown / statistics.total) * 100) : 0
    };
    
    return {
      campaignId,
      counts: statistics,
      percentages,
      asOf: new Date()
    };
  } catch (error) {
    logger.error(`Error getting AMD statistics for campaign ${campaignId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  configureAmdOptions,
  generateAmdTwiML,
  handleAmdResult,
  getAmdStatistics
};
