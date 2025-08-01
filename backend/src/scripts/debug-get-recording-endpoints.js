/**
 * Debug script for GET call recording endpoints
 * This script diagnoses issues with listing and retrieving call recordings
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const callRecordingService = require('../services/call-recording.service');
const logger = require('../utils/logger');

// Test data constants
const TEST_CALL_SID = 'DEBUG-GET-TEST-CALL-SID';
const TEST_RECORDING_SID = 'DEBUG-GET-TEST-RECORDING-SID';

async function setupTestData() {
  try {
    // Clean up existing test data
    await db.CallRecording.destroy({ where: { callSid: TEST_CALL_SID } });
    await db.CallLog.destroy({ where: { callSid: TEST_CALL_SID } });
    
    logger.info('Cleaned up existing test data');
    
    // Create test CallLog record first to satisfy foreign key constraint
    const testCallLog = await db.CallLog.create({
      callSid: TEST_CALL_SID,
      direction: 'outbound',
      from: '+15551234567',
      to: '+15557654321',
      status: 'completed',
      duration: 120,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3480000)    // 58 minutes ago
    });
    
    logger.info(`Created test CallLog with ID: ${testCallLog.id}`);
    
    // Create test CallRecording record
    const testRecording = await db.CallRecording.create({
      callSid: TEST_CALL_SID,
      recordingSid: TEST_RECORDING_SID,
      status: 'completed',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3480000),   // 58 minutes ago
      duration: 120,
      format: 'mp3',
      channels: 1,
      url: 'https://example.com/recordings/test.mp3'
    });
    
    logger.info(`Created test CallRecording with ID: ${testRecording.id}`);
    
    return {
      callLogId: testCallLog.id,
      recordingId: testRecording.id
    };
  } catch (error) {
    logger.error(`Error setting up test data: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

async function testGetRecordingById(recordingId) {
  try {
    logger.info(`Testing getRecordingById with ID: ${recordingId}`);
    
    // Directly call the service method
    const recording = await callRecordingService.getRecordingById(recordingId);
    
    if (recording) {
      logger.info('Successfully retrieved recording by ID:');
      logger.info(JSON.stringify(recording, null, 2));
      return true;
    } else {
      logger.error(`Recording with ID ${recordingId} not found`);
      return false;
    }
  } catch (error) {
    logger.error(`Error in getRecordingById: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

async function testGetRecordingsForCall(callSid) {
  try {
    logger.info(`Testing getRecordingsForCall with callSid: ${callSid}`);
    
    // Directly call the service method
    const recordings = await callRecordingService.getRecordingsForCall(callSid);
    
    logger.info(`Retrieved ${recordings.length} recordings for call ${callSid}`);
    if (recordings.length > 0) {
      logger.info('First recording:');
      logger.info(JSON.stringify(recordings[0], null, 2));
      return true;
    } else {
      logger.error(`No recordings found for call ${callSid}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error in getRecordingsForCall: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

async function testListRecordings() {
  try {
    logger.info('Testing listRecordings');
    
    // Directly call the service method
    const result = await callRecordingService.listRecordings({}, 10, 0);
    
    logger.info(`Retrieved ${result.count} total recordings`);
    if (result.count > 0) {
      logger.info('First recording:');
      logger.info(JSON.stringify(result.rows[0], null, 2));
      return true;
    } else {
      logger.error('No recordings found');
      return false;
    }
  } catch (error) {
    logger.error(`Error in listRecordings: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

async function debugCallRecordingModel() {
  try {
    logger.info('Debugging CallRecording model');
    
    // Examine the model
    logger.info('Model definition:');
    logger.info('Table name:', db.CallRecording.tableName);
    logger.info('Attributes:', Object.keys(db.CallRecording.rawAttributes).join(', '));
    
    // Check associations
    logger.info('Checking associations...');
    const associations = Object.keys(db.CallRecording.associations || {});
    logger.info('Associations:', associations.join(', '));
    
    // Check database schema
    const [columns] = await db.sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'call_recordings'"
    );
    
    logger.info('Database columns:');
    columns.forEach(col => {
      logger.info(`${col.column_name} (${col.data_type})`);
    });
  } catch (error) {
    logger.error(`Error debugging model: ${error.message}`);
    logger.error(error.stack);
  }
}

async function debugCallRecordingGetEndpoints() {
  try {
    // Connect to database
    await db.sequelize.authenticate();
    logger.info('Database connection established');
    
    // Debug model first
    await debugCallRecordingModel();
    
    // Set up test data
    const { recordingId } = await setupTestData();
    
    // Test the services
    const getRecordingResult = await testGetRecordingById(recordingId);
    const getRecordingsForCallResult = await testGetRecordingsForCall(TEST_CALL_SID);
    const listRecordingsResult = await testListRecordings();
    
    // Summary
    logger.info('\nDEBUG RESULTS SUMMARY:');
    logger.info(`getRecordingById: ${getRecordingResult ? 'PASS' : 'FAIL'}`);
    logger.info(`getRecordingsForCall: ${getRecordingsForCallResult ? 'PASS' : 'FAIL'}`);
    logger.info(`listRecordings: ${listRecordingsResult ? 'PASS' : 'FAIL'}`);
    
    // Close database connection
    await db.sequelize.close();
  } catch (error) {
    logger.error('Debug script error:', error.message);
    logger.error(error.stack);
    
    try {
      await db.sequelize.close();
    } catch (e) {
      // Ignore close error
    }
  }
}

// Run the debug script
debugCallRecordingGetEndpoints();
