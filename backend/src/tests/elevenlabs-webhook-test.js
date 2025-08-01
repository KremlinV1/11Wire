/**
 * Test script for ElevenLabs webhook integration
 * This script simulates webhook events from ElevenLabs Conversational AI
 */

// Load test environment first, before any other imports
require('dotenv').config({ path: './.env.test' });

// Set NODE_ENV explicitly for testing
process.env.NODE_ENV = 'test';

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Generate ElevenLabs webhook signature
 * @param {Object} payload - Webhook payload
 * @returns {string} HMAC SHA-256 signature
 */
const generateSignature = (payload) => {
  const webhookSecret = config.elevenLabs.webhook.signingSecret;
  if (!webhookSecret) {
    logger.warn('No webhook secret configured, skipping signature generation');
    return '';
  }
  
  const rawBody = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
};

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change this to your API port if different
const WEBHOOK_ENDPOINT = '/api/webhooks/elevenlabs';

/**
 * Send a simulated post_call_transcription webhook
 */
const testTranscriptionWebhook = async () => {
  const payload = {
    type: 'post_call_transcription',
    call_id: 'test-call-' + Date.now(),
    agent_id: 'test-agent-id',
    conversation: {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: "Hello, I'd like to know more about your services."
        },
        {
          role: 'assistant',
          content: "I'd be happy to tell you about our services. We offer..."
        }
      ]
    },
    metadata: {
      campaign_id: 'test-campaign',
      duration_seconds: 120,
      call_success: true
    }
  };

  try {
    logger.info('Sending test transcription webhook payload...');
    const signature = generateSignature(payload);
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add signature header if available
    if (signature) {
      headers['x-elevenlabs-signature'] = signature;
    }
    
    const response = await axios.post(
      `${API_BASE_URL}${WEBHOOK_ENDPOINT}`, 
      payload,
      { headers }
    );
    logger.info(`Webhook test response: ${response.status} ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(`Webhook test failed: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

/**
 * Send a simulated post_call_audio webhook
 */
const testAudioWebhook = async () => {
  // Simplified payload with mock base64 audio
  const payload = {
    type: 'post_call_audio',
    call_id: 'test-call-' + Date.now(),
    audio: 'c2ltdWxhdGVkIGJhc2U2NCBhdWRpbyBkYXRh', // "simulated base64 audio data" in base64
    metadata: {
      campaign_id: 'test-campaign',
      duration_seconds: 45
    }
  };

  try {
    logger.info('Sending test audio webhook payload...');
    const signature = generateSignature(payload);
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add signature header if available
    if (signature) {
      headers['x-elevenlabs-signature'] = signature;
    }
    
    const response = await axios.post(
      `${API_BASE_URL}${WEBHOOK_ENDPOINT}`, 
      payload,
      { headers }
    );
    logger.info(`Audio webhook test response: ${response.status} ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(`Audio webhook test failed: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

/**
 * Run all webhook tests
 */
const runAllTests = async () => {
  try {
    logger.info('Starting ElevenLabs webhook integration tests...');
    
    // Test transcription webhook
    await testTranscriptionWebhook();
    
    // Test audio webhook
    await testAudioWebhook();
    
    logger.info('All webhook tests completed!');
  } catch (error) {
    logger.error(`Error running webhook tests: ${error.message}`);
    process.exit(1);
  }
};

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testTranscriptionWebhook,
  testAudioWebhook,
  runAllTests
};
