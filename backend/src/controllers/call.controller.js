/**
 * Call Controller
 * Handles call routes and webhooks for telephone integration
 */

const callHandlingService = require('../services/call-handling.service');
const signalwireService = require('../services/signalwire.service');
const elevenlabsService = require('../services/elevenlabs.service');
const websocketServerService = require('../services/websocket-server.service');
const audioBridgeService = require('../services/audio-bridge.service');
const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Initiate an outbound call
 */
exports.initiateCall = async (req, res) => {
  try {
    const { to, from, voiceAgentId, scriptId, campaignId } = req.body;
    
    // Validate required fields
    if (!to || !from || !voiceAgentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields'
      });
    }
    
    // Get campaign data if provided
    const campaignData = campaignId ? { id: campaignId } : {};
    
    // Initiate the call
    const result = await callHandlingService.initiateOutboundCall(
      to, 
      from, 
      voiceAgentId, 
      scriptId,
      campaignData
    );
    
    res.status(200).json({
      success: true,
      call: result
    });
  } catch (error) {
    logger.error(`Error initiating call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call'
    });
  }
};

/**
 * Get detailed call information
 */
exports.getCallDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug(`Getting call details for ID: ${id}`);
    
    // First, check if CallLog table exists
    const tableExists = await db.sequelize.query(
      "SELECT to_regclass('public.call_logs') IS NOT NULL as exists",
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (!tableExists[0].exists) {
      logger.error('call_logs table does not exist in database');
      return res.status(500).json({
        success: false,
        error: 'Database schema issue: call_logs table not found'
      });
    }
    
    // Check if this is a callSid or internal ID
    let callLog;
    
    try {
      // If it looks like a SignalWire SID (contains characters)
      if (isNaN(id)) {
        // It's a callSid
        logger.debug(`Looking up call by SID: ${id}`);
        callLog = await db.CallLog.findOne({
          where: { callSid: id },
          include: [
            {
              model: db.Contact,
              as: 'contact',
              required: false, // Make this a LEFT JOIN
              attributes: ['id', 'firstName', 'lastName', 'phone', 'email']
            },
            {
              model: db.Campaign,
              as: 'campaign',
              required: false, // Make this a LEFT JOIN
              attributes: ['id', 'name', 'status']
            }
          ]
        });
      } else {
        // It's our internal ID
        logger.debug(`Looking up call by internal ID: ${id}`);
        
        // Convert to proper ID type
        const numericId = parseInt(id, 10);
        
        callLog = await db.CallLog.findByPk(numericId, {
          include: [
            {
              model: db.Contact,
              as: 'contact',
              required: false, // Make this a LEFT JOIN
              attributes: ['id', 'firstName', 'lastName', 'phone', 'email']
            },
            {
              model: db.Campaign,
              as: 'campaign',
              required: false, // Make this a LEFT JOIN
              attributes: ['id', 'name', 'status']
            }
          ]
        });
      }
    } catch (dbError) {
      logger.error(`Database error looking up call: ${dbError.message}`);
      logger.error(dbError.stack);
      
      // Try a simplified lookup without associations
      try {
        if (isNaN(id)) {
          callLog = await db.CallLog.findOne({ where: { callSid: id } });
        } else {
          callLog = await db.CallLog.findByPk(parseInt(id, 10));
        }
      } catch (fallbackError) {
        logger.error(`Fallback lookup also failed: ${fallbackError.message}`);
      }
    }
    
    // If found in our database, return it
    if (callLog) {
      logger.debug(`Found call in database: ${callLog.id}`);
      return res.status(200).json({
        success: true,
        call: callLog
      });
    }
    
    logger.debug(`Call not found in database, trying SignalWire API: ${id}`);
    
    // If not in our database, try SignalWire API
    try {
      const call = await signalwireService.getCallDetails(id);
      
      // Transform to match our format
      const transformedCall = {
        callSid: call.sid,
        direction: call.direction,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: new Date(call.dateCreated),
        endTime: call.dateCreated && call.duration ? 
          new Date(new Date(call.dateCreated).getTime() + (call.duration * 1000)) : null,
        callData: call
      };
      
      return res.status(200).json({
        success: true,
        call: transformedCall,
        source: 'signalwire'
      });
    } catch (swError) {
      logger.error(`SignalWire API error: ${swError.message}`);
      
      // Return a 404 since we couldn't find the call
      return res.status(404).json({
        success: false,
        error: 'Call not found in database or SignalWire API'
      });
    }
  } catch (error) {
    logger.error(`Error getting call details: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to get call details: ' + error.message
    });
  }
};

/**
 * End active call
 */
exports.endCall = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await signalwireService.endCall(id);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to end call'
    });
  }
};

/**
 * Process batch of calls for a campaign
 */
