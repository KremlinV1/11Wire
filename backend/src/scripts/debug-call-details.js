/**
 * Debug script for the call details API endpoint
 */

const db = require('../models');
const logger = require('../utils/logger');
const signalwireService = require('../services/signalwire.service');

// Debug constants
const TEST_CALL_SID = 'TEST-DEBUG-CALL-SID-12345';

/**
 * Test the call details service logic directly
 */
const testGetCallDetailsByIdDirect = async (callLogId) => {
  try {
    logger.info(`Directly testing getCallDetails with ID: ${callLogId}`);
    
    // Attempt to find the call in the database (by internal ID)
    const callLog = await db.CallLog.findByPk(callLogId, {
      include: [
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'email']
        },
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        }
      ]
    });
    
    if (callLog) {
      logger.info(`Found call log in database: ${JSON.stringify(callLog.toJSON(), null, 2)}`);
      return { success: true, call: callLog };
    }
    
    logger.error(`Call log with ID ${callLogId} not found in database`);
    return { success: false, error: 'Call log not found' };
  } catch (error) {
    logger.error(`Error in direct test of getCallDetails: ${error.message}`);
    logger.error(error.stack);
    return { success: false, error: error.message };
  }
};

/**
 * Test the call details service with SignalWire fallback
 */
const testGetCallDetailsBySidWithFallback = async (callSid) => {
  try {
    logger.info(`Testing getCallDetails with SID (with fallback): ${callSid}`);
    
    // First try to find by callSid in database
    const callLog = await db.CallLog.findOne({
      where: { callSid },
      include: [
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'email']
        },
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        }
      ]
    });
    
    // If found in database, return it
    if (callLog) {
      logger.info(`Found call log in database by SID: ${JSON.stringify(callLog.toJSON(), null, 2)}`);
      return { success: true, call: callLog };
    }
    
    // If not in database, try SignalWire API
    logger.info('Call not found in database, attempting SignalWire fallback');
    try {
      const call = await signalwireService.getCallDetails(callSid);
      
      // Transform to match our format
      const transformedCall = {
        callSid: call.sid,
        direction: call.direction,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: new Date(call.dateCreated),
        endTime: call.dateCreated && call.duration ? 
          new Date(new Date(call.dateCreated).getTime() + (call.duration * 1000)) : null,
        callData: call
      };
      
      logger.info(`Retrieved call from SignalWire: ${JSON.stringify(transformedCall, null, 2)}`);
      return { success: true, call: transformedCall, source: 'signalwire' };
    } catch (swError) {
      logger.error(`Error from SignalWire API: ${swError.message}`);
      return { success: false, error: `SignalWire API error: ${swError.message}` };
    }
  } catch (error) {
    logger.error(`Error in test with fallback: ${error.message}`);
    logger.error(error.stack);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize database schema
 */
const initSchema = async () => {
  try {
    logger.info('Initializing database schema...');
    // Sync the CallLog model with the database
    await db.CallLog.sync({ force: false });
    logger.info('CallLog model synchronized with database');
  } catch (error) {
    logger.error(`Error initializing schema: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Create test data for the debugging
 */
const createTestData = async () => {
  try {
    // Delete any existing test data with the same callSid
    await db.CallLog.destroy({
      where: { callSid: TEST_CALL_SID }
    });
    
    // Create a test call log
    const callLog = await db.CallLog.create({
      callSid: TEST_CALL_SID,
      from: '+15551234567',
      to: '+15559876543',
      direction: 'outbound',
      status: 'completed',
      duration: 60,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(), 
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    logger.info(`Created test call log with ID: ${callLog.id}`);
    return callLog.id;
  } catch (error) {
    logger.error(`Error creating test data: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Debug the call details endpoint
 */
const debugCallDetailsEndpoint = async () => {
  try {
    logger.info('Starting call details endpoint debug...');
    
    // Initialize schema
    await initSchema();
    
    // Create test data
    const callLogId = await createTestData();
    
    // Test the direct method with ID
    logger.info('\n--- Testing getCallDetails with ID (direct from DB) ---');
    const idResult = await testGetCallDetailsByIdDirect(callLogId);
    
    // Test with SignalWire fallback
    logger.info('\n--- Testing getCallDetails with SID (with SignalWire fallback) ---');
    const sidResult = await testGetCallDetailsBySidWithFallback(TEST_CALL_SID);
    
    // Test with a non-existent ID
    logger.info('\n--- Testing getCallDetails with non-existent ID ---');
    const nonExistentResult = await testGetCallDetailsByIdDirect(99999);
    
    // Test with a non-existent SID
    logger.info('\n--- Testing getCallDetails with non-existent SID ---');
    const nonExistentSidResult = await testGetCallDetailsBySidWithFallback('NON-EXISTENT-SID');
    
    // Log summary
    logger.info('\nDEBUG RESULTS SUMMARY:');
    logger.info(`By ID direct: ${idResult.success ? 'PASS' : 'FAIL'}`);
    logger.info(`By SID with fallback: ${sidResult.success ? 'PASS' : 'FAIL'}`);
    logger.info(`Non-existent ID: ${nonExistentResult.success ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE'}`);
    logger.info(`Non-existent SID: ${nonExistentSidResult.success ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE'}`);
    
  } catch (error) {
    logger.error(`Error in debug script: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Force exit to avoid hanging
    setTimeout(() => process.exit(0), 1000);
  }
};

// Run the debug
debugCallDetailsEndpoint();
