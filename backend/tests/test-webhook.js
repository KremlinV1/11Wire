/**
 * ElevenLabs Webhook Test Script
 * 
 * This script sends a simulated webhook POST request to the ElevenLabs webhook endpoint
 * to verify the endpoint is accessible and functioning correctly.
 */

// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const config = require('../src/config');
const crypto = require('crypto');
const path = require('path');

// Get webhook URL from config
const webhookUrl = process.env.ELEVENLABS_WEBHOOK_URL || config.elevenLabs.webhook.url;

console.log('Webhook URL from env:', process.env.ELEVENLABS_WEBHOOK_URL);
console.log('Webhook URL from config:', config.elevenLabs.webhook.url);
console.log('Using webhook URL:', webhookUrl);
const webhookSecret = config.elevenLabs.webhook.signingSecret || 'test-secret';

// Create a simulated STT result payload
const payload = {
  type: 'speech_to_text',
  request_id: `test_req_${Date.now()}`,
  text: 'This is a test transcription from the webhook test script.',
  language: 'en',
  metadata: {
    audio_duration_sec: 3.5,
    model_id: 'scribe_v1'
  },
  callback_metadata: {
    call_id: `TEST_CALL_${Date.now()}`
  }
};

// Function to sign the payload with HMAC (if ElevenLabs uses this)
const signPayload = (payload, secret) => {
  const stringified = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(stringified)
    .digest('hex');
};

// Send test webhook request
async function sendTestWebhook() {
  try {
    console.log('📤 Sending test webhook to:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const signature = signPayload(payload, webhookSecret);
    
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Signature': signature,
        'X-ElevenLabs-Event': 'speech_to_text',
        'User-Agent': 'ElevenLabs-Webhook/1.0'
      }
    });
    
    console.log('✅ Webhook sent successfully!');
    console.log('📊 Response status:', response.status);
    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Error sending test webhook:');
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    } else {
      console.error('📄 Error message:', error.message);
    }
    return false;
  }
}

// Execute test
(async () => {
  console.log('🧪 ElevenLabs Webhook Test');
  console.log('============================');
  
  const result = await sendTestWebhook();
  
  console.log('============================');
  console.log(result ? '✅ Test completed successfully' : '❌ Test failed');
})();
