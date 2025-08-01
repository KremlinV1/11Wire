/**
 * WebSocket Server Service
 * Handles SignalWire audio streaming and bridges with ElevenLabs
 */

const WebSocket = require('ws');
const http = require('http');
const logger = require('../utils/logger');
const elevenlabsService = require('./elevenlabs.service');
const audioBridgeService = require('./audio-bridge.service');

// Store active stream connections
const activeStreams = new Map();

/**
 * WebSocket connection handler for SignalWire audio streams
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} req - HTTP request
 */
const handleConnection = async (ws, req) => {
  // Extract call SID from URL path or query parameters
  const callSid = extractCallSid(req);
  if (!callSid) {
    logger.error('WebSocket connection attempt without valid call SID');
    ws.close(1008, 'Missing call SID');
    return;
  }

  logger.info(`WebSocket connection established for call: ${callSid}`);

  // Store connection info
  const streamData = {
    ws,
    callSid,
    startTime: Date.now(),
    status: 'connected',
    audioChunks: [],
    mediaFormat: null,
    elevenlabsSession: null
  };
  
  activeStreams.set(callSid, streamData);

  // Set up event handlers
  setupWebSocketEvents(ws, callSid);
};

/**
 * Extract call SID from request
 * @param {Object} req - HTTP request
 * @returns {string|null} - Call SID or null if not found
 */
const extractCallSid = (req) => {
  // Try to extract from URL path (e.g., /stream/:callSid)
  const pathMatch = req.url.match(/\/stream\/([^/]+)/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }
  
  // Try to extract from query parameters (e.g., ?callSid=xyz)
  const queryString = req.url.split('?')[1];
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const callSid = params.get('callSid');
    if (callSid) {
      return callSid;
    }
  }
  
  return null;
};

/**
 * Set up WebSocket event handlers
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} callSid - Call SID
 */
const setupWebSocketEvents = (ws, callSid) => {
  const streamData = activeStreams.get(callSid);
  
  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Process different SignalWire message types
      switch (message.event) {
        case 'connected':
          logger.debug(`Stream connected for call ${callSid}, protocol: ${message.protocol}, version: ${message.version}`);
          break;
          
        case 'start':
          // Store media format details
          streamData.mediaFormat = message.start?.mediaFormat;
          logger.debug(`Stream started for call ${callSid}, format: ${JSON.stringify(streamData.mediaFormat)}`);
          
          // Get voice agent ID from custom parameters
          const voiceAgentId = message.start?.customParameters?.voiceAgentId || 'default-voice-agent';
          
          // Initialize audio bridge with ElevenLabs
          const bridge = audioBridgeService.createAudioBridge(callSid, voiceAgentId);
          await bridge.initialize(ws, message.start?.mediaFormat, message.start?.customParameters);
          
          // Store reference to the bridge
          streamData.audioBridge = bridge;
          break;
          
        case 'media':
          // Process media chunk using audio bridge
          const audioBridge = audioBridgeService.getAudioBridge(callSid);
          if (audioBridge) {
            await audioBridge.processSignalWireAudio(message.media);
          } else {
            await processAudioChunk(callSid, message.media);
          }
          break;
          
        case 'stop':
          logger.debug(`Stream stopped for call ${callSid}`);
          cleanupStreamSession(callSid);
          break;
          
        case 'dtmf':
          logger.debug(`DTMF received for call ${callSid}: ${message.dtmf?.digit}`);
          // Handle DTMF if needed
          break;
          
        default:
          logger.debug(`Unknown stream event for call ${callSid}: ${message.event}`);
      }
    } catch (error) {
      logger.error(`Error processing WebSocket message for call ${callSid}: ${error.message}`);
    }
  });
  
  // Handle WebSocket close
  ws.on('close', () => {
    logger.info(`WebSocket connection closed for call ${callSid}`);
    cleanupStreamSession(callSid);
  });
  
  // Handle WebSocket errors
  ws.on('error', (error) => {
    logger.error(`WebSocket error for call ${callSid}: ${error.message}`);
    cleanupStreamSession(callSid);
  });
  
  // Send a ping every 30 seconds to keep the connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
};

/**
 * Process incoming audio chunk from SignalWire
 * @param {string} callSid - Call SID
 * @param {Object} mediaChunk - Media chunk data
 */
const processAudioChunk = async (callSid, mediaChunk) => {
  const streamData = activeStreams.get(callSid);
  if (!streamData) return;
  
  try {
    // Only process inbound audio (from the caller)
    if (mediaChunk.track === 'inbound') {
      // Decode base64 payload
      const audioBuffer = Buffer.from(mediaChunk.payload, 'base64');
      
      // Store audio chunk for processing
      streamData.audioChunks.push({
        timestamp: mediaChunk.timestamp || Date.now(),
        data: audioBuffer
      });
      
      // TODO: Stream to ElevenLabs for real-time processing
      // This will be implemented in the next step
      
      // For now, log the chunk size
      logger.debug(`Processed inbound audio chunk for call ${callSid}: ${audioBuffer.length} bytes`);
    }
  } catch (error) {
    logger.error(`Error processing audio chunk for call ${callSid}: ${error.message}`);
  }
};

/**
 * Clean up stream session resources
 * @param {string} callSid - Call SID
 */
const cleanupStreamSession = async (callSid) => {
  const streamData = activeStreams.get(callSid);
  if (!streamData) return;
  
  try {
    // Close WebSocket if still open
    if (streamData.ws && streamData.ws.readyState === WebSocket.OPEN) {
      streamData.ws.close();
    }
    
    // Close audio bridge if active
    if (streamData.audioBridge) {
      await audioBridgeService.closeAudioBridge(callSid);
    }
    
    // Remove from active streams
    activeStreams.delete(callSid);
    
    logger.info(`Cleaned up stream session for call ${callSid}`);
  } catch (error) {
    logger.error(`Error cleaning up stream session for call ${callSid}: ${error.message}`);
  }
};

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
const initializeWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/stream'
  });

  wss.on('connection', handleConnection);

  logger.info('WebSocket server initialized for audio streaming');

  return wss;
};

/**
 * Clean up all active streams on server shutdown
 */
const cleanupAllStreams = async () => {
  logger.info(`Cleaning up ${activeStreams.size} active audio streams on shutdown`);

  try {
    // Create array of promises to clean up each stream
    const cleanupPromises = [];

    for (const [callSid, streamData] of activeStreams.entries()) {
      cleanupPromises.push(cleanupStreamSession(callSid));
    }

    // Wait for all cleanup operations to complete with a timeout
    await Promise.all(cleanupPromises.map(p => {
      return Promise.race([
        p,
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
      ]);
    }));

    logger.info('All audio streams cleaned up successfully');
    return true;
  } catch (error) {
    logger.error(`Error cleaning up streams: ${error.message}`);
    return false;
  }
};

/**
 * Register graceful shutdown handlers
 */
const registerShutdownHandlers = () => {
  // Handle process termination signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.on(signal, async () => {
      logger.info(`${signal} received. Cleaning up WebSocket streams before exit...`);
      await cleanupAllStreams();
      logger.info('WebSocket server shutdown complete');
    });
  });
};

// Export functions
module.exports = {
  initializeWebSocketServer,
  activeStreams,
  cleanupAllStreams,
  registerShutdownHandlers
};
