/**
 * ElevenLabs Webhook Controller
 * Handles incoming webhooks from ElevenLabs Conversational AI agents
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { Campaign, Conversation, CallRecording } = require('../models');
const storageService = require('../services/storage.service');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

// Initialize metrics for monitoring
const metrics = {
  webhooks: {
    received: 0,
    processed: 0,
    errors: 0,
    types: {}
  },
  transcriptions: {
    stored: 0,
    avgMsgCount: 0,
    avgDuration: 0
  },
  recordings: {
    stored: 0,
    avgDuration: 0,
    avgSize: 0
  }
};

/**
 * Validate webhook request is from ElevenLabs
 * @param {Object} req - Express request object
 * @returns {boolean} Whether request is valid
 */
const validateWebhook = (req) => {
  try {
    // Check if we're in development mode by checking NODE_ENV
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NODE_ENV === 'test' || 
                         !process.env.NODE_ENV;
    
    // Log the current environment for debugging
    logger.debug(`Current NODE_ENV: ${process.env.NODE_ENV}, isDevelopment: ${isDevelopment}`);
    
    // In test/development mode, bypass validation
    if (isDevelopment) {
      // Still log validation details in development for debugging
      const clientIP = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.connection.socket?.remoteAddress || 
                     '0.0.0.0';
      
      logger.info(`Development mode: Webhook received from IP ${clientIP}`);
      
      // Check if signature is present when secret is configured
      const signature = req.headers['x-elevenlabs-signature'];
      if (config.elevenLabs.webhook.signingSecret && !signature) {
        logger.warn('Development mode: Webhook signature missing, but allowing request');
      }
      
      return true; // Allow all requests in test/development
    }
    
    // PRODUCTION VALIDATION
    // 1. Validate source IP address
    const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket?.remoteAddress || 
                   '0.0.0.0';
    
    // Check if client IP is in allowed list
    const isAllowedIP = config.elevenLabs.webhook.allowedIPs.some(allowedIP => {
      // Handle both exact matches and CIDR notation if needed
      return clientIP === allowedIP || clientIP.includes(allowedIP);
    });
    
    if (!isAllowedIP) {
      logger.warn(`Webhook request from unauthorized IP: ${clientIP}`);
      return false;
    }
    
    // 2. Verify webhook signature
    if (!config.elevenLabs.webhook.signingSecret) {
      logger.warn('Production mode: Webhook signature validation skipped: No signing secret configured');
      return false; // Reject in production if no secret configured
    }
    
    const crypto = require('crypto');
    const signature = req.headers['x-elevenlabs-signature'];
    
    if (!signature) {
      logger.warn('Production mode: Webhook signature missing');
      return false;
    }
    
    // Get raw request body for signature verification
    const rawBody = JSON.stringify(req.body);
    
    // Compute signature using HMAC SHA-256
    const expectedSignature = crypto
      .createHmac('sha256', config.elevenLabs.webhook.signingSecret)
      .update(rawBody)
      .digest('hex');
    
    // Timing-safe comparison of signatures
    try {
      const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(signature), 
        Buffer.from(expectedSignature)
      );
      
      if (!isValidSignature) {
        logger.warn('Production mode: Invalid webhook signature');
        return false;
      }
    } catch (signatureError) {
      logger.error(`Production mode: Signature comparison error: ${signatureError.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Webhook validation error: ${error.message}`);
    return false;
  }
};

/**
 * Process transcription webhook
 * @param {Object} data - Webhook payload
 * @returns {Promise<Object>} The stored conversation record
 */
