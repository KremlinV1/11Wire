/**
 * Direct ElevenLabs Async STT Integration Test
 * 
 * This script directly tests the ElevenLabs service's ability to submit audio
 * for async speech-to-text processing and receive a response via webhook.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const elevenlabsService = require('../src/services/elevenlabs.service');
const eventEmitter = require('../src/utils/event-emitter');
const logger = require('../src/utils/logger');

// Test configuration
const TEST_AUDIO_FILE = path.join(__dirname, 'fixtures', 'test-audio-8khz.raw');
const TEST_REQUEST_ID = 'TEST_REQUEST_' + Date.now();

// Track test state
let testFinished = false;

// Test timeout - fail if test runs too long
const testTimeout = setTimeout(() => {
  if (!testFinished) {
    console.error('\n❌ Test timed out after 30 seconds');
    process.exit(1);
  }
}, 30000);

/**
 * Run the test
 */
async function runTest() {
  console.log('\n🧪 Starting ElevenLabs Async STT Integration Test');
  
  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_AUDIO_FILE)) {
      console.error(`\n❌ Test audio file not found: ${TEST_AUDIO_FILE}`);
      console.log('Please create a test audio file in RAW μ-law 8kHz format');
      finishTest(false);
      return;
    }
    
    // Read test audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    console.log(`📂 Read test audio file: ${TEST_AUDIO_FILE} (${audioBuffer.length} bytes)`);
    
    // Register event listener for webhook results
    const webhookEvent = 'elevenlabs:stt:result:' + TEST_REQUEST_ID;
    const eventTimeout = setTimeout(() => {
      console.log(`⏱️ No webhook event received for request ID: ${TEST_REQUEST_ID}`);
      finishTest(false);
    }, 20000);
    
    eventEmitter.on(webhookEvent, (result) => {
      clearTimeout(eventTimeout);
      console.log(`📥 Received webhook result for request ID: ${TEST_REQUEST_ID}`);
      console.log(`📝 Transcription: ${result.text || '(no text)'}`);
      
      if (result.text && result.text.length > 0) {
        console.log('\n✅ TEST PASSED: Successfully received transcription from ElevenLabs');
        finishTest(true);
      } else {
        console.error('\n❌ TEST FAILED: Received empty transcription from ElevenLabs');
        finishTest(false);
      }
    });
    
    // Submit audio for transcription
    console.log(`🔊 Submitting audio to ElevenLabs for transcription (Request ID: ${TEST_REQUEST_ID})`);
    const result = await elevenlabsService.submitSpeechToTextAsync(
      audioBuffer,
      {
        sampleRate: 8000,
        encoding: 'audio/x-mulaw',
        channels: 1
      },
      TEST_REQUEST_ID
    );
    
    console.log(`📤 Audio submitted to ElevenLabs (${result?.success ? 'Success' : 'Failed'})`);
    console.log(`⏱️ Waiting for webhook callback (timeout: 20s)...`);
    
    if (!result || !result.success) {
      console.error(`\n❌ TEST FAILED: Failed to submit audio to ElevenLabs`);
      if (result?.error) {
        console.error(`Error: ${result.error}`);
      }
      finishTest(false);
    }
  } catch (error) {
    console.error(`\n❌ TEST FAILED: Error during test execution`);
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    finishTest(false);
  }
}

/**
 * Finish test and exit
 * @param {boolean} success - Whether the test passed
 */
function finishTest(success) {
  if (testFinished) return;
  testFinished = true;
  
  console.log(`\n${success ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
  
  // Clean up
  clearTimeout(testTimeout);
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Start test
runTest();

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  finishTest(false);
});
