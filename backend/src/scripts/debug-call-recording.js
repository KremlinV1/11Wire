/**
 * Debug script for call recording functionality
 * This script will test the call recording service directly to diagnose integration test failures
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const callRecordingService = require('../services/call-recording.service');
const signalwireService = require('../services/signalwire.service');
const logger = require('../utils/logger');

// Set up mock for SignalWire service
const mockStartRecording = async (callSid, options) => {
  logger.info('MOCK: Starting recording with options:', options);
  
  // Return with sid property to match what call-recording.service expects
  return {
    sid: 'DEBUG-RECORDING-SID-' + Date.now(),
    callSid,
    status: 'in-progress',
    startTime: new Date().toISOString(),
    format: options.format || 'mp3'
  };
};

const mockStopRecording = async (callSid, recordingSid) => {
  logger.info(`MOCK: Stopping recording for call ${callSid}, recording ${recordingSid}`);
  
  return {
    callSid,
    recordingSid,
    status: 'completed',
    endTime: new Date().toISOString()
  };
};

// Save original functions
const originalStartRecording = signalwireService.startRecording;
const originalStopRecording = signalwireService.stopRecording;

// Replace with mocks
signalwireService.startRecording = mockStartRecording;
signalwireService.stopRecording = mockStopRecording;

const TEST_CALL_SID = 'TEST-DEBUG-CALL-SID';

async function debugCallRecording() {
  try {
    logger.info('Starting call recording debug tests');
    
    // Connect to database
    await db.sequelize.authenticate();
    logger.info('Database connection established');
    
    // Clean up any existing test recordings
    await db.CallRecording.destroy({
      where: {
        callSid: TEST_CALL_SID
      }
    });
    logger.info('Cleaned up existing test recordings');
    
    // Test 1: Start recording
    logger.info('TEST 1: Start recording');
    try {
      const startResult = await callRecordingService.startCallRecording(TEST_CALL_SID, {
        format: 'mp3',
        channels: 1
      });
      
      logger.info('Start recording result:', startResult);
      
      // Test 2: Stop recording
      logger.info('TEST 2: Stop recording');
      const stopResult = await callRecordingService.stopCallRecording(TEST_CALL_SID);
      
      logger.info('Stop recording result:', stopResult);
    } catch (error) {
      logger.error('Error in recording tests:', error.message);
      logger.error(error.stack);
    }
    
    // Clean up
    await db.CallRecording.destroy({
      where: {
        callSid: TEST_CALL_SID
      }
    });
    logger.info('Cleaned up test recordings');
    
    // Restore original functions
    signalwireService.startRecording = originalStartRecording;
    signalwireService.stopRecording = originalStopRecording;
    
    // Close database connection
    await db.sequelize.close();
    logger.info('Debug tests completed');
  } catch (error) {
    logger.error('Debug script error:', error.message);
    logger.error(error.stack);
    
    // Restore original functions
    signalwireService.startRecording = originalStartRecording;
    signalwireService.stopRecording = originalStopRecording;
  }
}

debugCallRecording();
