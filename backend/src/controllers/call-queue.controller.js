/**
 * Call Queue Controller
 * Handles API endpoints for call queue management
 */

const callQueueService = require('../services/call-queue.service');
const logger = require('../utils/logger');

/**
 * Add a call to the queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addToQueue = async (req, res) => {
  try {
    const callData = req.body;
    
    // Validate required fields
    if (!callData.toNumber || !callData.fromNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: toNumber and fromNumber are required'
      });
    }
    
    // Add to queue
    const queueItem = await callQueueService.addToQueue(callData);
    
    return res.status(201).json({
      success: true,
      message: 'Call added to queue successfully',
      data: queueItem
    });
  } catch (error) {
    logger.error(`Error adding call to queue: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to add call to queue: ${error.message}`
    });
  }
};

/**
 * Get call queue items with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueItems = async (req, res) => {
  try {
    const { status, campaignId, limit = 100, offset = 0 } = req.query;
    
    // Build filters
    const filters = {};
    if (status) filters.status = status;
    if (campaignId) filters.campaignId = campaignId;
    
    // Get queue items with pagination
    const { rows, count } = await callQueueService.getQueueItems(
      filters,
      parseInt(limit),
      parseInt(offset)
    );
    
    return res.json({
      success: true,
      total: count,
      data: rows
    });
  } catch (error) {
    logger.error(`Error getting queue items: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to get queue items: ${error.message}`
    });
  }
};

/**
 * Get a single queue item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get queue item
    const queueItem = await callQueueService.getQueueItemById(id);
    
    if (!queueItem) {
      return res.status(404).json({
        success: false,
        message: `Queue item with ID ${id} not found`
      });
    }
    
    return res.json({
      success: true,
      data: queueItem
    });
  } catch (error) {
    logger.error(`Error getting queue item: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to get queue item: ${error.message}`
    });
  }
};

/**
 * Update queue item priority
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    
    // Validate priority
    if (priority === undefined || priority < 1 || priority > 10) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be between 1 and 10'
      });
    }
    
    // Update priority
    const updatedItem = await callQueueService.updateQueueItemPriority(id, priority);
    
    return res.json({
      success: true,
      message: 'Queue item priority updated successfully',
      data: updatedItem
    });
  } catch (error) {
    logger.error(`Error updating queue item priority: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to update queue item priority: ${error.message}`
    });
  }
};

/**
 * Cancel a queued call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelQueuedCall = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cancel call
    const canceledItem = await callQueueService.cancelQueuedCall(id);
    
    return res.json({
      success: true,
      message: 'Queued call canceled successfully',
      data: canceledItem
    });
  } catch (error) {
    logger.error(`Error canceling queued call: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to cancel queued call: ${error.message}`
    });
  }
};

/**
 * Process the call queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processQueue = async (req, res) => {
  try {
    const { batchSize = 5, campaignId } = req.body;
    
    // Build filters
    const filters = {};
    if (campaignId) filters.campaignId = campaignId;
    
    // Process queue
    const results = await callQueueService.processQueue(
      parseInt(batchSize),
      filters
    );
    
    return res.json({
      success: true,
      message: `Processed ${results.processed} calls from the queue`,
      data: results
    });
  } catch (error) {
    logger.error(`Error processing queue: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to process queue: ${error.message}`
    });
  }
};

/**
 * Get queue statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQueueStats = async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    // Build filters
    const filters = {};
    if (campaignId) filters.campaignId = campaignId;
    
    // Get stats
    const stats = await callQueueService.getQueueStats(filters);
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error getting queue stats: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to get queue statistics: ${error.message}`
    });
  }
};

module.exports = {
  addToQueue,
  getQueueItems,
  getQueueItem,
  updatePriority,
  cancelQueuedCall,
  processQueue,
  getQueueStats
};
