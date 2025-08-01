/**
 * Call Recording Controller
 * Handles API endpoints for managing call recordings
 */

const callRecordingService = require('../services/call-recording.service');
const logger = require('../utils/logger');

/**
 * Start recording a call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startRecording = async (req, res) => {
  try {
    const { callSid } = req.params;
    const options = req.body || {};
    
    // Start the recording
    const result = await callRecordingService.startCallRecording(callSid, options);
    
    res.status(200).json({
      success: true,
      message: `Recording started for call ${callSid}`,
      data: result
    });
  } catch (error) {
    logger.error(`Error starting recording: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Stop recording a call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const stopRecording = async (req, res) => {
  try {
    const { callSid } = req.params;
    
    // Stop the recording
    const result = await callRecordingService.stopCallRecording(callSid);
    
    res.status(200).json({
      success: true,
      message: `Recording stopped for call ${callSid}`,
      data: result
    });
  } catch (error) {
    logger.error(`Error stopping recording: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Handle recording status webhook from SignalWire
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleRecordingWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Process webhook data
    await callRecordingService.handleRecordingStatusWebhook(webhookData);
    
    // Return success to SignalWire
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Error handling recording webhook: ${error.message}`);
    
    // Still return 200 to SignalWire to acknowledge receipt
    res.status(200).send('Error processing webhook');
  }
};

/**
 * Get a specific recording by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recording
    const recording = await callRecordingService.getRecordingById(id);
    
    if (!recording) {
      return res.status(404).json({
        success: false,
        message: `Recording ${id} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: recording
    });
  } catch (error) {
    logger.error(`Error getting recording: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all recordings for a specific call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecordingsForCall = async (req, res) => {
  try {
    const { callSid } = req.params;
    
    // Get recordings
    const recordings = await callRecordingService.getRecordingsForCall(callSid);
    
    res.status(200).json({
      success: true,
      data: recordings
    });
  } catch (error) {
    logger.error(`Error getting recordings for call: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * List recordings with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listRecordings = async (req, res) => {
  try {
    // Extract query parameters
    const { page = 1, limit = 50, ...filters } = req.query;
    const offset = (page - 1) * limit;
    
    // Get recordings
    const result = await callRecordingService.listRecordings(filters, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        recordings: result.rows,
        total: result.count,
        page: parseInt(page),
        pages: Math.ceil(result.count / limit)
      }
    });
  } catch (error) {
    logger.error(`Error listing recordings: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a recording
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete recording
    const result = await callRecordingService.deleteRecording(id);
    
    res.status(200).json({
      success: true,
      message: `Recording ${id} deleted`,
      data: result
    });
  } catch (error) {
    logger.error(`Error deleting recording: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get recording statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecordingStats = async (req, res) => {
  try {
    // Extract filters from query params
    const { startTime, endTime, ...filters } = req.query;
    
    // Add date filters if provided
    const dateFilters = {};
    if (startTime) dateFilters.startTime = new Date(startTime);
    if (endTime) dateFilters.endTime = new Date(endTime);
    
    // Get stats
    const stats = await callRecordingService.getRecordingStats({
      ...filters,
      ...dateFilters
    });
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error getting recording stats: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  startRecording,
  stopRecording,
  handleRecordingWebhook,
  getRecording,
  getRecordingsForCall,
  listRecordings,
  deleteRecording,
  getRecordingStats
};
