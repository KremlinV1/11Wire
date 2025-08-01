/**
 * ElevenLabs Agent Configuration Controller
 * Manages ElevenLabs voice agent configurations for campaigns
 */

const db = require('../models');
const elevenlabsService = require('../services/elevenlabs.service');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * List all available ElevenLabs voice agents
 */
exports.listVoiceAgents = async (req, res) => {
  try {
    const agents = await elevenlabsService.getAvailableVoiceAgents();
    
    res.status(200).json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    logger.error(`Error listing voice agents: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice agents from ElevenLabs'
    });
  }
};

/**
 * Get a specific agent configuration by ID
 */
exports.getAgentConfig = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Try to get config from our database first
    const agentConfig = await db.AgentConfig.findOne({
      where: { agentId }
    });
    
    if (agentConfig) {
      return res.status(200).json({
        success: true,
        config: agentConfig
      });
    }
    
    // If not in our database, try to get from ElevenLabs
    const agent = await elevenlabsService.getVoiceAgentById(agentId);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    res.status(200).json({
      success: true,
      config: {
        agentId: agent.id,
        name: agent.name,
        description: agent.description || '',
        isActive: true,
        settings: agent.settings || {},
        source: 'elevenlabs-api' // Indicate this came directly from API
      }
    });
  } catch (error) {
    logger.error(`Error getting agent config: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent configuration'
    });
  }
};

/**
 * Create or update agent configuration
 */
exports.saveAgentConfig = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { name, description, isActive, settings, promptSettings, webhookUrl } = req.body;
    
    // Validate required fields
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }
    
    // Check if config exists
    let agentConfig = await db.AgentConfig.findOne({
      where: { agentId }
    });
    
    // If it doesn't exist, create it
    if (!agentConfig) {
      agentConfig = await db.AgentConfig.create({
        agentId,
        name: name || 'Unnamed Agent',
        description: description || '',
        isActive: isActive !== undefined ? isActive : true,
        settings: settings || {},
        promptSettings: promptSettings || {},
        webhookUrl: webhookUrl || null
      });
      
      return res.status(201).json({
        success: true,
        message: 'Agent configuration created',
        config: agentConfig
      });
    }
    
    // Update existing config
    await agentConfig.update({
      name: name !== undefined ? name : agentConfig.name,
      description: description !== undefined ? description : agentConfig.description,
      isActive: isActive !== undefined ? isActive : agentConfig.isActive,
      settings: settings !== undefined ? settings : agentConfig.settings,
      promptSettings: promptSettings !== undefined ? promptSettings : agentConfig.promptSettings,
      webhookUrl: webhookUrl !== undefined ? webhookUrl : agentConfig.webhookUrl
    });
    
    // If new webhook URL, update the actual agent configuration in ElevenLabs
    if (webhookUrl !== undefined && webhookUrl !== agentConfig.webhookUrl) {
      try {
        await elevenlabsService.updateAgentWebhook(agentId, webhookUrl);
        logger.info(`Updated webhook URL for agent ${agentId} to ${webhookUrl}`);
      } catch (webhookError) {
        logger.error(`Failed to update webhook URL in ElevenLabs: ${webhookError.message}`);
        // Continue anyway, we'll store our config locally
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Agent configuration updated',
      config: agentConfig
    });
  } catch (error) {
    logger.error(`Error saving agent config: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to save agent configuration'
    });
  }
};

/**
 * Get all configured agents (from our database)
 */
exports.listConfiguredAgents = async (req, res) => {
  try {
    logger.info('Attempting to list configured agents');
    
    // First verify our database connection and model
    try {
      await db.sequelize.authenticate();
      logger.info('Database connection is active');
      
      // Check if AgentConfig model is properly initialized
      if (!db.AgentConfig) {
        logger.error('AgentConfig model is not defined in db object');
        logger.error(`Available models: ${Object.keys(db).join(', ')}`);
        return res.status(500).json({
          success: false,
          error: 'Agent model configuration error',
          detail: 'AgentConfig model is not available'
        });
      }
    } catch (dbError) {
      logger.error(`Database connection error: ${dbError.message}`);
      logger.error(dbError.stack);
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        detail: dbError.message
      });
    }
    
    const { active } = req.query;
    const whereClause = {};
    
    // Filter by active status if requested
    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }
    
    logger.info(`Querying AgentConfig with where clause: ${JSON.stringify(whereClause)}`);
    
    // Add try/catch specifically for the query
    let agents;
    try {
      agents = await db.AgentConfig.findAll({
        where: whereClause,
        order: [['updatedAt', 'DESC']]
      });
      
      logger.info(`Found ${agents.length} configured agents`);}  catch (queryError) {
      logger.error(`Query error in AgentConfig.findAll: ${queryError.message}`);
      logger.error(queryError.stack);
      return res.status(500).json({
        success: false,
        error: 'Database query error',
        detail: queryError.message
      });
    }
    
    res.status(200).json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    logger.error(`Error listing configured agents: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configured agents'
    });
  }
};

