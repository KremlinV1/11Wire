/**
 * Call Log Service
 * 
 * Service to handle call logging operations
 */

const db = require('../models');
const logger = require('../utils/logger');
const { CallLog } = db; // Models are exported directly from db, not as db.models

/**
 * Create a new call log entry
 * @param {Object} callData - Call data to log
 * @returns {Object} Created call log entry
 */
const createCallLog = async (callData) => {
  try {
    const callLog = await CallLog.create({
      callSid: callData.callSid,
      direction: callData.direction || 'outbound',
      status: callData.status || 'initiated',
      from: callData.from,
      to: callData.to,
      duration: callData.duration || 0,
      startTime: callData.startTime || new Date(),
      endTime: callData.endTime || null,
      recordingUrl: callData.recordingUrl || null,
      recordingSid: callData.recordingSid || null,
      transferStatus: callData.transferStatus || null,
      transferredTo: callData.transferredTo || null,
      transferredFrom: callData.transferredFrom || null,
      transferTime: callData.transferTime || null,
      transferType: callData.transferType || null,
      transferMetadata: callData.transferMetadata || {},
      notes: callData.notes || null,
      metadata: callData.metadata || {},
      amdResult: callData.amdResult || null,
      amdDuration: callData.amdDuration || null,
      campaignId: callData.campaignId || null,
      contactId: callData.contactId || null,
      userId: callData.userId || null
    });

    logger.debug(`Call log created for call SID: ${callData.callSid}`);
    return callLog;
  } catch (error) {
    logger.error(`Error creating call log: ${error.message}`);
    throw error;
  }
};

/**
 * Get a call log by SID
 * @param {string} callSid - Call SID
 * @returns {Object} Call log or null if not found
 */
const getCallLogBySid = async (callSid) => {
  try {
    const callLog = await CallLog.findOne({
      where: { callSid }
    });
    
    return callLog;
  } catch (error) {
    logger.error(`Error getting call log: ${error.message}`);
    throw error;
  }
};

/**
 * Update a call log
 * @param {string} callSid - Call SID to update
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated call log
 */
const updateCallLog = async (callSid, updateData) => {
  try {
    const callLog = await CallLog.findOne({
      where: { callSid }
    });
    
    if (!callLog) {
      throw new Error(`Call log not found for SID: ${callSid}`);
    }
    
    await callLog.update(updateData);
    
    logger.debug(`Call log updated for call SID: ${callSid}`);
    return callLog;
  } catch (error) {
    logger.error(`Error updating call log: ${error.message}`);
    throw error;
  }
};

/**
 * Get call logs with filtering
 * @param {Object} filters - Query filters
 * @param {Object} options - Query options (pagination, sorting)
 * @returns {Array} Call logs matching criteria
 */
const getCallLogs = async (filters = {}, options = {}) => {
  try {
    const queryOptions = {
      where: filters,
      order: options.order || [['startTime', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    };
    
    const callLogs = await CallLog.findAndCountAll(queryOptions);
    
    return callLogs;
  } catch (error) {
    logger.error(`Error getting call logs: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createCallLog,
  getCallLogBySid,
  updateCallLog,
  getCallLogs
};
