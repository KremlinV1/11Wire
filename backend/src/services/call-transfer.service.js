/**
 * Call Transfer Service
 * Handles transferring calls between AI agents and human agents
 */

const db = require('../models');
const signalwireService = require('./signalwire.service');
const logger = require('../utils/logger');

/**
 * Initiate a call transfer
 * @param {string} callSid - SignalWire Call SID to transfer
 * @param {string} targetEndpoint - Agent/endpoint to transfer to (SIP URI or phone number)
 * @param {string} transferType - Type of transfer ('warm' or 'cold')
 * @param {Object} metadata - Additional transfer metadata
 * @returns {Promise<Object>} Transfer result
 */
const initiateTransfer = async (callSid, targetEndpoint, transferType = 'warm', metadata = {}) => {
  try {
    logger.info(`Initiating ${transferType} transfer for call ${callSid} to ${targetEndpoint}`);
    
    // Find the call log
    const callLog = await db.CallLog.findOne({
      where: { callSid }
    });
    
    if (!callLog) {
      throw new Error(`Call log not found for SID: ${callSid}`);
    }
    
    // Update call log with transfer info
    await callLog.update({
      transferStatus: 'requested',
      transferType: transferType,
      transferredTo: targetEndpoint,
      transferTime: new Date(),
      transferMetadata: metadata
    });
    
    // Handle different transfer types
    let transferResult;
    if (transferType === 'warm') {
      // For warm transfer, announce the transfer first
      transferResult = await announceTransfer(callSid, targetEndpoint, metadata);
    } else {
      // For cold transfer, directly transfer the call
      transferResult = await executeTransfer(callSid, targetEndpoint, metadata);
    }
    
    return {
      callSid,
      targetEndpoint,
      transferType,
      result: transferResult
    };
  } catch (error) {
    logger.error(`Transfer initiation failed: ${error.message}`);
    
    // Update call log with failure status
    try {
      const callLog = await db.CallLog.findOne({ where: { callSid } });
      if (callLog) {
        await callLog.update({
          transferStatus: 'failed',
          transferMetadata: {
            ...callLog.transferMetadata,
            error: error.message
          }
        });
      }
    } catch (updateError) {
      logger.error(`Failed to update call log after transfer failure: ${updateError.message}`);
    }
    
    throw error;
  }
};

/**
 * Announce a warm transfer to the receiving agent
 * @param {string} callSid - Call SID
 * @param {string} targetEndpoint - Target agent/endpoint
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Announcement result
 */
const announceTransfer = async (callSid, targetEndpoint, metadata = {}) => {
  try {
    logger.info(`Announcing transfer for call ${callSid} to ${targetEndpoint}`);
    
    // Get call details for context
    const callLog = await db.CallLog.findOne({
      where: { callSid },
      include: [
        { model: db.Contact, as: 'contact' }
      ]
    });
    
    // Update call status to in-progress transfer
    await callLog.update({ transferStatus: 'in-progress' });
    
    // Create a simplified context for the receiving agent
    const transferContext = {
      caller: callLog.from,
      contactInfo: callLog.contact ? {
        name: `${callLog.contact.firstName} ${callLog.contact.lastName}`,
        email: callLog.contact.email
      } : null,
      callDuration: callLog.duration,
      notes: callLog.notes,
      customData: metadata.customData || {}
    };
    
    // Use SignalWire to initiate the transfer with context
    // This is a placeholder - actual implementation depends on SignalWire's capabilities
    const result = await signalwireService.initiateWarmTransfer(
      callSid,
      targetEndpoint,
      transferContext
    );
    
    return result;
  } catch (error) {
    logger.error(`Transfer announcement failed: ${error.message}`);
    throw error;
  }
};

/**
 * Execute a direct call transfer (cold transfer)
 * @param {string} callSid - Call SID
 * @param {string} targetEndpoint - Target agent/endpoint
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Transfer execution result
 */
const executeTransfer = async (callSid, targetEndpoint, metadata = {}) => {
  try {
    logger.info(`Executing transfer for call ${callSid} to ${targetEndpoint}`);
    
    // Update call status to in-progress transfer
    const callLog = await db.CallLog.findOne({ where: { callSid } });
    await callLog.update({ transferStatus: 'in-progress' });
    
    // Use SignalWire to execute the transfer
    // This is a placeholder - actual implementation depends on SignalWire's capabilities
    const result = await signalwireService.transferCall(
      callSid,
      targetEndpoint,
      metadata
    );
    
    return result;
  } catch (error) {
    logger.error(`Transfer execution failed: ${error.message}`);
    throw error;
  }
};

/**
 * Complete a call transfer
 * @param {string} callSid - Call SID
 * @param {boolean} success - Whether transfer was successful
 * @param {Object} details - Additional details about the completed transfer
 * @returns {Promise<Object>} Updated call log
 */
const completeTransfer = async (callSid, success = true, details = {}) => {
  try {
    logger.info(`Completing transfer for call ${callSid}, success: ${success}`);
    
    // Find and update the call log
    const callLog = await db.CallLog.findOne({ where: { callSid } });
    
    if (!callLog) {
      throw new Error(`Call log not found for SID: ${callSid}`);
    }
    
    // Update the transfer status
    await callLog.update({
      transferStatus: success ? 'completed' : 'failed',
      transferMetadata: {
        ...callLog.transferMetadata,
        completionDetails: details
      }
    });
    
    return callLog;
  } catch (error) {
    logger.error(`Failed to complete transfer: ${error.message}`);
    throw error;
  }
};

/**
 * Get pending transfers
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Pending transfers
 */
const getPendingTransfers = async (filters = {}) => {
  try {
    // Build where clause
    const whereClause = {
      transferStatus: {
        [db.Sequelize.Op.in]: ['requested', 'in-progress']
      }
    };
    
    // Add additional filters
    if (filters.targetEndpoint) {
      whereClause.transferredTo = filters.targetEndpoint;
    }
    
    // Get pending transfers
    const pendingTransfers = await db.CallLog.findAll({
      where: whereClause,
      include: [
        { model: db.Contact, as: 'contact' }
      ],
      order: [['transferTime', 'ASC']]
    });
    
    return pendingTransfers;
  } catch (error) {
    logger.error(`Failed to get pending transfers: ${error.message}`);
    throw error;
  }
};

/**
 * Reject a transfer request
 * @param {string} callSid - Call SID
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Updated call log
 */
const rejectTransfer = async (callSid, reason = 'Agent rejected transfer') => {
  try {
    logger.info(`Rejecting transfer for call ${callSid}: ${reason}`);
    
    // Find the call log
    const callLog = await db.CallLog.findOne({ where: { callSid } });
    
    if (!callLog) {
      throw new Error(`Call log not found for SID: ${callSid}`);
    }
    
    // Update transfer status
    await callLog.update({
      transferStatus: 'failed',
      transferMetadata: {
        ...callLog.transferMetadata,
        rejectionReason: reason
      }
    });
    
    // Notify the original agent that transfer was rejected
    // Implementation depends on SignalWire's capabilities
    
    return callLog;
  } catch (error) {
    logger.error(`Failed to reject transfer: ${error.message}`);
    throw error;
  }
};

module.exports = {
  initiateTransfer,
  announceTransfer,
  executeTransfer,
  completeTransfer,
  getPendingTransfers,
  rejectTransfer
};