const processTranscriptionWebhook = async (data) => {
  try {
    logger.info(`Processing ElevenLabs transcription webhook: ${JSON.stringify(data.metadata || {})}`);
    
    // Extract relevant data
    const {
      call_id,
      agent_id,
      conversation,
      metadata
    } = data;
    
    // Process conversation data
    if (!conversation || !conversation.messages) {
      throw new Error('No conversation data in webhook payload');
    }
    
    logger.info(`Call ${call_id} contained ${conversation.messages.length} messages`);
    
    // Extract campaign identifier if present in metadata
    const campaignId = metadata?.campaign_id;
    const duration = metadata?.duration_seconds || 0;
    const callSuccess = metadata?.call_success;
    
    // Generate simple conversation summary
    // In production, consider using AI to create a better summary
    const messagesText = conversation.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    const summary = `Conversation with ${conversation.messages.length} messages. ` +
      `Duration: ${duration}s. ` +
      (messagesText.length > 200 ? 
        `${messagesText.substring(0, 197)}...` : messagesText);
    
    // Store conversation in database
    const conversationRecord = await Conversation.create({
      call_id,
      agent_id,
      campaign_id: campaignId,
      messages: conversation.messages,
      summary,
      duration_seconds: duration,
      call_success: callSuccess,
      metadata
    });
    
    // Update metrics
    metrics.transcriptions.stored++;
    metrics.transcriptions.avgMsgCount = (
      (metrics.transcriptions.avgMsgCount * (metrics.transcriptions.stored - 1) + 
      conversation.messages.length) / metrics.transcriptions.stored
    );
    metrics.transcriptions.avgDuration = (
      (metrics.transcriptions.avgDuration * (metrics.transcriptions.stored - 1) + 
      (duration || 0)) / metrics.transcriptions.stored
    );
    
    // If campaign exists, update campaign stats
    if (campaignId) {
      const campaign = await Campaign.findOne({ where: { id: campaignId } });
      if (campaign) {
        // Update campaign with completed call stats
        logger.info(`Updating campaign ${campaignId} with conversation data`);
        
        // Update campaign stats (customize based on your campaign model)
        await campaign.update({
          completed_calls: (campaign.completed_calls || 0) + 1,
          total_duration: (campaign.total_duration || 0) + (duration || 0),
          last_call_at: new Date()
        });
      }
    }
    
    logger.info(`Stored conversation record for call ${call_id}`);
    return conversationRecord;
  } catch (error) {
    logger.error(`Error processing ElevenLabs transcription webhook: ${error.message}`);
    metrics.webhooks.errors++;
    throw error;
  }
};

/**
 * Process audio webhook
 * @param {Object} data - Webhook payload with audio data
 * @returns {Promise<Object>} The stored recording record
 */
/**
 * Process speech-to-text webhook
 * @param {Object} data - Webhook payload with transcription results
 * @returns {Promise<Object>} Result with processed data and call ID
 */