exports.processCampaignCalls = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { batchSize, maxConcurrent } = req.body;
    
    // Process calls with optional parameters
    const result = await callHandlingService.processCampaignCalls(
      campaignId,
      batchSize,
      maxConcurrent
    );
    
    // Log the batch call initiation
    await db.CallLog.update(
      { campaignId: parseInt(campaignId) },
      { where: { callSid: { [Op.in]: result.callSids || [] } } }
    );
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error processing campaign calls: ${error.message}`);
    
    // Check if campaign not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process campaign calls'
    });
  }
};

/**
 * Get recent call logs with enhanced filtering and pagination
 */
exports.getRecentCalls = async (req, res) => {
  try {
    // Extract query parameters for filtering and pagination
    const { 
      status, 
      from, 
      to, 
      direction,
      campaignId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'startTime',
      sortDir = 'DESC'
    } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (from) whereClause.from = { [Op.iLike]: `%${from}%` };
    if (to) whereClause.to = { [Op.iLike]: `%${to}%` };
    if (direction) whereClause.direction = direction;
    if (campaignId) whereClause.campaignId = campaignId;
    
    // Date range filter
    if (startDate || endDate) {
      whereClause.startTime = {};
      
      if (startDate) {
        whereClause.startTime[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.startTime[Op.lte] = new Date(endDate);
      }
    }
    
    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Query from our CallLog model
    const { count, rows: calls } = await db.CallLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortDir]],
      include: [
        {
          model: db.Contact,
          as: 'contact',
          attributes: ['id', 'firstName', 'lastName', 'phone']
        },
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name']
        }
      ]
    });
    
    // If we have few or no results from our database, also fetch from SignalWire
    // This helps during transition to new call logging system
    if (count < parseInt(limit)) {
      try {
        const swFilters = {
          limit: parseInt(limit) - count
        };
        
        if (status) swFilters.status = status;
        if (from) swFilters.from = from;
        if (to) swFilters.to = to;
        
        const swCalls = await signalwireService.getRecentCalls(swFilters);
        
        // Filter out calls we already have in our database
        const existingSids = calls.map(call => call.callSid);
        const newSwCalls = swCalls.filter(call => !existingSids.includes(call.sid));
        
        // Transform SignalWire calls to match our format
        const transformedSwCalls = newSwCalls.map(call => ({
          callSid: call.sid,
          direction: call.direction,
          from: call.from,
          to: call.to,
          status: call.status,
          duration: call.duration,
          startTime: new Date(call.dateCreated),
          endTime: call.dateCreated && call.duration ? 
            new Date(new Date(call.dateCreated).getTime() + (call.duration * 1000)) : null,
          callData: call
        }));
        
        // Return combined results
        return res.status(200).json({
          success: true,
          count: count + transformedSwCalls.length,
          totalPages: Math.ceil((count + transformedSwCalls.length) / parseInt(limit)),
          currentPage: parseInt(page),
          calls: [...calls, ...transformedSwCalls]
        });
      } catch (swError) {
        logger.warn(`Error fetching from SignalWire, returning DB results only: ${swError.message}`);
      }
    }
    
    // Return database results
    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      calls
    });
  } catch (error) {
    logger.error(`Error getting recent calls: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent calls'
    });
  }
};

/**
 * Webhook for inbound call handling
 */
