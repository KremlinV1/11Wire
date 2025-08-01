/**
 * ElevenLabs STT Simple Debug Test
 * 
 * This script makes a minimal STT request to ElevenLabs to help diagnose API issues
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../src/config');

const API_BASE_URL = 'https://api.elevenlabs.io/v1';
const TEST_AUDIO_FILE = path.join(__dirname, 'fixtures', 'test-audio-8khz.wav');
const apiKey = config.elevenLabs.apiKey;

async function runSimpleTest() {
  console.log('\n🔍 ElevenLabs STT Debug Test');
  console.log(`API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
  console.log(`Webhook URL: ${config.elevenLabs.webhook?.url || 'Not configured'}`);
  
  try {
    // Read test audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    console.log(`📂 Read test audio file: ${TEST_AUDIO_FILE} (${audioBuffer.length} bytes)`);
    
    // Create simple FormData with minimal required fields
    const formData = new FormData();
    
    // Add audio file as binary data with field name 'file' as required by the API
    formData.append('file', audioBuffer, {
      filename: 'test-audio.wav',
      contentType: 'audio/wav'
    });
    
    // Add required fields with valid model ID as per API docs
    formData.append('model_id', 'scribe_v1');
    
    // If webhook URL is configured, use it for async processing
    if (config.elevenLabs.webhook?.url) {
      formData.append('webhook_url', config.elevenLabs.webhook.url);
      console.log('Using async webhook mode');
    }
    
    console.log(`\n🚀 Sending request to ${API_BASE_URL}/speech-to-text`);
    
    // Log the form data fields
    console.log('Form data fields:');
    for (const [key, value] of Object.entries(formData.getBuffer ? formData.getBuffer() : {})) {
      console.log(`- ${key}: ${value.toString().substring(0, 30)}...`);
    }
    
    // Make the request
    const response = await axios.post(`${API_BASE_URL}/speech-to-text`, formData, {
      headers: {
        'xi-api-key': apiKey,
        ...formData.getHeaders()
      }
    });
    
    console.log(`\n✅ Request successful - Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Headers:`, error.response.headers);
      console.error(`Data:`, error.response.data);
    }
  }
}

runSimpleTest();
