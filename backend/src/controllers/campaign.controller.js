/**
 * Campaign Controller
 * Handles campaign management operations (CRUD, scheduling, status updates)
 */
const logger = require('../utils/logger');
const campaignService = require('../services/campaign.service');

/**
 * Get all campaigns with optional filtering
 */
exports.getCampaigns = async (req, res) => {
  try {
    const filters = { status: req.query.status };
    const result = await campaignService.getAllCampaigns(filters);
    
    logger.info(`Retrieved ${result.length} campaigns`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error retrieving campaigns: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaigns'
    });
  }
};

/**
 * Get campaign by ID
 */
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await campaignService.getCampaignById(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    logger.info(`Retrieved campaign: ${id}`);
    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    logger.error(`Error retrieving campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign'
    });
  }
};

/**
 * Create a new campaign
 */
exports.createCampaign = async (req, res) => {
  try {
    // Extract campaign data from request body
    const campaignData = req.body;
    
    // Basic validation
    if (!campaignData.name || !campaignData.startDate || !campaignData.endDate || 
        !campaignData.contactsId || !campaignData.voiceAgentId || !campaignData.scriptId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Create campaign using service
    const newCampaign = await campaignService.createCampaign(campaignData);
    
    logger.info(`Created new campaign: ${newCampaign.id}`);
    res.status(201).json({
      success: true,
      data: newCampaign
    });
  } catch (error) {
    logger.error(`Error creating campaign: ${error.message}`);
    
    // Check for validation errors specifically
    if (error.message === 'Missing required fields') {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  }
};

/**
 * Update an existing campaign
 */
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;
    
    // Update campaign using service
    const updatedCampaign = await campaignService.updateCampaign(id, updatedFields);
    
    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    logger.info(`Updated campaign: ${id}`);
    res.status(200).json({
      success: true,
      data: updatedCampaign
    });
  } catch (error) {
    logger.error(`Error updating campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
};

/**
 * Delete a campaign
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete campaign using service
    const deleted = await campaignService.deleteCampaign(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    logger.info(`Deleted campaign: ${id}`);
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error deleting campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
};

/**
 * Update campaign status (start, pause, resume, complete)
 */
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'paused', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, paused, completed, failed'
      });
    }
    
    // Update campaign status using service
    const updatedCampaign = await campaignService.updateCampaignStatus(id, status);
    
    if (!updatedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    logger.info(`Updated campaign status: ${id} -> ${status}`);
    res.status(200).json({
      success: true,
      data: updatedCampaign
    });
  } catch (error) {
    logger.error(`Error updating campaign status: ${error.message}`);
    
    // Check for validation errors
    if (error.message === 'Invalid status') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, paused, completed, failed'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign status'
    });
  }
};

/**
 * Get campaign statistics
 */
exports.getCampaignStats = async (req, res) => {
  try {
    // Get campaign statistics using service
    const stats = await campaignService.getCampaignStats();
    
    logger.info('Retrieved campaign statistics');
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error retrieving campaign statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign statistics'
    });
  }
};

/**
 * Process campaign (manual trigger)
 */
exports.processCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Process campaign using service
    const result = await campaignService.processCampaign(id);
    
    if (result) {
      logger.info(`Manually processed campaign: ${id}`);
      res.status(200).json({
        success: true,
        message: 'Campaign processed successfully'
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Campaign not processed due to status or scheduling constraints'
      });
    }
  } catch (error) {
    logger.error(`Error processing campaign: ${error.message}`);
    
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process campaign'
    });
  }
};
