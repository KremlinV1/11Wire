/**
 * Audio Bridge Integration Test
 * 
 * This script tests the integration between SignalWire and ElevenLabs
 * using the audio bridge service. It simulates a SignalWire WebSocket
 * connection and verifies the audio processing pipeline and session mapping.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test configuration
const TEST_CALL_SID = 'TEST_CALL_' + Date.now();
const TEST_VOICE_AGENT_ID = process.env.TEST_VOICE_AGENT_ID || 'eleven_labs_male_voice';
const WEBSOCKET_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/stream';
const TEST_AUDIO_FILE = path.join(__dirname, 'fixtures', 'test-audio-8khz.raw'); // You'll need to provide this file

// Create WebSocket connection
console.log(`\n🔌 Connecting to WebSocket server at ${WEBSOCKET_URL}...`);
const ws = new WebSocket(`${WEBSOCKET_URL}?callSid=${TEST_CALL_SID}`);

// Track test state
let connected = false;
let startSent = false;
let audioChunksSent = 0;
let responsesReceived = 0;
let testPassed = false;
let testFinished = false;

// Test timeout - fail if test runs too long
const testTimeout = setTimeout(() => {
  if (!testFinished) {
    console.error('\n❌ Test timed out after 30 seconds');
    process.exit(1);
  }
}, 30000);

// Handle WebSocket events
ws.on('open', () => {
  console.log('✅ WebSocket connection established');
  connected = true;
  
  // Send "connected" message similar to SignalWire
  const connectedMsg = JSON.stringify({
    event: 'connected',
    protocol: 'signalwire-stream-v1',
    version: '1.0.0'
  });
  
  ws.send(connectedMsg);
  console.log('📤 Sent connection message');
  
  // Send "start" message after a short delay
  setTimeout(() => {
    const startMsg = JSON.stringify({
      event: 'start',
      start: {
        mediaFormat: {
          encoding: 'audio/x-mulaw',
          sampleRate: 8000,
          channels: 1
        },
        customParameters: {
          voiceAgentId: TEST_VOICE_AGENT_ID,
          callSid: TEST_CALL_SID
        }
      }
    });
    
    ws.send(startMsg);
    startSent = true;
    console.log('📤 Sent start message with μ-law 8kHz format');
    
    // Start sending audio chunks after another short delay
    setTimeout(sendAudioChunks, 1000);
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.event === 'media' && message.media && message.media.track === 'outbound') {
      responsesReceived++;
      console.log(`📥 Received outbound audio response #${responsesReceived}`);
      
      // If we've received at least one response, we can consider the test a success
      if (responsesReceived >= 1 && !testPassed) {
        testPassed = true;
        console.log('\n✅ TEST PASSED: Successfully received audio response from ElevenLabs');
        
        // Wait a bit and then close the connection
        setTimeout(() => {
          finishTest(true);
        }, 2000);
      }
    }
  } catch (error) {
    console.error(`Error parsing WebSocket message: ${error.message}`);
  }
});

ws.on('error', (error) => {
  console.error(`WebSocket error: ${error.message}`);
  finishTest(false);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
  if (!testFinished) {
    finishTest(testPassed);
  }
});

/**
 * Send audio chunks from test file
 */
function sendAudioChunks() {
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
    
    // Split into 20ms chunks (160 bytes at 8kHz)
    const chunkSize = 160;
    const totalChunks = Math.ceil(audioBuffer.length / chunkSize);
    
    console.log(`📤 Sending ${totalChunks} audio chunks...`);
    
    let chunkIndex = 0;
    
    // Send chunks with delay to simulate real-time
    const sendNextChunk = () => {
      if (chunkIndex >= totalChunks || !connected || testFinished) {
        console.log(`📤 Finished sending ${chunkIndex} audio chunks`);
        
        // Send stop message
        if (connected && !testFinished) {
          const stopMsg = JSON.stringify({
            event: 'stop'
          });
          
          ws.send(stopMsg);
          console.log('📤 Sent stop message');
          
          // If we never received a response, fail the test after a timeout
          setTimeout(() => {
            if (!testPassed) {
              console.error('\n❌ TEST FAILED: No audio response received from ElevenLabs');
              finishTest(false);
            }
          }, 5000);
        }
        
        return;
      }
      
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, audioBuffer.length);
      const chunk = audioBuffer.subarray(start, end);
      
      // Send audio chunk in SignalWire format
      const mediaMsg = JSON.stringify({
        event: 'media',
        media: {
          track: 'inbound',
          chunk: chunkIndex.toString(),
          timestamp: Date.now(),
          payload: chunk.toString('base64')
        }
      });
      
      ws.send(mediaMsg);
      audioChunksSent++;
      
      // Log progress
      if (chunkIndex % 50 === 0) {
        console.log(`📤 Sent ${audioChunksSent} audio chunks...`);
      }
      
      chunkIndex++;
      
      // Schedule next chunk (simulate real-time - 20ms per chunk)
      setTimeout(sendNextChunk, 20);
    };
    
    // Start sending chunks
    sendNextChunk();
    
  } catch (error) {
    console.error(`Error sending audio chunks: ${error.message}`);
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
  console.log(`📊 Test Summary:`);
  console.log(`- WebSocket Connection: ${connected ? '✅ Success' : '❌ Failed'}`);
  console.log(`- Start Message Sent: ${startSent ? '✅ Yes' : '❌ No'}`);
  console.log(`- Audio Chunks Sent: ${audioChunksSent}`);
  console.log(`- Responses Received: ${responsesReceived}`);
  
  // Clean up
  clearTimeout(testTimeout);
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  finishTest(false);
});
