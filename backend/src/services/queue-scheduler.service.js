/**
 * Queue Scheduler Service
 * Schedules and manages queue processing for production use with SignalWire
 */

const schedule = require('node-schedule');
const db = require('../models');
const logger = require('../utils/logger');
const callQueueService = require('./call-queue.service');
const config = require('../config');

// Active scheduler jobs
const schedulerJobs = new Map();

// Default settings for call rate limits
const DEFAULT_SETTINGS = {
  // How many calls per minute to process (default: 10)
  callsPerMinute: 10,
  
  // How many calls to process in one batch (default: 5)
  batchSize: 5,
  
  // Minimum interval between batches in seconds (default: 30)
  minIntervalSeconds: 30,
  
  // Whether to process calls during quiet hours (default: false)
  processAfterHours: false,
  
  // Quiet hours start hour (default: 20 = 8 PM)
  quietHoursStart: 20,
  
  // Quiet hours end hour (default: 8 = 8 AM)
  quietHoursEnd: 8,
  
  // Default timezone (default: 'America/New_York')
  timezone: 'America/New_York'
};

/**
 * Check if current time is within quiet hours
 * @param {Object} settings - Settings to use
 * @returns {boolean} True if current time is within quiet hours
 */
const isQuietHours = (settings = DEFAULT_SETTINGS) => {
  const now = new Date();
  const hour = now.getHours();
  
  if (settings.quietHoursStart < settings.quietHoursEnd) {
    // Simple range (e.g., 22-6)
    return hour >= settings.quietHoursStart || hour < settings.quietHoursEnd;
  } else {
    // Overnight range (e.g., 8-22)
    return hour >= settings.quietHoursStart && hour < settings.quietHoursEnd;
  }
};

/**
 * Start queue scheduler for a campaign
 * @param {string} campaignId - Campaign ID to schedule
 * @param {Object} [options] - Scheduler options
 * @returns {Object} Scheduler info
 */
const startCampaignScheduler = async (campaignId, options = {}) => {
  try {
    // Get campaign settings
    const campaign = await db.Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Check if campaign is active
    if (campaign.status !== 'active') {
      throw new Error(`Campaign ${campaignId} is not active`);
    }
    
    // Check if scheduler already exists
    if (schedulerJobs.has(campaignId)) {
      throw new Error(`Scheduler for campaign ${campaignId} already exists`);
    }
    
    // Get settings from campaign or use defaults
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(campaign.callSettings || {}),
      ...options
    };
    
    logger.info(`Starting queue scheduler for campaign ${campaignId} with settings:`, settings);
    
    // Calculate interval based on calls per minute and batch size
    const batchInterval = Math.max(
      60 / (settings.callsPerMinute / settings.batchSize),
      settings.minIntervalSeconds
    );
    
    // Create job to run at the calculated interval
    const job = schedule.scheduleJob(`*/${Math.ceil(batchInterval)} * * * * *`, async () => {
      try {
        // Skip processing during quiet hours unless specified otherwise
        if (!settings.processAfterHours && isQuietHours(settings)) {
          logger.debug(`Skipping queue processing for campaign ${campaignId} during quiet hours`);
          return;
        }
        
        logger.info(`Processing queue for campaign ${campaignId}`);
        
        // Process the queue for this campaign
        const results = await callQueueService.processQueue(settings.batchSize, { campaignId });
        
        // Log results
        logger.info(`Queue processing for campaign ${campaignId} complete:`, results);
        
        // Update campaign stats
        await updateCampaignStats(campaignId, results);
      } catch (error) {
        logger.error(`Error in queue scheduler for campaign ${campaignId}: ${error.message}`);
      }
    });
    
    // Store job in map
    schedulerJobs.set(campaignId, {
      job,
      settings,
      startTime: new Date(),
      campaignId
    });
    
    logger.info(`Queue scheduler started for campaign ${campaignId}`);
    
    return {
      campaignId,
      status: 'started',
      settings,
      nextRun: job.nextInvocation()
    };
  } catch (error) {
    logger.error(`Error starting queue scheduler: ${error.message}`);
    throw error;
  }
};

/**
 * Stop queue scheduler for a campaign
 * @param {string} campaignId - Campaign ID to stop scheduler for
 * @returns {Object} Result
 */
const stopCampaignScheduler = (campaignId) => {
  try {
    // Check if scheduler exists
    if (!schedulerJobs.has(campaignId)) {
      throw new Error(`No active scheduler for campaign ${campaignId}`);
    }
    
    // Get job
    const { job } = schedulerJobs.get(campaignId);
    
    // Cancel job
    job.cancel();
    
    // Remove from map
    schedulerJobs.delete(campaignId);
    
    logger.info(`Queue scheduler stopped for campaign ${campaignId}`);
    
    return {
      campaignId,
      status: 'stopped'
    };
  } catch (error) {
    logger.error(`Error stopping queue scheduler: ${error.message}`);
    throw error;
  }
};

/**
 * Get status of all queue schedulers
 * @returns {Array} Array of scheduler statuses
 */
