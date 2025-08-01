/**
 * Campaign Scheduler Controller
 * Endpoints for managing campaign call scheduling
 */

const campaignSchedulerService = require('../services/campaign-scheduler.service');
const logger = require('../utils/logger');

/**
 * Start a campaign scheduler
 */
exports.startCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { settings } = req.body;
    
    const result = await campaignSchedulerService.startCampaign(campaignId, settings);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error starting campaign scheduler: ${error.message}`);
    
    // Check if campaign not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign scheduler'
    });
  }
};

/**
 * Pause a campaign scheduler
 */
exports.pauseCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = campaignSchedulerService.pauseCampaign(campaignId);
    
    // Check if campaign not found
    if (result.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign scheduler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error pausing campaign scheduler: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign scheduler'
    });
  }
};

/**
 * Resume a campaign scheduler
 */
exports.resumeCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = campaignSchedulerService.resumeCampaign(campaignId);
    
    // Check if campaign not found
    if (result.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign scheduler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error resuming campaign scheduler: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to resume campaign scheduler'
    });
  }
};

/**
 * Stop a campaign scheduler
 */
exports.stopCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { markComplete } = req.body;
    
    const result = await campaignSchedulerService.stopCampaign(campaignId, markComplete);
    
    // Check if campaign not found
    if (result.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign scheduler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error stopping campaign scheduler: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to stop campaign scheduler'
    });
  }
};

/**
 * Get campaign scheduler status
 */
exports.getCampaignStatus = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = campaignSchedulerService.getCampaignStatus(campaignId);
    
    // Check if campaign not found
    if (result.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign scheduler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error getting campaign scheduler status: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign scheduler status'
    });
  }
};

/**
 * Get all active campaign schedulers
 */
exports.getAllActiveCampaigns = async (req, res) => {
  try {
    const result = campaignSchedulerService.getAllActiveCampaigns();
    
    res.status(200).json({
      success: true,
      count: result.length,
      campaigns: result
    });
  } catch (error) {
    logger.error(`Error getting all active campaign schedulers: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get active campaign schedulers'
    });
  }
};

/**
 * Update campaign scheduler settings
 */
exports.updateCampaignSettings = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { settings } = req.body;
    
    const result = campaignSchedulerService.updateCampaignSettings(campaignId, settings);
    
    // Check if campaign not found
    if (result.status === 'not_found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign scheduler not found'
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error updating campaign scheduler settings: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign scheduler settings'
    });
  }
};
