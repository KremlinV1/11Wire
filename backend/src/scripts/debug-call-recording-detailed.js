/**
 * Detailed debug script for call recording functionality
 * This script will trace through the entire call recording service logic
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const callRecordingService = require('../services/call-recording.service');
const signalwireService = require('../services/signalwire.service');
const logger = require('../utils/logger');

// Set up more detailed mock for SignalWire service
const mockStartRecording = async (callSid, options) => {
  logger.info('MOCK: Starting recording with callSid:', callSid);
  logger.info('MOCK: Recording options:', JSON.stringify(options));
  
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

// Test starting a recording
async function testStartRecording() {
  logger.info('TEST: Starting a recording');
  
  try {
    // Call the service directly to start a recording
    const startResult = await callRecordingService.startCallRecording(TEST_CALL_SID, {
      format: 'mp3',
      channels: 1
    });
    
    logger.info('Start recording result:', startResult);
    return startResult;
  } catch (error) {
    logger.error('Error starting recording:', error.message);
    logger.error(error.stack);
    return null;
  }
}

// Test stopping a recording
async function testStopRecording(recordingSid) {
  logger.info('TEST: Stopping a recording');
  
  try {
    // Call the service directly to stop the recording
    const stopResult = await callRecordingService.stopCallRecording(TEST_CALL_SID);
    
    logger.info('Stop recording result:', stopResult);
    return stopResult;
  } catch (error) {
    logger.error('Error stopping recording:', error.message);
    logger.error(error.stack);
    return null;
  }
}

// Clean up test recordings
async function cleanupTestRecordings() {
  try {
    await db.CallRecording.destroy({
      where: {
        call_sid: TEST_CALL_SID
      }
    });
    logger.info('Cleaned up test recordings');
  } catch (error) {
    logger.error('Error cleaning up test recordings:', error.message);
    logger.error(error.stack);
  }
}

// Verify database schema
async function verifySchema() {
  try {
    // Check call_recordings table
    const [recordingsTable] = await db.sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_recordings')"
    );
    const tableExists = recordingsTable[0]?.exists;
    logger.info(`call_recordings table exists: ${tableExists}`);
    
    // If table exists, check columns
    if (tableExists) {
      const [columns] = await db.sequelize.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'call_recordings'"
      );
      logger.info('call_recordings table columns:', columns.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }
    
    // Check model definition
    logger.info('CallRecording model attributes:', Object.keys(db.CallRecording.rawAttributes).join(', '));
    logger.info('CallRecording table name:', db.CallRecording.tableName);
    logger.info('CallRecording underscored setting:', db.CallRecording.options.underscored);
    
    return tableExists;
  } catch (error) {
    logger.error('Error verifying schema:', error.message);
    logger.error(error.stack);
    return false;
  }
}

async function debugCallRecording() {
  try {
    logger.info('Starting detailed call recording debug tests');
    
    // Connect to database
    await db.sequelize.authenticate();
    logger.info('Database connection established');
    
    // Verify schema
    const schemaValid = await verifySchema();
    if (!schemaValid) {
      logger.error('Schema verification failed, cannot proceed with tests');
      return;
    }
    
    // Clean up any existing test recordings
    await cleanupTestRecordings();
    
    // Test 1: Start recording
    const startResult = await testStartRecording();
    
    if (startResult) {
      // Test 2: Stop recording
      await testStopRecording(startResult.recordingSid);
    }
    
    // Clean up test recordings
    await cleanupTestRecordings();
    
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
    
    try {
      await db.sequelize.close();
    } catch (e) {
      // Ignore close error
    }
  }
}

debugCallRecording();
