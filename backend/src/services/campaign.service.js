/**
 * Campaign Service
 * Handles business logic for campaign management
 */
const logger = require('../utils/logger');
const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get all campaigns with optional filtering
 */
const getAllCampaigns = async (filters = {}) => {
  try {
    const { status } = filters;
    
    // Build query options
    const queryOptions = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      queryOptions.where = {
        status: status
      };
    }
    
    // Get campaigns from database
    const campaigns = await db.Campaign.findAll(queryOptions);
    
    // Convert to plain objects for API response
    return campaigns.map(campaign => campaign.toJSON());
  } catch (error) {
    logger.error(`Error in campaign service - getAllCampaigns: ${error.message}`);
    throw error;
  }
};

/**
 * Get a campaign by ID
 */
const getCampaignById = async (id) => {
  try {
    const campaign = await db.Campaign.findByPk(id);
    return campaign ? campaign.toJSON() : null;
  } catch (error) {
    logger.error(`Error in campaign service - getCampaignById: ${error.message}`);
    throw error;
  }
};

/**
 * Create a new campaign
 */
const createCampaign = async (campaignData) => {
  try {
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      contactsId, 
      voiceAgentId, 
      scriptId, 
      settings 
    } = campaignData;
    
    // Validate required fields
    if (!name || !startDate || !endDate || !contactsId || !voiceAgentId || !scriptId) {
      throw new Error('Missing required fields');
    }
    
    // Create campaign in database
    const campaign = await db.Campaign.create({
      id: `camp-${Date.now()}`,
      name,
      description,
      status: 'active', // Default status
      startDate,
      endDate,
      contactsId,
      voiceAgentId,
      scriptId,
      settings: settings || {
        callsPerDay: 50,
        retryCount: 2,
        callHoursStart: '09:00',
        callHoursEnd: '17:00'
      },
      stats: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    });
    
    return campaign.toJSON();
  } catch (error) {
    logger.error(`Error in campaign service - createCampaign: ${error.message}`);
    throw error;
  }
};

/**
 * Update a campaign
 */
const updateCampaign = async (id, updatedFields) => {
  try {
    // Find campaign
    const campaign = await db.Campaign.findByPk(id);
    if (!campaign) {
      return null;
    }
    
    // Remove non-updatable fields
    const sanitizedFields = { ...updatedFields };
    delete sanitizedFields.id; // Don't allow changing the ID
    
    // Update campaign
    await campaign.update(sanitizedFields);
    await campaign.reload();
    
    return campaign.toJSON();
  } catch (error) {
    logger.error(`Error in campaign service - updateCampaign: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a campaign
 */
const deleteCampaign = async (id) => {
  try {
    // Find campaign
    const campaign = await db.Campaign.findByPk(id);
    if (!campaign) {
      return false;
    }
    
    // Delete campaign
    await campaign.destroy();
    return true;
  } catch (error) {
    logger.error(`Error in campaign service - deleteCampaign: ${error.message}`);
    throw error;
  }
};

/**
 * Update campaign status
 */
const updateCampaignStatus = async (id, status) => {
  try {
    // Validate status
    const validStatuses = ['active', 'paused', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    // Find campaign
    const campaign = await db.Campaign.findByPk(id);
    if (!campaign) {
      return null;
    }
    
    // Update status
    await campaign.update({ status });
    await campaign.reload();
    
    return campaign.toJSON();
  } catch (error) {
    logger.error(`Error in campaign service - updateCampaignStatus: ${error.message}`);
    throw error;
  }
};

/**
 * Get campaign statistics
 */
const getCampaignStats = async () => {
  try {
    // Get counts by status
    const total = await db.Campaign.count();
    const active = await db.Campaign.count({ where: { status: 'active' } });
    const paused = await db.Campaign.count({ where: { status: 'paused' } });
    const completed = await db.Campaign.count({ where: { status: 'completed' } });
    const failed = await db.Campaign.count({ where: { status: 'failed' } });
    
    // Get all campaigns to aggregate call stats
    const campaigns = await db.Campaign.findAll();
    
    // Aggregate call stats
    const calls = {
      total: campaigns.reduce((acc, c) => acc + (c.stats?.total || 0), 0),
      completed: campaigns.reduce((acc, c) => acc + (c.stats?.completed || 0), 0),
      failed: campaigns.reduce((acc, c) => acc + (c.stats?.failed || 0), 0),
      inProgress: campaigns.reduce((acc, c) => acc + (c.stats?.inProgress || 0), 0)
    };
    
    return {
      total,
      active,
      paused,
      completed,
      failed,
      calls
    };
  } catch (error) {
    logger.error(`Error in campaign service - getCampaignStats: ${error.message}`);
    throw error;
  }
};

/**
 * Process campaign (schedule calls and track progress)
 * This would be triggered by a scheduler in a real application
 */
const processCampaign = async (id) => {
  try {
    // Find campaign
    const campaign = await db.Campaign.findByPk(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status !== 'active') {
      logger.info(`Campaign ${id} is not active, skipping processing`);
      return false;
    }
    
    // Check if campaign is within scheduled dates
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    
    if (now < startDate) {
      logger.info(`Campaign ${id} is scheduled for future start date: ${campaign.startDate}`);
      return false;
    }
    
    if (now > endDate) {
      // Auto-complete campaign
      await campaign.update({ status: 'completed' });
      logger.info(`Campaign ${id} marked as completed due to end date reached`);
      return false;
    }
    
    // Logic to schedule calls would go here, utilizing ElevenLabs API
    // and SignalWire to make the actual calls
    
    // Update campaign stats (this is a placeholder for the actual call scheduling logic)
    const currentStats = campaign.stats || { total: 0, completed: 0, failed: 0, inProgress: 0 };
    const updatedStats = {
      ...currentStats,
      total: currentStats.total + 10, // Simulating adding 10 calls to the campaign
      inProgress: currentStats.inProgress + 10
    };
    
    await campaign.update({ stats: updatedStats });
    
    logger.info(`Processed campaign ${id} - scheduled ${updatedStats.inProgress} calls`);
    return true;
  } catch (error) {
    logger.error(`Error in campaign service - processCampaign: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignStatus,
  getCampaignStats,
  processCampaign
};