/**
 * Delete an agent configuration
 */
exports.deleteAgentConfig = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Check if config exists
    const agentConfig = await db.AgentConfig.findOne({
      where: { agentId }
    });
    
    if (!agentConfig) {
      return res.status(404).json({
        success: false,
        error: 'Agent configuration not found'
      });
    }
    
    // Delete the config
    await agentConfig.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Agent configuration deleted'
    });
  } catch (error) {
    logger.error(`Error deleting agent config: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent configuration'
    });
  }
};

/**
 * Assign an agent to a campaign
 */
exports.assignAgentToCampaign = async (req, res) => {
  try {
    const { agentId, campaignId } = req.params;
    
    // Validate agent exists
    const agentConfig = await db.AgentConfig.findOne({
      where: { agentId }
    });
    
    if (!agentConfig) {
      return res.status(404).json({
        success: false,
        error: 'Agent configuration not found'
      });
    }
    
    // Validate campaign exists
    const campaign = await db.Campaign.findByPk(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Update campaign with agent ID
    await campaign.update({
      voiceAgentId: agentId,
      agentSettings: agentConfig.settings || {}
    });
    
    res.status(200).json({
      success: true,
      message: 'Agent assigned to campaign',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        voiceAgentId: campaign.voiceAgentId,
        agentSettings: campaign.agentSettings
      }
    });
  } catch (error) {
    logger.error(`Error assigning agent to campaign: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to assign agent to campaign'
    });
  }
};

/**
 * Get agent call metrics and performance data
 */
exports.getAgentMetrics = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Build where clause
    const whereClause = {
      voiceAgentId: agentId
    };
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.startTime = {};
      
      if (startDate) {
        whereClause.startTime[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.startTime[Op.lte] = new Date(endDate);
      }
    }
    
    // Get call counts
    const totalCalls = await db.CallLog.count({
      where: whereClause
    });
    
    // Get call status breakdown
    const callsByStatus = await db.CallLog.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['status']
    });
    
    // Format status counts
    const statusCounts = callsByStatus.reduce((acc, item) => {
      acc[item.status] = parseInt(item.dataValues.count);
      return acc;
    }, {});
    
    // Get average call duration
    const avgDuration = await db.CallLog.findOne({
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('duration')), 'avgDuration']
      ],
      where: {
        ...whereClause,
        duration: { [Op.not]: null }
      }
    });
    
    // Get campaign breakdown
    const campaignBreakdown = await db.CallLog.findAll({
      attributes: [
        'campaignId',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      include: [{
        model: db.Campaign,
        as: 'campaign',
        attributes: ['name']
      }],
      where: whereClause,
      group: ['campaignId', 'campaign.id', 'campaign.name']
    });
    
    res.status(200).json({
      success: true,
      agentId,
      totalCalls,
      byStatus: statusCounts,
      averageDuration: avgDuration?.dataValues?.avgDuration ? 
        Math.round(parseFloat(avgDuration.dataValues.avgDuration)) : 0,
      campaigns: campaignBreakdown.map(item => ({
        campaignId: item.campaignId,
        campaignName: item.campaign?.name || 'Unknown Campaign',
        callCount: parseInt(item.dataValues.count)
      }))
    });
  } catch (error) {
    logger.error(`Error getting agent metrics: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent metrics'
    });
  }
};
