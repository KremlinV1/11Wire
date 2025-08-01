/**
 * Telephony Integration Test Script
 * Tests the integration between SignalWire, ElevenLabs, AMD, and event listener
 * 
 * This script tests the complete call flow and campaign execution
 */

require('dotenv').config({ path: '.env.test' });
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const signalwireService = require('../../services/signalwire.service');
const elevenlabsService = require('../../services/elevenlabs.service');
const amdService = require('../../services/amd.service');
const callHandlingService = require('../../services/call-handling.service');
// Conditionally load the real or mock campaign scheduler service
let campaignSchedulerService;
if (process.env.TEST_MOCK_MODE === 'true') {
  console.log('Loading MOCK campaign scheduler service for tests');
  campaignSchedulerService = require('../../services/campaign-scheduler.mock');
} else {
  campaignSchedulerService = require('../../services/campaign-scheduler.service');
}
const mediaStreamService = require('../../services/media-stream.service');
const callEventsService = require('../../services/call-events.service');
const logger = require('../../utils/logger');

// Configuration
const config = {
  // Test phone numbers (replace with actual test numbers)
  // Format with full E.164 format (+ country code and number)
  testFromNumber: process.env.TEST_FROM_NUMBER || '+18888524213', // Verified caller number (FROM)
  testToNumber: process.env.TEST_TO_NUMBER || '+19293041562', // Verified recipient number (TO)
  testPhoneNumberId: process.env.TEST_PHONE_NUMBER_ID || 'c3a44c26-4ea4-4393-8fee-9bb687346590', // Phone number ID
  
  // ElevenLabs voice ID
  testVoiceId: process.env.TEST_VOICE_ID || 'default-voice-id',
  
  // Campaign data
  testCampaignId: 'test-campaign',
  
  // Server hostname
  hostname: process.env.PUBLIC_HOSTNAME || 'http://localhost:3000',
  
  // Test timeouts
  eventTimeout: 60000,  // 60 seconds for event listeners
  callTimeout: 180000,  // 3 minutes for call completion
  
  // Test mode
  mockMode: process.env.TEST_MOCK_MODE === 'true', // Use TEST_MOCK_MODE from environment
};

/**
 * Sleep helper function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test for SignalWire connection
 */
