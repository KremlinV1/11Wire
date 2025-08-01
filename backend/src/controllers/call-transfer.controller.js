/**
 * Call Transfer Controller
 * Handles API endpoints for call transfer operations
 */

const transferService = require('../services/call-transfer.service');
const logger = require('../utils/logger');

/**
 * Initiate a call transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initiateTransfer = async (req, res) => {
  try {
    const { callSid, targetEndpoint, transferType, metadata } = req.body;
    
    // Validate required fields
    if (!callSid || !targetEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: callSid and targetEndpoint are required'
      });
    }
    
    // Validate transfer type
    const validTransferTypes = ['warm', 'cold'];
    if (transferType && !validTransferTypes.includes(transferType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer type: must be "warm" or "cold"'
      });
    }
    
    // Initiate the transfer
    const result = await transferService.initiateTransfer(
      callSid, 
      targetEndpoint, 
      transferType || 'warm', 
      metadata || {}
    );
    
    return res.status(200).json({
      success: true,
      message: `${transferType || 'warm'} transfer initiated successfully`,
      data: result
    });
  } catch (error) {
    logger.error(`Error initiating transfer: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to initiate transfer: ${error.message}`
    });
  }
};

/**
 * Complete a call transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeTransfer = async (req, res) => {
  try {
    const { callSid } = req.params;
    const { success, details } = req.body;
    
    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: callSid'
      });
    }
    
    // Complete the transfer
    const result = await transferService.completeTransfer(
      callSid,
      success !== false, // default to true if not explicitly false
      details || {}
    );
    
    return res.status(200).json({
      success: true,
      message: 'Transfer completion recorded successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error completing transfer: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to complete transfer: ${error.message}`
    });
  }
};

/**
 * Get pending transfers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingTransfers = async (req, res) => {
  try {
    const { targetEndpoint } = req.query;
    
    // Build filters
    const filters = {};
    if (targetEndpoint) {
      filters.targetEndpoint = targetEndpoint;
    }
    
    // Get pending transfers
    const pendingTransfers = await transferService.getPendingTransfers(filters);
    
    return res.status(200).json({
      success: true,
      count: pendingTransfers.length,
      data: pendingTransfers
    });
  } catch (error) {
    logger.error(`Error getting pending transfers: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to get pending transfers: ${error.message}`
    });
  }
};

/**
 * Reject a transfer request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rejectTransfer = async (req, res) => {
  try {
    const { callSid } = req.params;
    const { reason } = req.body;
    
    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: callSid'
      });
    }
    
    // Reject the transfer
    const result = await transferService.rejectTransfer(
      callSid,
      reason || 'Agent rejected transfer'
    );
    
    return res.status(200).json({
      success: true,
      message: 'Transfer rejected successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error rejecting transfer: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to reject transfer: ${error.message}`
    });
  }
};

/**
 * Get transfer status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransferStatus = async (req, res) => {
  try {
    const { callSid } = req.params;
    
    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: callSid'
      });
    }
    
    // Find the call log
    const callLog = await db.CallLog.findOne({
      where: { callSid },
      attributes: [
        'callSid',
        'transferStatus',
        'transferredTo',
        'transferredFrom',
        'transferTime',
        'transferType',
        'transferMetadata'
      ]
    });
    
    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: `Call log not found for SID: ${callSid}`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: callLog
    });
  } catch (error) {
    logger.error(`Error getting transfer status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to get transfer status: ${error.message}`
    });
  }
};

module.exports = {
  initiateTransfer,
  completeTransfer,
  getPendingTransfers,
  rejectTransfer,
  getTransferStatus
};