exports.handleInboundCall = async (req, res) => {
  try {
    const callData = req.body;
    logger.info(`Received inbound call webhook: ${JSON.stringify(callData)}`);
    
    const twiml = await callHandlingService.handleInboundCall(callData);
    
    // Respond with TwiML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error in inbound call webhook: ${error.message}`);
    
    // Respond with simple TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};

/**
 * Webhook for gathering user input from call
 */
exports.handleGatherWebhook = async (req, res) => {
  try {
    const callData = req.body;
    const callSid = req.params.callSid;
    
    // Merge params and body
    const mergedData = {
      ...callData,
      CallSid: callSid
    };
    
    logger.info(`Received gather webhook for call ${callSid}`);
    
    const twiml = await callHandlingService.handleGather(mergedData);
    
    // Respond with TwiML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error in gather webhook: ${error.message}`);
    
    // Respond with simple TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};

/**
 * Webhook for call status updates
 */
exports.handleStatusWebhook = async (req, res) => {
  try {
    const statusData = req.body;
    logger.info(`Received call status webhook: ${JSON.stringify(statusData)}`);
    
    // Process status update with call handling service
    await callHandlingService.handleCallStatus(statusData);
    
    // Also log to our CallLog model
    try {
      // Extract necessary fields
      const { CallSid, CallStatus, From, To, Direction, CallDuration } = statusData;
      
      if (CallSid) {
        // Try to find existing log
        let callLog = await db.CallLog.findOne({ where: { callSid: CallSid } });
        
        // If call completed or has duration, update end time and duration
        const updates = { 
          status: CallStatus?.toLowerCase() || 'unknown' 
        };
        
        if (CallDuration) {
          updates.duration = parseInt(CallDuration);
          
          // Calculate end time if we have start time
          if (callLog && callLog.startTime) {
            updates.endTime = new Date(new Date(callLog.startTime).getTime() + 
              (parseInt(CallDuration) * 1000));
          }
        }
        
        if (callLog) {
          // Update existing log
          await callLog.update(updates);
          logger.debug(`Updated call log for ${CallSid}`);
        } else {
          // Create new log
          callLog = await db.CallLog.create({
            callSid: CallSid,
            from: From,
            to: To,
            direction: Direction?.toLowerCase() || 'outbound',
            status: CallStatus?.toLowerCase() || 'unknown',
            duration: CallDuration ? parseInt(CallDuration) : null,
            startTime: new Date(),
            callData: statusData
          });
          logger.debug(`Created new call log for ${CallSid}`);
        }
      }
    } catch (dbError) {
      logger.error(`Error updating call log: ${dbError.message}`);
      // Don't throw here - we still want to return success to SignalWire
    }
    
    // Simple acknowledgment response
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error in status webhook: ${error.message}`);
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Webhook for recording status updates
 */
exports.handleRecordingWebhook = async (req, res) => {
  try {
    const recordingData = req.body;
    logger.info(`Received recording webhook: ${JSON.stringify(recordingData)}`);
    
    // Process recording data (save URL, etc.)
    // Implementation would go here
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error in recording webhook: ${error.message}`);
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Get available voice agents
 */
exports.getVoiceAgents = async (req, res) => {
  try {
    // Get voice models from ElevenLabs
    const voices = await elevenlabsService.getVoices();
    
    res.status(200).json({
      success: true,
      count: voices.length,
      voiceAgents: voices
    });
  } catch (error) {
    logger.error(`Error getting voice agents: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get voice agents'
    });
  }
};

/**
 * Handle streaming webhook for real-time audio
 */
exports.handleStreamWebhook = async (req, res) => {
  try {
    // Get call info from request
    const { CallSid } = req.query;
    
    if (!CallSid) {
      logger.error('Stream webhook missing CallSid parameter');
      return res.status(400).send('Missing CallSid parameter');
    }
    
    logger.info(`Stream webhook received for call ${CallSid}`);
    
    // Get the call from database
    const callLog = await db.CallLog.findOne({
      where: { callSid: CallSid }
    });
    
    if (!callLog) {
      logger.warn(`Call ${CallSid} not found in database for stream webhook`);
    } else {
      // Update call status in database
      await callLog.update({
        status: 'in-progress', 
        isStreaming: true
      });
    }
    
    // Generate TwiML to initiate streaming to our WebSocket server
    const wsUrl = `${req.protocol}://${req.get('host')}/stream`;
    
    // Get the voice agent ID associated with this call
    let voiceAgentId = req.query.VoiceAgentId || 'default-voice-agent';
    
    if (callLog && callLog.metadata && callLog.metadata.voiceAgentId) {
      voiceAgentId = callLog.metadata.voiceAgentId;
    }
    
    // Generate TwiML with Stream verb
    const twiml = signalwireService.generateTwiML({
      stream: {
        url: wsUrl,
        track: 'both', // Stream both inbound and outbound audio
        customParameters: {
          voiceAgentId: voiceAgentId,
          callSid: CallSid
        }
      }
    });
    
    // Log the TwiML being sent
    logger.debug(`Streaming TwiML response: ${twiml}`);
    
    // Send TwiML response
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error in stream webhook: ${error.message}`);
    logger.error(error.stack);
    
    // Return a basic TwiML response to avoid call failure
    const fallbackTwiml = signalwireService.generateTwiML({
      say: { text: 'There was an error establishing the audio stream.' }
    });
    
    res.set('Content-Type', 'text/xml');
    res.send(fallbackTwiml);
  }
};

/**
 * Get call statistics
 */
exports.getCallStatistics = async (req, res) => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      whereClause.startTime = {};
      
      if (startDate) {
        whereClause.startTime[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.startTime[Op.lte] = new Date(endDate);
      }
    }
    
    // Get total calls
    const totalCalls = await db.CallLog.count({ where: whereClause });
    
    // Get calls by status
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
    
    // Get calls by direction
    const callsByDirection = await db.CallLog.findAll({
      attributes: [
        'direction',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['direction']
    });
    
    // Format direction counts
    const directionCounts = callsByDirection.reduce((acc, item) => {
      acc[item.direction] = parseInt(item.dataValues.count);
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
    
    // Get hourly distribution
    const hourlyDistribution = await db.sequelize.query(
      `SELECT EXTRACT(HOUR FROM "startTime") as hour, COUNT(*) as count 
      FROM call_logs 
      WHERE "startTime" IS NOT NULL 
      ${campaignId ? 'AND "campaignId" = ' + parseInt(campaignId) : ''} 
      ${startDate ? 'AND "startTime" >= \'' + startDate + '\'' : ''} 
      ${endDate ? 'AND "startTime" <= \'' + endDate + '\'' : ''} 
      GROUP BY hour 
      ORDER BY hour ASC`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    res.status(200).json({
      success: true,
      totalCalls,
      byStatus: statusCounts,
      byDirection: directionCounts,
      averageDuration: avgDuration?.dataValues?.avgDuration ? 
        Math.round(parseFloat(avgDuration.dataValues.avgDuration)) : 0,
      hourlyDistribution: hourlyDistribution.map(item => ({
        hour: parseInt(item.hour),
        count: parseInt(item.count)
      }))
    });
  } catch (error) {
    logger.error(`Error getting call statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get call statistics'
    });
  }
};
