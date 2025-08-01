/**
 * Call Queue Service
 * Manages call queuing, prioritization, and processing
 */

const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const callHandlingService = require('./call-handling.service');

/**
 * Add a call to the queue
 * @param {Object} callData - Call data to add to queue
 * @param {string} callData.toNumber - Destination phone number
 * @param {string} callData.fromNumber - Caller ID to use
 * @param {number} [callData.priority=5] - Priority (1-10, higher is more important)
 * @param {string} [callData.campaignId] - Associated campaign ID
 * @param {number} [callData.contactId] - Associated contact ID
 * @param {string} [callData.voiceAgentId] - Voice agent to use
 * @param {string} [callData.scriptId] - Script to use
 * @param {Object} [callData.metadata] - Additional call metadata
 * @param {Date} [callData.scheduledTime] - When to process this call (null = ASAP)
 * @returns {Promise<Object>} Created queue item
 */
const addToQueue = async (callData) => {
  try {
    logger.info(`Adding call to queue: ${callData.toNumber}`);
    
    // Create queue item
    const queueItem = await db.CallQueue.create({
      toNumber: callData.toNumber,
      fromNumber: callData.fromNumber,
      priority: callData.priority || 5,
      campaignId: callData.campaignId || null,
      contactId: callData.contactId || null,
      voiceAgentId: callData.voiceAgentId || null,
      scriptId: callData.scriptId || null,
      metadata: callData.metadata || {},
      scheduledTime: callData.scheduledTime || null,
      status: 'waiting'
    });
    
    // Update queue positions after adding new item
    await updateQueuePositions();
    
    logger.info(`Call added to queue with ID: ${queueItem.id}`);
    return queueItem;
  } catch (error) {
    logger.error(`Error adding call to queue: ${error.message}`);
    throw error;
  }
};

/**
 * Get next call(s) from the queue to process
 * @param {number} [limit=1] - Number of calls to retrieve
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.campaignId] - Filter by campaign
 * @returns {Promise<Array>} Array of queue items to process
 */
const getNextFromQueue = async (limit = 1, filters = {}) => {
  try {
    // Build where clause
    const whereClause = {
      status: 'waiting'
    };
    
    // Add scheduledTime filter to only get calls that are due
    whereClause[Op.or] = [
      { scheduledTime: null }, // No scheduled time (ASAP)
      { scheduledTime: { [Op.lte]: new Date() } } // Scheduled time has passed
    ];
    
    // Add campaign filter if provided
    if (filters.campaignId) {
      whereClause.campaignId = filters.campaignId;
    }
    
    // Get items ordered by priority (desc) and queue position (asc)
    const queueItems = await db.CallQueue.findAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['queuePosition', 'ASC']
      ],
      limit: limit,
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
    
    return queueItems;
  } catch (error) {
    logger.error(`Error getting next from queue: ${error.message}`);
    throw error;
  }
};

/**
 * Update the status of a queued call
 * @param {number} queueId - Queue item ID
 * @param {string} status - New status
 * @param {Object} [additionalData] - Additional data to update
 * @returns {Promise<Object>} Updated queue item
 */
const updateQueueItemStatus = async (queueId, status, additionalData = {}) => {
  try {
    const queueItem = await db.CallQueue.findByPk(queueId);
    
    if (!queueItem) {
      throw new Error(`Queue item ${queueId} not found`);
    }
    
    // Update item
    await queueItem.update({
      status,
      ...additionalData
    });
    
    logger.info(`Updated queue item ${queueId} status to ${status}`);
    return queueItem;
  } catch (error) {
    logger.error(`Error updating queue item status: ${error.message}`);
    throw error;
  }
};

/**
 * Process the queue (get next calls and initiate them)
 * @param {number} [batchSize=5] - How many calls to process at once
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Object>} Processing results
 */
