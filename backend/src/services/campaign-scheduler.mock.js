/**
 * Mock Campaign Scheduler Service
 * For use with integration tests in mock mode
 */

const logger = require('../utils/logger');

// In-memory storage for campaign state
const campaigns = new Map();

/**
 * Start a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - Campaign settings
 * @returns {Object} Result
 */
const startCampaign = async (campaignId, settings) => {
  logger.info(`[MOCK] Starting campaign ${campaignId} with settings:`, settings);
  
  campaigns.set(campaignId, {
    id: campaignId,
    status: 'active',
    isRunning: true,
    isPaused: false,
    settings: settings || {
      batchSize: 10,
      batchDelayMs: 5000,
      callDelayMs: 2000,
      maxConcurrentCalls: 5
    },
    startTime: Date.now(),
    stats: {
      totalContacts: 100,
      processedContacts: 0,
      successfulCalls: 0,
      failedCalls: 0
    }
  });
  
  return {
    status: 'started',
    campaignId,
    timestamp: Date.now()
  };
};

/**
 * Pause a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Result
 */
const pauseCampaign = (campaignId) => {
  logger.info(`[MOCK] Pausing campaign ${campaignId}`);
  
  if (!campaigns.has(campaignId)) {
    return {
      status: 'not_found',
      campaignId,
      timestamp: Date.now()
    };
  }
  
  const campaign = campaigns.get(campaignId);
  campaign.isPaused = true;
  
  return {
    status: 'paused',
    campaignId,
    timestamp: Date.now()
  };
};

/**
 * Resume a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Result
 */
const resumeCampaign = (campaignId) => {
  logger.info(`[MOCK] Resuming campaign ${campaignId}`);
  
  if (!campaigns.has(campaignId)) {
    return {
      status: 'not_found',
      campaignId,
      timestamp: Date.now()
    };
  }
  
  const campaign = campaigns.get(campaignId);
  campaign.isPaused = false;
  
  return {
    status: 'resumed',
    campaignId,
    timestamp: Date.now()
  };
};

/**
 * Stop a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Result
 */
const stopCampaign = async (campaignId) => {
  logger.info(`[MOCK] Stopping campaign ${campaignId}`);
  
  if (!campaigns.has(campaignId)) {
    return {
      status: 'not_found',
      campaignId,
      timestamp: Date.now()
    };
  }
  
  const campaign = campaigns.get(campaignId);
  campaign.isRunning = false;
  campaign.status = 'completed';
  
  return {
    status: 'stopped',
    campaignId,
    timestamp: Date.now()
  };
};

/**
 * Get campaign status
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Campaign status
 */
const getCampaignStatus = (campaignId) => {
  logger.info(`[MOCK] Getting status for campaign ${campaignId}`);
  
  if (!campaigns.has(campaignId)) {
    return {
      status: 'not_found',
      campaignId,
      timestamp: Date.now()
    };
  }
  
  const campaign = campaigns.get(campaignId);
  
  return {
    isRunning: campaign.isRunning,
    isPaused: campaign.isPaused,
    status: campaign.status,
    campaignId,
    settings: campaign.settings,
    stats: campaign.stats,
    startTime: campaign.startTime,
    timestamp: Date.now()
  };
};

/**
 * Update campaign settings
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - New settings
 * @returns {Object} Result
 */
const updateCampaignSettings = (campaignId, settings) => {
  logger.info(`[MOCK] Updating settings for campaign ${campaignId}:`, settings);
  
  if (!campaigns.has(campaignId)) {
    return {
      status: 'not_found',
      campaignId,
      timestamp: Date.now()
    };
  }
  
  const campaign = campaigns.get(campaignId);
  campaign.settings = { ...campaign.settings, ...settings };
  
  return {
    status: 'updated',
    campaignId,
    timestamp: Date.now()
  };
};

/**
 * Get active campaigns
 * @returns {Array} List of active campaigns
 */
const getActiveCampaigns = () => {
  logger.info(`[MOCK] Getting active campaigns`);
  
  const activeCampaigns = [];
  
  for (const [id, campaign] of campaigns.entries()) {
    if (campaign.isRunning) {
      activeCampaigns.push({
        id,
        isPaused: campaign.isPaused,
        settings: campaign.settings,
        stats: campaign.stats
      });
    }
  }
  
  return activeCampaigns;
};

module.exports = {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  getCampaignStatus,
  updateCampaignSettings,
  getActiveCampaigns
};
