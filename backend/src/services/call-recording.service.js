/**
 * Call Recording Service
 * Handles recording, storage, and retrieval of call recordings
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const logger = require('../utils/logger');
const signalwireService = require('./signalwire.service');
const config = require('../config');

// Local storage path for recordings (should use cloud storage in production)
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(__dirname, '../../recordings');

// Ensure recordings directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  logger.info(`Created recordings directory: ${RECORDINGS_DIR}`);
}

/**
 * Start recording a call
 * @param {string} callSid - SignalWire Call SID
 * @param {Object} options - Recording options
 * @param {boolean} [options.dual=false] - Whether to record both sides separately
 * @param {number} [options.maxDuration=3600] - Max recording duration in seconds
 * @param {boolean} [options.transcribe=false] - Whether to transcribe the recording
 * @returns {Promise<Object>} Recording details
 */
const startCallRecording = async (callSid, options = {}) => {
  try {
    logger.info(`Starting recording for call: ${callSid}`);
    
    // Set default options
    const recordingOptions = {
      dual: options.dual || false,
      maxDuration: options.maxDuration || 3600, // 1 hour default
      transcribe: options.transcribe || false
    };
    
    // Call SignalWire API to start recording
    const recording = await signalwireService.startRecording(callSid, recordingOptions);
    
    // Create recording record in database
    const callRecording = await db.CallRecording.create({
      recordingSid: recording.sid,
      callSid,
      status: 'in-progress',
      startTime: new Date(),
      format: recording.format || 'mp3',
      channels: recordingOptions.dual ? 2 : 1,
      metadata: {
        options: recordingOptions,
        signalwireData: recording
      }
    });
    
    logger.info(`Recording started: ${recording.sid} for call: ${callSid}`);
    
    return {
      recordingId: callRecording.id,
      recordingSid: recording.sid,
      callSid,
      status: 'in-progress'
    };
  } catch (error) {
    logger.error(`Error starting call recording: ${error.message}`);
    throw error;
  }
};

/**
 * Stop an active call recording
 * @param {string} callSid - Call SID to stop recording
 * @returns {Promise<Object>} Updated recording details
 */
const stopCallRecording = async (callSid) => {
  try {
    logger.info(`Stopping recording for call: ${callSid}`);
    
    // Find active recording for this call
    const callRecording = await db.CallRecording.findOne({
      where: {
        callSid,
        status: 'in-progress'
      }
    });
    
    if (!callRecording) {
      throw new Error(`No active recording found for call: ${callSid}`);
    }
    
    // Stop recording via SignalWire API
    const result = await signalwireService.stopRecording(callSid, callRecording.recordingSid);
    
    // Update recording record
    await callRecording.update({
      status: 'completed',
      endTime: new Date(),
      duration: (new Date() - callRecording.startTime) / 1000 // duration in seconds
    });
    
    logger.info(`Recording stopped: ${callRecording.recordingSid} for call: ${callSid}`);
    
    return {
      recordingId: callRecording.id,
      recordingSid: callRecording.recordingSid,
      callSid,
      status: 'completed'
    };
  } catch (error) {
    logger.error(`Error stopping call recording: ${error.message}`);
    throw error;
  }
};

/**
 * Handle recording status webhook from SignalWire
 * @param {Object} webhookData - Recording status webhook data
 * @returns {Promise<Object>} Updated recording info
 */
const handleRecordingStatusWebhook = async (webhookData) => {
  try {
    const { RecordingSid, CallSid, RecordingStatus, RecordingDuration, RecordingUrl } = webhookData;
    
    logger.info(`Recording status update for ${RecordingSid}: ${RecordingStatus}`);
    
    // Find the recording in our database
    const callRecording = await db.CallRecording.findOne({
      where: { recordingSid: RecordingSid }
    });
    
    if (!callRecording) {
      logger.warn(`Recording not found in database: ${RecordingSid}`);
      return { error: 'Recording not found' };
    }
    
    // Update recording with latest status
    const updateData = {
      status: RecordingStatus.toLowerCase(),
      url: RecordingUrl || callRecording.url
    };
    
    // Add duration and end time if completed
    if (RecordingStatus.toLowerCase() === 'completed') {
      updateData.endTime = new Date();
      updateData.duration = RecordingDuration || 
        ((updateData.endTime - callRecording.startTime) / 1000);
    }
    
    await callRecording.update(updateData);
    
    // If completed, download the recording
    if (RecordingStatus.toLowerCase() === 'completed' && RecordingUrl) {
      await downloadRecording(callRecording.id, RecordingUrl);
    }
    
    return {
      recordingId: callRecording.id,
      recordingSid: RecordingSid,
      callSid: CallSid,
      status: RecordingStatus.toLowerCase()
    };
  } catch (error) {
    logger.error(`Error handling recording status webhook: ${error.message}`);
    throw error;
  }
};

/**
 * Download a recording from SignalWire to local storage
 * @param {number} recordingId - Database recording ID
 * @param {string} url - URL to download from
 * @returns {Promise<Object>} Download result
 */