const processQueue = async (batchSize = 5, filters = {}) => {
  try {
    logger.info(`Processing call queue with batch size: ${batchSize}`);
    
    // Get next batch of calls to process
    const queueItems = await getNextFromQueue(batchSize, filters);
    
    if (queueItems.length === 0) {
      logger.info('No calls in queue to process');
      return { processed: 0, success: 0, failed: 0 };
    }
    
    logger.info(`Found ${queueItems.length} calls to process`);
    
    const results = {
      processed: queueItems.length,
      success: 0,
      failed: 0,
      calls: []
    };
    
    // Process each call
    for (const item of queueItems) {
      try {
        // Update status to processing
        await updateQueueItemStatus(item.id, 'processing', {
          attempts: item.attempts + 1,
          lastAttemptTime: new Date()
        });
        
        // Initiate the call
        const callResult = await callHandlingService.initiateOutboundCall(
          item.toNumber,
          item.fromNumber,
          item.voiceAgentId,
          item.scriptId,
          item.campaignId ? { id: item.campaignId } : {},
          null // phoneNumberId
        );
        
        // Update with call result
        await updateQueueItemStatus(item.id, 'completed', {
          callSid: callResult.callSid
        });
        
        results.success++;
        results.calls.push({
          queueId: item.id,
          callSid: callResult.callSid,
          status: 'success'
        });
      } catch (error) {
        logger.error(`Error processing queue item ${item.id}: ${error.message}`);
        
        // Update with failure
        await updateQueueItemStatus(item.id, 'failed');
        
        results.failed++;
        results.calls.push({
          queueId: item.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    logger.info(`Queue processing complete. Success: ${results.success}, Failed: ${results.failed}`);
    return results;
  } catch (error) {
    logger.error(`Error processing queue: ${error.message}`);
    throw error;
  }
};

/**
 * Cancel a queued call
 * @param {number} queueId - Queue item ID
 * @returns {Promise<Object>} Canceled queue item
 */
const cancelQueuedCall = async (queueId) => {
  try {
    const queueItem = await db.CallQueue.findByPk(queueId);
    
    if (!queueItem) {
      throw new Error(`Queue item ${queueId} not found`);
    }
    
    if (queueItem.status !== 'waiting') {
      throw new Error(`Cannot cancel queue item with status: ${queueItem.status}`);
    }
    
    // Update to canceled
    await queueItem.update({
      status: 'canceled'
    });
    
    logger.info(`Canceled queue item ${queueId}`);
    return queueItem;
  } catch (error) {
    logger.error(`Error canceling queued call: ${error.message}`);
    throw error;
  }
};

/**
 * Update priority for a queued call
 * @param {number} queueId - Queue item ID
 * @param {number} priority - New priority (1-10)
 * @returns {Promise<Object>} Updated queue item
 */
const updateQueueItemPriority = async (queueId, priority) => {
  try {
    const queueItem = await db.CallQueue.findByPk(queueId);
    
    if (!queueItem) {
      throw new Error(`Queue item ${queueId} not found`);
    }
    
    // Validate priority
    if (priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10');
    }
    
    // Update priority
    await queueItem.update({
      priority
    });
    
    // Update queue positions after priority change
    await updateQueuePositions();
    
    logger.info(`Updated queue item ${queueId} priority to ${priority}`);
    return queueItem;
  } catch (error) {
    logger.error(`Error updating queue item priority: ${error.message}`);
    throw error;
  }
};

/**
 * Update queue positions based on priority
 * @returns {Promise<void>}
 */
const updateQueuePositions = async () => {
  try {
    // Get all waiting items ordered by priority
    const queueItems = await db.CallQueue.findAll({
      where: { status: 'waiting' },
      order: [
        ['priority', 'DESC'],
        ['entryTime', 'ASC']
      ]
    });
    
    // Update positions
    for (let i = 0; i < queueItems.length; i++) {
      await queueItems[i].update({
        queuePosition: i + 1
      });
    }
    
    logger.info(`Updated queue positions for ${queueItems.length} items`);
  } catch (error) {
    logger.error(`Error updating queue positions: ${error.message}`);
    throw error;
  }
};

/**
 * Get queue statistics
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Object>} Queue statistics
 */
const getQueueStats = async (filters = {}) => {
  try {
    // Build where clause
    const whereClause = {};
    
    if (filters.campaignId) {
      whereClause.campaignId = filters.campaignId;
    }
    
    // Get total counts by status
    const countsByStatus = await db.CallQueue.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['status']
    });
    
    // Format status counts
    const statusCounts = countsByStatus.reduce((acc, item) => {
      acc[item.status] = parseInt(item.dataValues.count);
      return acc;
    }, {
      waiting: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      canceled: 0
    });
    
    // Get average wait time for completed calls
    const avgWaitTime = await db.sequelize.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - entry_time))) as avg_wait_time 
      FROM call_queues 
      WHERE status = 'completed'
      ${filters.campaignId ? 'AND campaign_id = :campaignId' : ''}`,
      { 
        replacements: filters,
        type: db.sequelize.QueryTypes.SELECT 
      }
    );
    
    return {
      totalInQueue: statusCounts.waiting || 0,
      totalProcessing: statusCounts.processing || 0,
      totalCompleted: statusCounts.completed || 0,
      totalFailed: statusCounts.failed || 0,
      totalCanceled: statusCounts.canceled || 0,
      averageWaitTime: avgWaitTime[0]?.avg_wait_time ? 
        Math.round(parseFloat(avgWaitTime[0].avg_wait_time)) : 0
    };
  } catch (error) {
    logger.error(`Error getting queue stats: ${error.message}`);
    throw error;
  }
};

/**
 * Get queue items with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {number} limit - Max items to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<{rows: Array, count: number}>} Queue items and total count
 */
const getQueueItems = async (filters = {}, limit = 100, offset = 0) => {
  try {
    // Get queue items with pagination
    const result = await db.CallQueue.findAndCountAll({
      where: filters,
      limit,
      offset,
      order: [
        ['priority', 'DESC'],
        ['queuePosition', 'ASC'],
        ['entryTime', 'ASC']
      ],
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
    
    return result;
  } catch (error) {
    logger.error(`Error getting queue items: ${error.message}`);
    throw error;
  }
};

/**
 * Get a queue item by ID
 * @param {number} id - Queue item ID
 * @returns {Promise<Object>} Queue item
 */
const getQueueItemById = async (id) => {
  try {
    const queueItem = await db.CallQueue.findByPk(id, {
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
    
    return queueItem;
  } catch (error) {
    logger.error(`Error getting queue item by ID: ${error.message}`);
    throw error;
  }
};

module.exports = {
  addToQueue,
  getNextFromQueue,
  updateQueueItemStatus,
  processQueue,
  cancelQueuedCall,
  updateQueueItemPriority,
  updateQueuePositions,
  getQueueStats,
  getQueueItems,
  getQueueItemById
};
