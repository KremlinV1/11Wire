/**
 * Queue Scheduler Controller
 * Handles API endpoints for managing call queue schedulers
 */

const queueSchedulerService = require('../services/queue-scheduler.service');
const logger = require('../utils/logger');

/**
 * Start a campaign queue scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startCampaignScheduler = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const options = req.body || {};
    
    // Start scheduler
    const result = await queueSchedulerService.startCampaignScheduler(campaignId, options);
    
    res.status(200).json({
      success: true,
      message: `Queue scheduler started for campaign ${campaignId}`,
      data: result
    });
  } catch (error) {
    logger.error(`Error starting campaign scheduler: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Stop a campaign queue scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const stopCampaignScheduler = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Stop scheduler
    const result = queueSchedulerService.stopCampaignScheduler(campaignId);
    
    res.status(200).json({
      success: true,
      message: `Queue scheduler stopped for campaign ${campaignId}`,
      data: result
    });
  } catch (error) {
    logger.error(`Error stopping campaign scheduler: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Start the global queue scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startGlobalScheduler = async (req, res) => {
  try {
    const options = req.body || {};
    
    // Start scheduler
    const result = await queueSchedulerService.startGlobalScheduler(options);
    
    res.status(200).json({
      success: true,
      message: 'Global queue scheduler started',
      data: result
    });
  } catch (error) {
    logger.error(`Error starting global scheduler: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Stop the global queue scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const stopGlobalScheduler = async (req, res) => {
  try {
    // Stop scheduler
    const result = queueSchedulerService.stopGlobalScheduler();
    
    res.status(200).json({
      success: true,
      message: 'Global queue scheduler stopped',
      data: result
    });
  } catch (error) {
    logger.error(`Error stopping global scheduler: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Process the queue manually for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processQueueForCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const options = req.body || {};
    
    // Default batch size
    const batchSize = options.batchSize || 5;
    
    // Process queue
    const result = await queueSchedulerService.processQueue(batchSize, { campaignId });
    
    res.status(200).json({
      success: true,
      message: `Queue processed for campaign ${campaignId}`,
      data: result
    });
  } catch (error) {
    logger.error(`Error processing queue for campaign: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Process the global queue manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processGlobalQueue = async (req, res) => {
  try {
    const options = req.body || {};
    
    // Process queue
    const result = await queueSchedulerService.processGlobalQueue(options);
    
    res.status(200).json({
      success: true,
      message: 'Global queue processed',
      data: result
    });
  } catch (error) {
    logger.error(`Error processing global queue: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get status of all active schedulers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSchedulerStatuses = async (req, res) => {
  try {
    // Get statuses
    const statuses = queueSchedulerService.getSchedulerStatuses();
    
    res.status(200).json({
      success: true,
      data: statuses
    });
  } catch (error) {
    logger.error(`Error getting scheduler statuses: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  startCampaignScheduler,
  stopCampaignScheduler,
  startGlobalScheduler,
  stopGlobalScheduler,
  processQueueForCampaign,
  processGlobalQueue,
  getSchedulerStatuses
};