const getSchedulerStatuses = () => {
  const statuses = [];
  
  for (const [campaignId, data] of schedulerJobs.entries()) {
    statuses.push({
      campaignId,
      settings: data.settings,
      startTime: data.startTime,
      nextRun: data.job.nextInvocation(),
      running: true
    });
  }
  
  return statuses;
};

/**
 * Update campaign statistics based on queue processing results
 * @param {string} campaignId - Campaign ID
 * @param {Object} results - Queue processing results
 * @returns {Promise<void>}
 */
const updateCampaignStats = async (campaignId, results) => {
  try {
    // Get campaign
    const campaign = await db.Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Get current stats or initialize
    const stats = campaign.stats || {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0
    };
    
    // Update stats based on results
    stats.total = stats.total + results.processed;
    stats.completed = stats.completed + results.success;
    stats.failed = stats.failed + results.failed;
    
    // Update campaign
    await campaign.update({
      stats
    });
  } catch (error) {
    logger.error(`Error updating campaign stats: ${error.message}`);
  }
};

/**
 * Initialize default schedulers based on active campaigns
 * Should be called at application startup
 * @returns {Promise<Array>} Started schedulers
 */
const initializeDefaultSchedulers = async () => {
  try {
    logger.info('Initializing default queue schedulers');
    
    // Find all active campaigns
    const activeCampaigns = await db.Campaign.findAll({
      where: {
        status: 'active'
      }
    });
    
    logger.info(`Found ${activeCampaigns.length} active campaigns for scheduling`);
    
    // Start schedulers for each
    const results = [];
    
    for (const campaign of activeCampaigns) {
      try {
        const result = await startCampaignScheduler(campaign.id);
        results.push(result);
      } catch (error) {
        logger.error(`Error starting scheduler for campaign ${campaign.id}: ${error.message}`);
        results.push({
          campaignId: campaign.id,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Error initializing default schedulers: ${error.message}`);
    throw error;
  }
};

/**
 * Process global queue (not tied to specific campaigns)
 * @param {Object} [options] - Processing options
 * @returns {Promise<Object>} Processing results
 */
const processGlobalQueue = async (options = {}) => {
  try {
    const settings = {
      ...DEFAULT_SETTINGS,
      ...options
    };
    
    // Skip processing during quiet hours unless specified otherwise
    if (!settings.processAfterHours && isQuietHours(settings)) {
      logger.debug('Skipping global queue processing during quiet hours');
      return { skipped: true, reason: 'quiet hours' };
    }
    
    logger.info('Processing global queue');
    
    // Process the queue without campaign filter
    const results = await callQueueService.processQueue(settings.batchSize, {});
    
    logger.info('Global queue processing complete:', results);
    
    return results;
  } catch (error) {
    logger.error(`Error processing global queue: ${error.message}`);
    throw error;
  }
};

/**
 * Start global queue scheduler
 * @param {Object} [options] - Scheduler options
 * @returns {Object} Scheduler info
 */
const startGlobalScheduler = async (options = {}) => {
  try {
    // Check if scheduler already exists
    if (schedulerJobs.has('global')) {
      throw new Error('Global queue scheduler already exists');
    }
    
    const settings = {
      ...DEFAULT_SETTINGS,
      ...options
    };
    
    logger.info('Starting global queue scheduler with settings:', settings);
    
    // Calculate interval based on calls per minute and batch size
    const batchInterval = Math.max(
      60 / (settings.callsPerMinute / settings.batchSize),
      settings.minIntervalSeconds
    );
    
    // Create job to run at the calculated interval
    const job = schedule.scheduleJob(`*/${Math.ceil(batchInterval)} * * * * *`, async () => {
      try {
        await processGlobalQueue(settings);
      } catch (error) {
        logger.error(`Error in global queue scheduler: ${error.message}`);
      }
    });
    
    // Store job in map
    schedulerJobs.set('global', {
      job,
      settings,
      startTime: new Date()
    });
    
    logger.info('Global queue scheduler started');
    
    return {
      name: 'global',
      status: 'started',
      settings,
      nextRun: job.nextInvocation()
    };
  } catch (error) {
    logger.error(`Error starting global queue scheduler: ${error.message}`);
    throw error;
  }
};

/**
 * Stop global queue scheduler
 * @returns {Object} Result
 */
const stopGlobalScheduler = () => {
  try {
    // Check if scheduler exists
    if (!schedulerJobs.has('global')) {
      throw new Error('No active global queue scheduler');
    }
    
    // Get job
    const { job } = schedulerJobs.get('global');
    
    // Cancel job
    job.cancel();
    
    // Remove from map
    schedulerJobs.delete('global');
    
    logger.info('Global queue scheduler stopped');
    
    return {
      name: 'global',
      status: 'stopped'
    };
  } catch (error) {
    logger.error(`Error stopping global queue scheduler: ${error.message}`);
    throw error;
  }
};

module.exports = {
  startCampaignScheduler,
  stopCampaignScheduler,
  startGlobalScheduler,
  stopGlobalScheduler,
  getSchedulerStatuses,
  processGlobalQueue,
  initializeDefaultSchedulers
};
