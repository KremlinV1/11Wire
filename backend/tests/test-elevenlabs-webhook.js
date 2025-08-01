/**
 * Test script for ElevenLabs webhook functionality
 * Sends a test audio file to ElevenLabs STT API with webhook callback
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Import database models for creating mappings
const { SttRequestMapping } = require('../src/models');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.ELEVENLABS_WEBHOOK_URL;
const TEST_AUDIO_PATH = path.join(__dirname, 'fixtures', 'test-audio-8khz.wav');

if (!API_KEY) {
  console.error('❌ Error: ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ Error: ELEVENLABS_WEBHOOK_URL not found in environment variables');
  process.exit(1);
}

if (!fs.existsSync(TEST_AUDIO_PATH)) {
  console.error(`❌ Error: Test audio file not found at ${TEST_AUDIO_PATH}`);
  process.exit(1);
}

console.log('🔍 Starting ElevenLabs webhook test...');
console.log(`📝 Using webhook URL: ${WEBHOOK_URL}`);

async function testWebhook() {
  try {
    // Generate a test call ID for tracking
    const TEST_CALL_ID = `test-call-${Date.now()}`;
    console.log(`🆔 Generated test call ID: ${TEST_CALL_ID}`);
    
    // Read the test audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
    console.log(`📊 Loaded test audio: ${audioBuffer.length} bytes`);

    // Prepare form data for the API request
    const formData = new FormData();
    
    // Add the audio file
    formData.append('file', audioBuffer, {
      filename: 'test-audio.wav',
      contentType: 'audio/wav'
    });
    
    // Add other required parameters
    formData.append('model_id', 'scribe_v1'); // Use the required model ID
    formData.append('webhook', 'true'); // Enable webhook callback
    formData.append('callback', WEBHOOK_URL); // Set the webhook URL
    formData.append('webhook_id', '95adc806c68f4f96b05e6edc5ec107dc'); // Specific webhook ID provided by user
    
    // Add metadata for tracking in the webhook
    const metadata = {
      test_id: `test_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    formData.append('callback_metadata', JSON.stringify(metadata));

    console.log('📤 Submitting test audio to ElevenLabs STT API...');
    console.log(`🔗 API endpoint: https://api.elevenlabs.io/v1/speech-to-text`);
    console.log(`📝 Metadata: ${JSON.stringify(metadata)}`);
    
    // Make the API request
    const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
      headers: {
        'xi-api-key': API_KEY,
        ...formData.getHeaders()
      }
    });
    
    // Now that we have the request_id, create the mapping in our database
    const requestId = response.data.request_id;
    console.log(`🔗 Creating database mapping: ${requestId} -> ${TEST_CALL_ID}`);
    
    try {
      // Create the mapping record
      await SttRequestMapping.create({
        request_id: requestId,
        call_id: TEST_CALL_ID,
        metadata: metadata,
        status: 'pending',
        submitted_at: new Date()
      });
      console.log(`✅ Database mapping created successfully`);
    } catch (dbError) {
      console.error(`❌ Failed to create database mapping: ${dbError.message}`);
      // Continue even if mapping fails - the test will show the issue in logs
    }

    console.log('✅ API request successful!');
    console.log(`📊 Response: ${JSON.stringify(response.data)}`);
    console.log(`🆔 Request ID: ${response.data.request_id}`);
    console.log('');
    console.log('🔔 Now waiting for webhook callback...');
    console.log('');
    console.log('👉 Check the ngrok interface at http://localhost:4040 to see if any webhooks arrive');
    console.log('👉 Check your backend logs for incoming webhook requests');
    console.log(`👉 When webhook arrives, it should find call ID: ${TEST_CALL_ID} for request ID: ${requestId}`);
    
    // Wait a moment for webhook to potentially arrive
    console.log('⏳ Waiting 10 seconds for potential webhook arrival...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if the mapping was updated by the webhook handler
    try {
      const updatedMapping = await SttRequestMapping.findByPk(requestId);
      if (updatedMapping && updatedMapping.status === 'completed' && updatedMapping.result_received_at) {
        console.log(`✅ Webhook received and processed successfully!`);
        console.log(`📝 Mapping status updated to: ${updatedMapping.status}`);
        console.log(`⏰ Result received at: ${updatedMapping.result_received_at}`);
      } else if (updatedMapping) {
        console.log(`⚠️ Mapping found but not updated: Status=${updatedMapping.status}`);
      } else {
        console.log(`❓ Could not find mapping for request ID: ${requestId}`);
      }
    } catch (checkError) {
      console.error(`❌ Error checking mapping status: ${checkError.message}`);
    }
    
    // No need to wait or check for webhook here - we'll monitor the backend logs separately
    
  } catch (error) {
    console.error('❌ Error submitting STT request:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testWebhook();
