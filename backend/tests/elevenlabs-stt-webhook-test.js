/**
 * Test script for ElevenLabs STT webhook processing
 * Tests the persistent request_id to call_id mapping
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../src/config');

// Configuration
const TEST_CALL_ID = `test-call-${Date.now()}`;
const TEST_REQUEST_ID = `test-req-${Date.now()}`;
const WEBHOOK_URL = process.env.ELEVENLABS_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/elevenlabs';
const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET || config.elevenLabs.webhook.signingSecret;

console.log('======================================================');
console.log('ElevenLabs STT Webhook Test');
console.log('======================================================');
console.log(`Test Call ID: ${TEST_CALL_ID}`);
console.log(`Test Request ID: ${TEST_REQUEST_ID}`);
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 3)}...${WEBHOOK_SECRET.substring(WEBHOOK_SECRET.length - 3)}`);
console.log('======================================================');

// Step 1: Create a request_id to call_id mapping using the ElevenLabs service directly
async function createMapping() {
  try {
    console.log('\n[1/3] Creating request_id to call_id mapping in database...');
    
    // Connect to database and create mapping
    const { SttRequestMapping } = require('../src/models');
    
    // Create mapping record
    const mapping = await SttRequestMapping.create({
      request_id: TEST_REQUEST_ID,
      call_id: TEST_CALL_ID,
      metadata: { test: true },
      status: 'pending',
      submitted_at: new Date()
    });
    
    console.log(`✅ Mapping created: ${TEST_REQUEST_ID} -> ${TEST_CALL_ID}`);
    return mapping;
  } catch (error) {
    console.error(`❌ Error creating mapping: ${error.message}`);
    throw error;
  }
}

// Step 2: Simulate a webhook callback from ElevenLabs
async function simulateWebhook() {
  try {
    console.log('\n[2/3] Simulating webhook callback from ElevenLabs...');
    
    // Create webhook payload
    const webhookPayload = {
      type: 'speech_to_text_transcription',
      data: {
        request_id: TEST_REQUEST_ID,
        transcription: {
          text: 'This is a test transcription from the webhook test script.',
          language_code: 'en-US',
          confidence: 0.95
        },
        callback_metadata: {
          call_id: TEST_CALL_ID,
          request_time: new Date().toISOString()
        }
      }
    };
    
    // Create signature using HMAC with webhook secret
    const payload = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    // Send webhook request with signed payload
    console.log(`Sending webhook to ${WEBHOOK_URL}`);
    console.log(`Payload: ${JSON.stringify(webhookPayload, null, 2).substring(0, 100)}...`);
    
    const response = await axios.post(WEBHOOK_URL, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Elevenlabs-Signature': signature
      }
    });
    
    console.log(`✅ Webhook sent successfully. Response: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error sending webhook: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Step 3: Verify mapping was used
async function verifyMapping() {
  try {
    console.log('\n[3/3] Verifying mapping was updated in database...');
    
    // Connect to database and check mapping status
    const { SttRequestMapping } = require('../src/models');
    
    // Get mapping record
    const mapping = await SttRequestMapping.findByPk(TEST_REQUEST_ID);
    
    if (!mapping) {
      console.error('❌ Mapping not found in database!');
      return false;
    }
    
    console.log(`Mapping found: ${mapping.request_id} -> ${mapping.call_id}`);
    console.log(`Status: ${mapping.status}`);
    console.log(`Submitted at: ${mapping.submitted_at}`);
    console.log(`Result received at: ${mapping.result_received_at || 'not received yet'}`);
    
    // Check if status was updated
    if (mapping.status === 'completed' && mapping.result_received_at) {
      console.log('✅ Mapping was successfully updated by webhook handler');
      return true;
    } else {
      console.log('⚠️ Mapping was not updated by webhook handler');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying mapping: ${error.message}`);
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    await createMapping();
    await simulateWebhook();
    
    // Give the server a moment to process the webhook
    console.log('Waiting for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await verifyMapping();
    
    console.log('\n======================================================');
    if (result) {
      console.log('✅ TEST PASSED: Webhook mapping system is working correctly!');
    } else {
      console.log('❌ TEST FAILED: Webhook mapping system did not update mapping');
    }
    console.log('======================================================');
    
  } catch (error) {
    console.error('\n======================================================');
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    console.error('======================================================');
    process.exit(1);
  }
}

// Execute the test
runTest();
