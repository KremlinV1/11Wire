/**
 * Transfer Controller
 * Handles call transfer operations
 */

const { signalwireService } = require('../services');
const db = require('../models');
const { CallLog } = db; // Models are exported directly from db, not as db.models
const logger = require('../utils/logger'); // Fixed path to logger module

/**
 * Initialize a call transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initiateTransfer = async (req, res) => {
  try {
    const { callSid, targetEndpoint, transferType = 'cold', announcement } = req.body;

    if (!callSid || !targetEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'Call SID and target endpoint are required'
      });
    }

    // Retrieve the call log to update
    const callLog = await CallLog.findOne({ where: { callSid } });
    
    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: `Call with SID ${callSid} not found`
      });
    }

    // Set up transfer options
    const transferOptions = {
      transferType,
      announcement,
      timeout: req.body.timeout || 30,
      fromNumber: req.body.fromNumber,
      fromSipUri: req.body.fromSipUri
    };

    // Execute transfer via SignalWire
    const transferResult = await signalwireService.transferCall(
      callSid,
      targetEndpoint,
      transferOptions
    );

    // Update call log with transfer details
    await callLog.update({
      transferStatus: 'in-progress',
      transferredTo: targetEndpoint,
      transferTime: new Date(),
      transferType,
      transferMetadata: {
        initiatedBy: req.body.initiatedBy || 'system',
        peerId: transferResult.peerId,
        requestDetails: req.body,
        ...transferResult
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Call transfer initiated',
      transferResult
    });
  } catch (error) {
    logger.error(`Error initiating transfer: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate call transfer',
      error: error.message
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
    const { callSid, status = 'completed', notes } = req.body;

    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Call SID is required'
      });
    }

    // Retrieve the call log to update
    const callLog = await CallLog.findOne({ where: { callSid } });
    
    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: `Call with SID ${callSid} not found`
      });
    }

    // Only allow completing transfers that are in-progress
    if (callLog.transferStatus !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete transfer with status ${callLog.transferStatus}`
      });
    }

    // Update the transfer status
    await callLog.update({
      transferStatus: status,
      notes: notes ? (callLog.notes ? `${callLog.notes}\n${notes}` : notes) : callLog.notes,
      transferMetadata: {
        ...callLog.transferMetadata,
        completedAt: new Date(),
        completionStatus: status,
        completedBy: req.body.completedBy || 'system'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Call transfer completed',
      transferStatus: status
    });
  } catch (error) {
    logger.error(`Error completing transfer: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to complete call transfer',
      error: error.message
    });
  }
};

/**
 * Cancel a pending transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelTransfer = async (req, res) => {
  try {
    const { callSid, reason } = req.body;

    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Call SID is required'
      });
    }

    // Retrieve the call log to update
    const callLog = await CallLog.findOne({ where: { callSid } });
    
    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: `Call with SID ${callSid} not found`
      });
    }

    // Only allow canceling transfers that are in-progress
    if (callLog.transferStatus !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transfer with status ${callLog.transferStatus}`
      });
    }

    // Update the transfer status
    await callLog.update({
      transferStatus: 'failed',
      transferMetadata: {
        ...callLog.transferMetadata,
        cancelledAt: new Date(),
        cancelReason: reason || 'Cancelled by request',
        cancelledBy: req.body.cancelledBy || 'system'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Call transfer cancelled',
      transferStatus: 'failed'
    });
  } catch (error) {
    logger.error(`Error cancelling transfer: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel call transfer',
      error: error.message
    });
  }
};

/**
 * Generate TwiML for a transfer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateTransferTwiML = async (req, res) => {
  try {
    const { targetEndpoint, transferType = 'cold', announcement, callerId } = req.body;

    if (!targetEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'Target endpoint is required'
      });
    }

    const options = {
      transferType,
      announcement,
      callerId,
      timeout: req.body.timeout || 30,
      action: req.body.action
    };

    // Generate TwiML for transfer
    const twiml = signalwireService.generateTransferTwiML(
      targetEndpoint,
      options
    );

    return res.status(200).json({
      success: true,
      twiml
    });
  } catch (error) {
    logger.error(`Error generating transfer TwiML: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate transfer TwiML',
      error: error.message
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
    // Find all call logs with in-progress transfers
    const pendingTransfers = await CallLog.findAll({
      where: {
        transferStatus: 'in-progress'
      },
      order: [['transferTime', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count: pendingTransfers.length,
      pendingTransfers
    });
  } catch (error) {
    logger.error(`Error getting pending transfers: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get pending transfers',
      error: error.message
    });
  }
};

/**
 * Get transfer history for a call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransferHistory = async (req, res) => {
  try {
    const { callSid } = req.params;

    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: 'Call SID is required'
      });
    }

    // Get the call log with transfer details
    const callLog = await CallLog.findOne({
      where: { callSid },
      attributes: [
        'id',
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
        message: `Call with SID ${callSid} not found`
      });
    }

    return res.status(200).json({
      success: true,
      transferDetails: {
        callSid: callLog.callSid,
        transferStatus: callLog.transferStatus,
        transferredTo: callLog.transferredTo,
        transferredFrom: callLog.transferredFrom,
        transferTime: callLog.transferTime,
        transferType: callLog.transferType,
        transferMetadata: callLog.transferMetadata
      }
    });
  } catch (error) {
    logger.error(`Error getting transfer history: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get transfer history',
      error: error.message
    });
  }
};

module.exports = {
  initiateTransfer,
  completeTransfer,
  cancelTransfer,
  generateTransferTwiML,
  getPendingTransfers,
  getTransferHistory
};