const downloadRecording = async (recordingId, url) => {
  try {
    // Find recording
    const callRecording = await db.CallRecording.findByPk(recordingId);
    if (!callRecording) {
      throw new Error(`Recording ${recordingId} not found`);
    }
    
    // Generate filename with UUID to avoid collisions
    const filename = `${callRecording.callSid}-${uuidv4()}.${callRecording.format || 'mp3'}`;
    const filePath = path.join(RECORDINGS_DIR, filename);
    
    logger.info(`Downloading recording ${callRecording.recordingSid} to ${filePath}`);
    
    // Download file (using SignalWire service or direct HTTP request)
    await signalwireService.downloadRecording(url, filePath);
    
    // Update recording with local file path
    await callRecording.update({
      localFilePath: filePath,
      downloadStatus: 'completed'
    });
    
    logger.info(`Recording downloaded: ${callRecording.recordingSid}`);
    
    return {
      recordingId,
      filePath,
      status: 'downloaded'
    };
  } catch (error) {
    logger.error(`Error downloading recording: ${error.message}`);
    
    // Update recording with error status
    if (recordingId) {
      try {
        await db.CallRecording.update(
          {
            downloadStatus: 'failed',
            metadata: { 
              ...callRecording.metadata,
              downloadError: error.message 
            }
          },
          { where: { id: recordingId } }
        );
      } catch (updateError) {
        logger.error(`Error updating recording status: ${updateError.message}`);
      }
    }
    
    throw error;
  }
};

/**
 * Get recording details by ID
 * @param {number} recordingId - Recording ID
 * @returns {Promise<Object>} Recording details
 */
const getRecordingById = async (recordingId) => {
  try {
    const recording = await db.CallRecording.findByPk(recordingId, {
      include: [
        {
          model: db.CallLog,
          as: 'callLog',
          attributes: ['id', 'direction', 'from', 'to', 'status']
        }
      ]
    });
    
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }
    
    return recording;
  } catch (error) {
    logger.error(`Error getting recording by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Get recordings for a specific call
 * @param {string} callSid - Call SID
 * @returns {Promise<Array>} Array of recording objects
 */
const getRecordingsForCall = async (callSid) => {
  try {
    const recordings = await db.CallRecording.findAll({
      where: { callSid },
      order: [['startTime', 'DESC']]
    });
    
    return recordings;
  } catch (error) {
    logger.error(`Error getting recordings for call: ${error.message}`);
    throw error;
  }
};

/**
 * List recordings with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {number} limit - Max number of records
 * @param {number} offset - Pagination offset
 * @returns {Promise<{rows: Array, count: number}>} Recordings and count
 */
const listRecordings = async (filters = {}, limit = 50, offset = 0) => {
  try {
    const result = await db.CallRecording.findAndCountAll({
      where: filters,
      limit,
      offset,
      order: [['startTime', 'DESC']],
      include: [
        {
          model: db.CallLog,
          as: 'callLog',
          attributes: ['id', 'direction', 'from', 'to', 'status']
        }
      ]
    });
    
    return result;
  } catch (error) {
    logger.error(`Error listing recordings: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a recording (both database record and file)
 * @param {number} recordingId - Recording ID
 * @returns {Promise<boolean>} Success status
 */
const deleteRecording = async (recordingId) => {
  try {
    // Get recording
    const recording = await db.CallRecording.findByPk(recordingId);
    
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }
    
    // Delete file if it exists locally
    if (recording.localFilePath && fs.existsSync(recording.localFilePath)) {
      fs.unlinkSync(recording.localFilePath);
      logger.info(`Deleted recording file: ${recording.localFilePath}`);
    }
    
    // Delete from database
    await recording.destroy();
    
    logger.info(`Recording ${recordingId} deleted`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting recording: ${error.message}`);
    throw error;
  }
};

/**
 * Get recording statistics
 * @param {Object} filters - Filter criteria (e.g., date range)
 * @returns {Promise<Object>} Recording statistics
 */
const getRecordingStats = async (filters = {}) => {
  try {
    // Total recordings
    const totalRecordings = await db.CallRecording.count({
      where: filters
    });
    
    // Total duration (in seconds)
    const durationResult = await db.sequelize.query(
      `SELECT SUM(duration) as totalDuration FROM call_recordings
       WHERE duration IS NOT NULL
       ${filters.startTime ? 'AND start_time >= :startTime' : ''}
       ${filters.endTime ? 'AND start_time <= :endTime' : ''}`,
      {
        replacements: filters,
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Average duration
    const avgDurationResult = await db.sequelize.query(
      `SELECT AVG(duration) as avgDuration FROM call_recordings
       WHERE duration IS NOT NULL
       ${filters.startTime ? 'AND start_time >= :startTime' : ''}
       ${filters.endTime ? 'AND start_time <= :endTime' : ''}`,
      {
        replacements: filters,
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Recordings by status
    const recordingsByStatus = await db.CallRecording.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: filters,
      group: ['status']
    });
    
    // Format status counts
    const statusCounts = recordingsByStatus.reduce((acc, item) => {
      acc[item.status] = parseInt(item.dataValues.count);
      return acc;
    }, {
      'in-progress': 0,
      completed: 0,
      failed: 0
    });
    
    return {
      totalRecordings,
      totalDuration: durationResult[0]?.totalDuration ? 
        parseFloat(durationResult[0].totalDuration) : 0,
      averageDuration: avgDurationResult[0]?.avgDuration ? 
        parseFloat(avgDurationResult[0].avgDuration) : 0,
      statusCounts
    };
  } catch (error) {
    logger.error(`Error getting recording stats: ${error.message}`);
    throw error;
  }
};

module.exports = {
  startCallRecording,
  stopCallRecording,
  handleRecordingStatusWebhook,
  downloadRecording,
  getRecordingById,
  getRecordingsForCall,
  listRecordings,
  deleteRecording,
  getRecordingStats
};