const processSpeechToTextWebhook = async (data) => {
  try {
    // Extract data from webhook payload
    const { 
      request_id,
      text,
      metadata,
      language,
      callback_metadata
    } = data;
    
    // Check for required fields
    if (!text) {
      throw new Error('No transcription text in webhook payload');
    }
    
    // Get call ID from mapping service or callback metadata
    const elevenLabsService = require('../services/elevenlabs.service');
    
    // Use async lookup from database
    const callId = await elevenLabsService.getCallIdForRequestId(request_id) || 
                 callback_metadata?.call_id || 
                 'unknown';
    
    logger.info(`Found call ID for request ID ${request_id}: ${callId}`);
    
    // Log the transcription result
    logger.info(`Received STT result for call ${callId}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    
    // Emit an event with the transcription result so other services can react
    const eventEmitter = require('../utils/event-emitter');
    eventEmitter.emit('stt-result', {
      call_id: callId,
      request_id,
      text,
      language,
      metadata,
      received_at: new Date().toISOString()
    });
    
    return {
      success: true,
      call_id: callId,
      request_id,
      text_length: text.length,
      language
    };
  } catch (error) {
    logger.error(`Error processing STT webhook: ${error.message}`);
    throw error;
  }
};

const processAudioWebhook = async (data) => {
  try {
    logger.info(`Processing ElevenLabs audio webhook for call: ${data.call_id}`);
    
    // Extract relevant data
    const {
      call_id,
      audio: audioData,
      metadata
    } = data;
    
    if (!audioData) {
      throw new Error('No audio data in webhook payload');
    }
    
    // Extract metadata
    const campaignId = metadata?.campaign_id;
    const duration = metadata?.duration_seconds || 0;
    
    // Generate a unique filename for the audio
    const fileName = `${call_id}-${Date.now()}.mp3`;
    
    // Store audio data using storage service
    const storageResult = await storageService.storeBase64Data(
      audioData,
      fileName,
      'audio/mpeg'
    );
    
    logger.info(`Stored audio file: ${storageResult.path} (${storageResult.sizeBytes} bytes)`);
    
    // Create database record for the audio recording
    const recordingRecord = await CallRecording.create({
      call_id,
      campaign_id: campaignId,
      storage_path: storageResult.path,
      storage_type: 'local', // or 's3', 'gcs', etc.
      mime_type: 'audio/mpeg',
      duration_seconds: duration,
      file_size_bytes: storageResult.sizeBytes,
      metadata
    });
    
    // Update metrics
    metrics.recordings.stored++;
    metrics.recordings.avgDuration = (
      (metrics.recordings.avgDuration * (metrics.recordings.stored - 1) + 
      (duration || 0)) / metrics.recordings.stored
    );
    metrics.recordings.avgSize = (
      (metrics.recordings.avgSize * (metrics.recordings.stored - 1) + 
      (storageResult.sizeBytes || 0)) / metrics.recordings.stored
    );
    
    // If campaign exists, update with recording info
    if (campaignId) {
      const campaign = await Campaign.findOne({ where: { id: campaignId } });
      if (campaign) {
        logger.info(`Updating campaign ${campaignId} with recording data`);
        
        // Update campaign with recording data if needed
        // You could track recordings count, total size, etc.
      }
    }
    
    logger.info(`Stored recording record for call ${call_id}`);
    return recordingRecord;
  } catch (error) {
    logger.error(`Error processing ElevenLabs audio webhook: ${error.message}`);
    metrics.webhooks.errors++;
    throw error;
  }
};

/**
 * Get metrics data for monitoring
 * @returns {Object} Current metrics
 */
const getMetrics = () => {
  return {
    ...metrics,
    timestamp: new Date().toISOString()
  };
};

/**
 * POST /api/webhooks/elevenlabs
 * Receives webhooks from ElevenLabs Conversational AI
 */
router.post('/', async (req, res) => {
  try {
    // Track webhook reception
    metrics.webhooks.received++;
    
    // Log raw webhook data for diagnostics
    logger.info(`================ WEBHOOK RECEIVED ==================`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`Body: ${JSON.stringify(req.body)}`);
    logger.info(`=================================================`);
    
    // Validate webhook
    if (!validateWebhook(req)) {
      logger.warn('Invalid ElevenLabs webhook request rejected');
      metrics.webhooks.errors++;
      return res.status(403).json({ error: 'Invalid webhook request' });
    }
    
    const webhookData = req.body;
    const webhookType = webhookData.type || webhookData.event_type || 'unknown';
    logger.info(`Received ElevenLabs webhook: ${webhookType}`);
    
    // Track webhook type
    if (!metrics.webhooks.types[webhookType]) {
      metrics.webhooks.types[webhookType] = 0;
    }
    metrics.webhooks.types[webhookType]++;
    
    // Process based on webhook type
    let result = null;
    
    switch (webhookType) {
      case 'post_call_transcription':
        result = await processTranscriptionWebhook(webhookData);
        break;
      case 'post_call_audio':
        result = await processAudioWebhook(webhookData);
        break;
      case 'speech_to_text':
      case 'transcription':
      case 'stt_result':
      case 'speech_to_text_transcription':
        logger.info(`Speech-to-text webhook received with data: ${JSON.stringify(webhookData)}`);
        // For speech_to_text_transcription, extract the actual data from the nested structure
        if (webhookType === 'speech_to_text_transcription' && webhookData.data) {
          // Extract metadata and text from the ElevenLabs speech_to_text_transcription payload
          const sttData = {
            ...webhookData.data,
            text: webhookData.data.transcription?.text,
            language: webhookData.data.transcription?.language_code,
            // Parse callback_metadata from string to JSON if needed
            callback_metadata: typeof webhookData.data.callback_metadata === 'string' 
              ? JSON.parse(webhookData.data.callback_metadata) 
              : webhookData.data.callback_metadata || {}
          };
          logger.info(`Processing STT webhook with metadata: ${JSON.stringify(sttData.callback_metadata)}`);
          result = await processSpeechToTextWebhook(sttData);
        } else {
          result = await processSpeechToTextWebhook(webhookData);
        }
        break;
      default:
        // Try to process anyway if we can detect it's an STT response
        if (webhookData.text || webhookData.transcription) {
          logger.info(`Detected STT result in unknown webhook type: ${webhookType}`);
          result = await processSpeechToTextWebhook(webhookData);
        } else {
          logger.warn(`Unknown webhook type: ${webhookType}`);
        }
    }
    
    // Track successful processing
    metrics.webhooks.processed++;
    
    // Acknowledge receipt
    return res.status(200).json({ 
      success: true,
      id: result?.id || null,
      call_id: webhookData.call_id || null,
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error handling ElevenLabs webhook: ${error.message}`);
    metrics.webhooks.errors++;
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/webhooks/elevenlabs/metrics
 * Get metrics about webhook processing
 */
router.get('/metrics', (req, res) => {
  res.json(getMetrics());
});

module.exports = router;