async function testSignalWireConnection() {
  console.log('\n--- Testing SignalWire Connection ---');
  
  try {
    if (config.mockMode) {
      console.log('Mock mode: Simulating successful SignalWire connection');
      return { success: true };
    }
    
    // Test getting recent calls to verify SignalWire API connection
    const recentCalls = await signalwireService.getRecentCalls({ limit: 1 });
    
    console.log(`✅ Successfully connected to SignalWire API. Found ${recentCalls.length} recent calls.`);
    return { success: true, recentCalls };
  } catch (error) {
    console.error(`❌ SignalWire connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test for ElevenLabs connection
 */
async function testElevenLabsConnection() {
  console.log('\n--- Testing ElevenLabs Connection ---');
  
  try {
    if (config.mockMode) {
      console.log('Mock mode: Simulating successful ElevenLabs connection');
      return { success: true, voices: [{ voice_id: 'mock-voice-id', name: 'Mock Voice' }] };
    }
    
    // Test getting voices to verify ElevenLabs API connection
    const voices = await elevenlabsService.getVoices();
    
    console.log(`✅ Successfully connected to ElevenLabs API. Found ${voices.length} voices.`);
    return { success: true, voices };
  } catch (error) {
    console.error(`❌ ElevenLabs connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test text-to-speech generation
 */
async function testTextToSpeech() {
  console.log('\n--- Testing ElevenLabs Text-to-Speech ---');
  
  try {
    if (config.mockMode) {
      console.log('Mock mode: Simulating successful text-to-speech generation');
      return { 
        success: true, 
        audioData: Buffer.from('Mock audio data') 
      };
    }
    
    // Get a valid voice ID from the API if not explicitly set
    let voiceId = config.testVoiceId;
    if (voiceId === 'default-voice-id') {
      console.log('No specific voice ID provided, fetching available voices...');
      const voices = await elevenlabsService.getVoices();
      if (voices && voices.length > 0) {
        voiceId = voices[0].voice_id; // Use the first available voice
        console.log(`Using voice ID: ${voiceId} (${voices[0].name})`);
      } else {
        throw new Error('No voices available from ElevenLabs API');
      }
    }
    
    const testText = 'This is a test of the AI Dialer text to speech system.';
    console.log(`Generating speech with voice ID: ${voiceId}`);
    console.log(`Text: "${testText}"`);
    
    const audioData = await elevenlabsService.generateSpeech(testText, voiceId);
    
    // Save to file for verification
    const testFilePath = path.join(__dirname, '../../../uploads/test-tts.mp3');
    await elevenlabsService.saveAudioToFile(audioData, testFilePath);
    
    console.log(`✅ Successfully generated speech and saved to ${testFilePath}`);
    return { success: true, audioData, testFilePath };
  } catch (error) {
    console.error(`❌ Text-to-speech generation failed: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test AMD processing
 */
async function testAmdProcessing() {
  console.log('\n--- Testing Answering Machine Detection ---');
  
  try {
    // Test AMD result processing with mock webhook data
    const humanCallData = {
      CallSid: 'test-call-human',
      AnsweredBy: 'human',
      CallStatus: 'in-progress',
      Direction: 'outbound-api',
      From: config.testFromNumber,
      To: config.testToNumber
    };
    
    const machineCallData = {
      CallSid: 'test-call-machine',
      AnsweredBy: 'machine_end_beep',
      CallStatus: 'in-progress',
      Direction: 'outbound-api',
      From: config.testFromNumber,
      To: config.testToNumber
    };
    
    // Process AMD results
    const humanResult = amdService.processAmdResult(humanCallData);
    const machineResult = amdService.processAmdResult(machineCallData);
    
    // Verify results
    if (!humanResult.isHuman) {
      throw new Error('Failed to correctly identify human answer');
    }
    
    if (!machineResult.isMachine) {
      throw new Error('Failed to correctly identify machine answer');
    }
    
    console.log('✅ AMD processing working correctly:');
    console.log(`  - Human detection: ${humanResult.isHuman}`);
    console.log(`  - Machine detection: ${machineResult.isMachine}`);
    
    // Test TwiML generation
    const humanTwiML = amdService.generateLeaveMessageTwiML(
      `${config.hostname}/api/media/human.mp3`,
      `${config.hostname}/api/call/webhook/status`
    );
    
    const machineTwiML = amdService.generateWaitForBeepTwiML(
      `${config.hostname}/api/media/machine.mp3`,
      `${config.hostname}/api/call/webhook/status`,
      2
    );
    
    // Verify TwiML
    if (!humanTwiML.includes('<Play>') || !machineTwiML.includes('<Pause')) {
      throw new Error('TwiML generation not working correctly');
    }
    
    console.log('✅ AMD TwiML generation working correctly');
    
    return { 
      success: true, 
      humanResult, 
      machineResult,
      humanTwiML,
      machineTwiML
    };
  } catch (error) {
    console.error(`❌ AMD processing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test call events system
 */
async function testCallEvents() {
  console.log('\n--- Testing Call Events System ---');
  
  try {
    // Create a promise that will resolve when we receive the expected event
    const eventPromise = new Promise((resolve, reject) => {
      // Set a timeout to fail if we don't receive the event
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for call event'));
      }, config.eventTimeout);
      
      // Create test call SID
      const testCallSid = `test-call-${Date.now()}`;
      
      // Add listener for test event
      const removeListener = callEventsService.addCallEventListener(
        testCallSid,
        (event) => {
          clearTimeout(timeout);
          resolve(event);
        },
        'test-event'
      );
      
      // Create a custom event after a short delay
      setTimeout(() => {
        callEventsService.createCustomEvent(
          testCallSid, 
          'test-event', 
          { message: 'Test event payload' }
        );
      }, 1000);
    });
    
    // Wait for the event
    const event = await eventPromise;
    
    console.log('✅ Call events system working correctly:');
    console.log(`  - Received event for call ${event.callSid}`);
    console.log(`  - Event type: ${event.type}`);
    
    return { success: true, event };
  } catch (error) {
    console.error(`❌ Call events system failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test campaign scheduler
 */
async function testCampaignScheduler() {
  console.log('\n--- Testing Campaign Scheduler ---');
  
  try {
    // Start a test campaign
    const settings = {
      batchSize: 2,
      batchDelayMs: 5000,
      callDelayMs: 2000,
      maxConcurrentCalls: 2
    };
    
    // Start campaign scheduler
    const startResult = await campaignSchedulerService.startCampaign(
      config.testCampaignId,
      settings
    );
    
    if (startResult.status !== 'started') {
      throw new Error(`Failed to start campaign: ${startResult.status}`);
    }
    
    console.log('✅ Campaign started successfully');
    
    // Wait a moment and get status
    await sleep(2000);
    const statusResult = campaignSchedulerService.getCampaignStatus(config.testCampaignId);
    
    if (!statusResult.isRunning) {
      throw new Error('Campaign not running after start');
    }
    
    console.log('✅ Campaign status check successful:');
    console.log(`  - Running: ${statusResult.isRunning}`);
    console.log(`  - Batch size: ${statusResult.settings.batchSize}`);
    
    // Test pausing
    const pauseResult = campaignSchedulerService.pauseCampaign(config.testCampaignId);
    
    if (pauseResult.status !== 'paused') {
      throw new Error(`Failed to pause campaign: ${pauseResult.status}`);
    }
    
    console.log('✅ Campaign paused successfully');
    
    // Test resuming
    const resumeResult = campaignSchedulerService.resumeCampaign(config.testCampaignId);
    
    if (resumeResult.status !== 'resumed') {
      throw new Error(`Failed to resume campaign: ${resumeResult.status}`);
    }
    
    console.log('✅ Campaign resumed successfully');
    
    // Test stopping
    const stopResult = await campaignSchedulerService.stopCampaign(config.testCampaignId);
    
    if (stopResult.status !== 'stopped') {
      throw new Error(`Failed to stop campaign: ${stopResult.status}`);
    }
    
    console.log('✅ Campaign stopped successfully');
    
    return { 
      success: true, 
      startResult, 
      statusResult, 
      pauseResult,
      resumeResult,
      stopResult
    };
  } catch (error) {
    console.error(`❌ Campaign scheduler failed: ${error.message}`);
    
    // Try to clean up
    try {
      await campaignSchedulerService.stopCampaign(config.testCampaignId);
    } catch (cleanupError) {
      console.error(`  - Cleanup error: ${cleanupError.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test outbound call
 */
async function testOutboundCall() {
  console.log('\n--- Testing Outbound Call ---');
  
  try {
    if (config.mockMode) {
      console.log('Mock mode: Simulating successful outbound call');
      
      const mockCallSid = `TEST${Date.now()}`;
      
      return { 
        success: true, 
        callResult: {
          callSid: mockCallSid,
          status: 'queued',
          direction: 'outbound',
          to: config.testToNumber,
          from: config.testFromNumber
        }
      };
    }
    
    const to = config.testToNumber;
    const from = config.testFromNumber;
    const phoneNumberId = config.testPhoneNumberId;
    
    console.log(`Initiating outbound call to ${to} from ${from} with phone number ID: ${phoneNumberId}`);
    
    // Get a valid voice ID if needed, just like in the TTS test
    let voiceId = config.testVoiceId;
    if (voiceId === 'default-voice-id') {
      const voices = await elevenlabsService.getVoices();
      if (voices && voices.length > 0) {
        voiceId = voices[0].voice_id;
        console.log(`Using voice ID: ${voiceId}`);
      }
    }
    
    // Make a test outbound call
    const callResult = await callHandlingService.initiateOutboundCall(
      to,
      from,
      voiceId,
      null,
      { id: config.testCampaignId },
      phoneNumberId
    );
    
    if (!callResult.callSid) {
      throw new Error('Failed to initiate outbound call');
    }
    
    console.log('✅ Outbound call initiated successfully:');
    console.log(`  - Call SID: ${callResult.callSid}`);
    console.log(`  - Status: ${callResult.status}`);
    
    // Wait a moment and check call status
    await sleep(5000);
    
    // Get call details
    const callDetails = await signalwireService.getCallDetails(callResult.callSid);
    
    console.log(`✅ Call status: ${callDetails.status}`);
    
    // End the call if it's still active
    if (callDetails.status === 'in-progress' || callDetails.status === 'ringing') {
      await signalwireService.endCall(callResult.callSid);
      console.log('✅ Call ended successfully');
    }
    
    return { success: true, callResult, callDetails };
  } catch (error) {
    console.error(`❌ Outbound call failed: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test media streaming
 */
async function testMediaStreaming() {
  console.log('\n--- Testing Media Streaming ---');
  
  try {
    if (config.mockMode) {
      console.log('Mock mode: Simulating successful media streaming');
      return { success: true };
    }
    
    // Test TwiML generation for streaming
    const mockCallSid = `TEST${Date.now()}`;
    const twiml = mediaStreamService.createStreamingTwiML(mockCallSid);
    
    if (!twiml.includes('<Stream')) {
      throw new Error('Failed to generate streaming TwiML');
    }
    
    console.log('✅ Streaming TwiML generated successfully');
    
    // Note: Full WebSocket streaming test would require an actual call
    // This is a simplified test of the functionality
    
    return { success: true, twiml };
  } catch (error) {
    console.error(`❌ Media streaming test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('=================================================');
  console.log('  SIGNALWIRE + ELEVENLABS INTEGRATION TEST');
  console.log('=================================================');
  console.log(`Starting tests at ${new Date().toISOString()}`);
  console.log(`Mode: ${config.mockMode ? 'Mock' : 'Live API'}`);
  console.log('=================================================\n');
  
  const results = {};
  const startTime = Date.now();
  
  try {
    // Test API connections
    results.signalwire = await testSignalWireConnection();
    results.elevenlabs = await testElevenLabsConnection();
    
    // Test basic functionality
    results.tts = await testTextToSpeech();
    results.amd = await testAmdProcessing();
    results.events = await testCallEvents();
    
    // Test campaign and call management
    results.campaign = await testCampaignScheduler();
    results.call = await testOutboundCall();
    results.streaming = await testMediaStreaming();
    
    // Summarize results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n=================================================');
    console.log('  TEST RESULTS SUMMARY');
    console.log('=================================================');
    
    let allSuccessful = true;
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${testName}`);
      
      if (!result.success) {
        allSuccessful = false;
      }
    });
    
    console.log('-------------------------------------------------');
    console.log(`Duration: ${duration} seconds`);
    console.log(`Overall Status: ${allSuccessful ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('=================================================');
    
    return {
      success: allSuccessful,
      results,
      duration
    };
  } catch (error) {
    console.error(`\n❌ Critical test failure: ${error.message}`);
    
    console.log('\n=================================================');
    console.log('  TEST RESULTS SUMMARY');
    console.log('=================================================');
    console.log('❌ FAILED - Critical test error');
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    console.log('=================================================');
    
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

// Export for use in other test scripts
module.exports = {
  runAllTests,
  testSignalWireConnection,
  testElevenLabsConnection,
  testTextToSpeech,
  testAmdProcessing,
  testCallEvents,
  testCampaignScheduler,
  testOutboundCall,
  testMediaStreaming
};

// Run the tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(result => {
      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}
