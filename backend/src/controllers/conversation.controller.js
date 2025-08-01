/**
 * Conversation Controller
 * Handles CRUD operations and API endpoints for conversation data
 */

const { Conversation, CallRecording, Campaign } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get conversations with filtering and pagination
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getConversations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      campaign_id,
      start_date,
      end_date,
      has_metadata,
      outcome
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause based on filters
    const where = {};
    
    if (campaign_id) {
      where.campaign_id = campaign_id;
    }
    
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) {
        where.createdAt[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.createdAt[Op.lte] = new Date(end_date);
      }
    }
    
    if (has_metadata === 'true') {
      where.metadata = {
        [Op.ne]: null
      };
    }
    
    if (outcome) {
      where[`metadata.outcome`] = outcome;
    }

    // Get conversations with count
    const { count, rows } = await Conversation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'description']
        },
        {
          model: CallRecording,
          as: 'recording',
          attributes: ['id', 'storage_path', 'duration_seconds']
        }
      ]
    });

    logger.info(`Retrieved ${rows.length} conversations from database`);

    return res.status(200).json({
      success: true,
      count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      conversations: rows
    });
  } catch (error) {
    logger.error(`Error retrieving conversations: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversations'
    });
  }
};

/**
 * Get conversation by ID
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'description']
        },
        {
          model: CallRecording,
          as: 'recording',
          attributes: ['id', 'storage_path', 'duration_seconds']
        }
      ]
    });

    if (!conversation) {
      logger.warn(`Conversation with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    logger.info(`Retrieved conversation ${id} from database`);

    return res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    logger.error(`Error retrieving conversation: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation'
    });
  }
};

/**
 * Update conversation metadata
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateConversationMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Metadata object is required'
      });
    }

    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      logger.warn(`Conversation with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Merge existing metadata with new values
    const updatedMetadata = {
      ...(conversation.metadata || {}),
      ...metadata,
      last_updated: new Date().toISOString()
    };

    await conversation.update({ metadata: updatedMetadata });

    logger.info(`Updated metadata for conversation ${id}`);

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation.id,
        metadata: updatedMetadata
      }
    });
  } catch (error) {
    logger.error(`Error updating conversation metadata: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update conversation metadata'
    });
  }
};

/**
 * Get conversation statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getConversationStats = async (req, res) => {
  try {
    const { campaign_id, start_date, end_date } = req.query;

    // Build filter conditions
    const whereConditions = {};
    if (campaign_id) whereConditions.campaign_id = campaign_id;
    if (start_date) whereConditions.createdAt = { [Op.gte]: new Date(start_date) };
    if (end_date) {
      const endDateObj = new Date(end_date);
      endDateObj.setDate(endDateObj.getDate() + 1); // Include the end date
      whereConditions.createdAt = { 
        ...whereConditions.createdAt,
        [Op.lt]: endDateObj 
      };
    }

    // Get total conversations count
    const total = await Conversation.count({
      where: whereConditions
    });

    // Get count of conversations with metadata
    const withMetadata = await Conversation.count({
      where: {
        ...whereConditions,
        metadata: { [Op.not]: null }
      }
    });

    // Get outcome distribution
    const outcomeQuery = `
      SELECT 
        metadata->>'outcome' as outcome, 
        COUNT(*) as count
      FROM conversations
      WHERE metadata->>'outcome' IS NOT NULL
      ${campaign_id ? "AND campaign_id = '" + campaign_id + "'" : ""}
      ${start_date ? "AND created_at >= '" + start_date + "'" : ""}
      ${end_date ? "AND created_at < '" + new Date(new Date(end_date).setDate(new Date(end_date).getDate() + 1)).toISOString().split('T')[0] + "'" : ""}
      GROUP BY metadata->>'outcome'
      ORDER BY count DESC
    `;

    const [outcomeResults] = await Conversation.sequelize.query(outcomeQuery);
    
    // Convert outcome results to an object
    const outcomes = {};
    outcomeResults.forEach(result => {
      outcomes[result.outcome] = parseInt(result.count);
    });

    // Get average conversation duration
    const durationResult = await Conversation.findOne({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('duration_seconds')), 'avgDuration']
      ],
      where: whereConditions
    });

    const avgDuration = durationResult ? parseFloat(durationResult.get('avgDuration')) || 0 : 0;

    // Get topic distribution
    const topicQuery = `
      SELECT 
        topic, 
        COUNT(*) as count
      FROM (
        SELECT jsonb_array_elements_text(metadata->'topics') as topic
        FROM conversations
        WHERE metadata->'topics' IS NOT NULL AND jsonb_array_length(metadata->'topics') > 0
        ${campaign_id ? "AND campaign_id = '" + campaign_id + "'" : ""}
        ${start_date ? "AND created_at >= '" + start_date + "'" : ""}
        ${end_date ? "AND created_at < '" + new Date(new Date(end_date).setDate(new Date(end_date).getDate() + 1)).toISOString().split('T')[0] + "'" : ""}
      ) AS topics
      GROUP BY topic
      ORDER BY count DESC
    `;

    const [topicResults] = await Conversation.sequelize.query(topicQuery);
    
    // Convert topic results to an object
    const topics = {};
    topicResults.forEach(result => {
      topics[result.topic] = parseInt(result.count);
    });

    // Get sentiment averages
    const sentimentQuery = `
      SELECT 
        AVG((metadata->'sentiment'->>'positive')::float) as avg_positive,
        AVG((metadata->'sentiment'->>'negative')::float) as avg_negative,
        AVG((metadata->'sentiment'->>'neutral')::float) as avg_neutral
      FROM conversations
      WHERE metadata->'sentiment' IS NOT NULL
      ${campaign_id ? "AND campaign_id = '" + campaign_id + "'" : ""}
      ${start_date ? "AND created_at >= '" + start_date + "'" : ""}
      ${end_date ? "AND created_at < '" + new Date(new Date(end_date).setDate(new Date(end_date).getDate() + 1)).toISOString().split('T')[0] + "'" : ""}
    `;

    const [sentimentResults] = await Conversation.sequelize.query(sentimentQuery);
    const sentiments = sentimentResults[0] || {
      avg_positive: 0,
      avg_negative: 0,
      avg_neutral: 0
    };

    // Get call metrics by day of week
    const dowQuery = `
      SELECT 
        EXTRACT(DOW FROM created_at) as day_of_week, 
        COUNT(*) as count,
        AVG(duration_seconds) as avg_duration
      FROM conversations
      WHERE created_at IS NOT NULL
      ${campaign_id ? "AND campaign_id = '" + campaign_id + "'" : ""}
      ${start_date ? "AND created_at >= '" + start_date + "'" : ""}
      ${end_date ? "AND created_at < '" + new Date(new Date(end_date).setDate(new Date(end_date).getDate() + 1)).toISOString().split('T')[0] + "'" : ""}
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    const [dowResults] = await Conversation.sequelize.query(dowQuery);
    
    // Format day of week data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekStats = {};
    
    daysOfWeek.forEach(day => {
      dayOfWeekStats[day] = { count: 0, avg_duration: 0 };
    });
    
    dowResults.forEach(result => {
      const dayName = daysOfWeek[result.day_of_week];
      dayOfWeekStats[dayName] = { 
        count: parseInt(result.count), 
        avg_duration: parseFloat(result.avg_duration) || 0 
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        with_metadata: withMetadata,
        outcomes,
        avg_duration: avgDuration,
        topics,
        sentiments,
        by_day_of_week: dayOfWeekStats
      }
    });
  } catch (error) {
    console.error('Error getting conversation statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation statistics'
    });
  }
};

module.exports = {
  getConversations,
  getConversationById,
  updateConversationMetadata,
  getConversationStats
};
