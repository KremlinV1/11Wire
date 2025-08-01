/**
 * Media Streaming Service
 * Handles real-time audio streaming between SignalWire and ElevenLabs
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const logger = require('../utils/logger');
const config = require('../config');
const elevenlabsService = require('./elevenlabs.service');

// Store active stream sessions
const activeStreams = new Map();

/**
 * Initialize WebSocket server for audio streaming
 * @param {Object} server - HTTP/HTTPS server to attach WebSocket server to
 */
const initializeWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/stream'
  });
  
  wss.on('connection', handleWebSocketConnection);
  
  logger.info('WebSocket server initialized for audio streaming');
  
  return wss;
};

/**
 * Handle new WebSocket connection for streaming
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request for the upgrade
 */
const handleWebSocketConnection = (ws, req) => {
  try {
    // Extract session ID from URL query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const callSid = url.searchParams.get('callSid');
    const voiceAgentId = url.searchParams.get('voiceAgentId');
    
    if (!callSid) {
      logger.warn('WebSocket connection attempt without callSid');
      ws.close(1008, 'Missing callSid parameter');
      return;
    }
    
    logger.info(`New WebSocket connection for call ${callSid}`);
    
    // Create stream session
    const streamSession = {
      ws,
      callSid,
      voiceAgentId,
      startTime: Date.now(),
      audioChunks: [],
      isActive: true,
      transcriptSegments: []
    };
    
    // Store session
    activeStreams.set(callSid, streamSession);
    
    // Set up event handlers
    setupWebSocketEvents(ws, streamSession);
    
    // Send acknowledgment to client
    ws.send(JSON.stringify({
      type: 'connection_established',
      callSid,
      message: 'Stream connection established'
    }));
  } catch (error) {
    logger.error(`Error handling WebSocket connection: ${error.message}`);
    ws.close(1011, 'Internal server error');
  }
};

/**
 * Set up WebSocket event handlers for streaming
 * @param {WebSocket} ws - WebSocket connection 
 * @param {Object} session - Stream session object
 */
const setupWebSocketEvents = (ws, session) => {
  // Handle binary audio data
  ws.on('message', (data) => {
    try {
      // If it's a string message (could be control messages)
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        handleControlMessage(message, session);
        return;
      }
      
      // Handle binary audio data
      handleAudioData(data, session);
    } catch (error) {
      logger.error(`Error handling WebSocket message: ${error.message}`);
    }
  });
  
  // Handle connection close
  ws.on('close', (code, reason) => {
    handleStreamClose(session, code, reason);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    logger.error(`WebSocket error for call ${session.callSid}: ${error.message}`);
  });
  
  // Setup ping/pong to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
};

/**
 * Handle control messages from client
 * @param {Object} message - Control message
 * @param {Object} session - Stream session
 */
const handleControlMessage = async (message, session) => {
  const { type, text, voiceId } = message;
  
  switch (type) {
    case 'generate_speech':
      // Generate speech from ElevenLabs and stream back
      if (text) {
        await streamTextToSpeech(text, voiceId || session.voiceAgentId, session);
      }
      break;
      
    case 'update_voice':
      // Update voice agent for the session
      if (voiceId) {
        session.voiceAgentId = voiceId;
        session.ws.send(JSON.stringify({
          type: 'voice_updated',
          voiceId
        }));
      }
      break;
      
    case 'end_stream':
      // End streaming session
      endStreamSession(session.callSid);
      break;
      
    default:
      logger.warn(`Unknown control message type: ${type}`);
  }
};

/**
 * Handle incoming audio data
 * @param {Buffer} data - Audio data buffer
 * @param {Object} session - Stream session
 */
const handleAudioData = async (data, session) => {
  // Store audio chunk
  session.audioChunks.push(data);
  
  // If we have enough audio data, process it
  if (session.audioChunks.length >= 5) { // Arbitrary threshold, adjust as needed
    const audioBuffer = Buffer.concat(session.audioChunks);
    
    // In a production system, we would:
    // 1. Send this to a speech-to-text service
    // 2. Process the transcript
    // 3. Generate a response
    // 4. Stream the response back
    
    // For now, just acknowledge the audio data
    session.ws.send(JSON.stringify({
      type: 'audio_received',
      bytesReceived: audioBuffer.length
    }));
    
    // Clear the chunks after processing
    session.audioChunks = [];
  }
};

/**
 * Stream text-to-speech output to client
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID to use
 * @param {Object} session - Stream session
 */
const streamTextToSpeech = async (text, voiceId, session) => {
  try {
    // Initialize streaming from ElevenLabs
    const streamUrl = await elevenlabsService.startStreamingSpeech(text, voiceId);
    
    // Create HTTP request to ElevenLabs streaming endpoint
    const request = https.get(streamUrl, (response) => {
      // Handle successful response
      if (response.statusCode === 200) {
        session.ws.send(JSON.stringify({
          type: 'stream_start',
          text
        }));
        
        // Stream audio chunks to WebSocket client
        response.on('data', (chunk) => {
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(chunk);
          }
        });
        
        // Handle end of stream
        response.on('end', () => {
          session.ws.send(JSON.stringify({
            type: 'stream_end',
            text
          }));
        });
      } else {
        // Handle error response
        logger.error(`ElevenLabs streaming error: ${response.statusCode}`);
        session.ws.send(JSON.stringify({
          type: 'stream_error',
          error: `Streaming error: ${response.statusCode}`
        }));
      }
    });
    
    // Handle request error
    request.on('error', (error) => {
      logger.error(`ElevenLabs request error: ${error.message}`);
      session.ws.send(JSON.stringify({
        type: 'stream_error',
        error: `Request error: ${error.message}`
      }));
    });
    
    // Set request timeout
    request.setTimeout(30000, () => {
      request.abort();
      session.ws.send(JSON.stringify({
        type: 'stream_error',
        error: 'Request timeout'
      }));
    });
  } catch (error) {
    logger.error(`Text-to-speech streaming error: ${error.message}`);
    session.ws.send(JSON.stringify({
      type: 'stream_error',
      error: error.message
    }));
  }
};

/**
 * Handle stream session close
 * @param {Object} session - Stream session
 * @param {number} code - Close code
 * @param {string} reason - Close reason
 */
const handleStreamClose = (session, code, reason) => {
  logger.info(`WebSocket closed for call ${session.callSid}: ${code} - ${reason || 'No reason provided'}`);
  
  // Mark session as inactive
  session.isActive = false;
  
  // Store any final data or metrics
  // Implementation depends on your specific requirements
  
  // Clean up resources
  if (session.audioChunks.length > 0) {
    // Process any remaining audio if necessary
  }
  
  // Remove session after short delay (to allow for any final processing)
  setTimeout(() => {
    activeStreams.delete(session.callSid);
  }, 5000);
};

/**
 * End streaming session
 * @param {string} callSid - Call SID
 */
const endStreamSession = (callSid) => {
  const session = activeStreams.get(callSid);
  
  if (session && session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify({
      type: 'stream_terminated',
      message: 'Stream terminated by request'
    }));
    
    session.ws.close(1000, 'Stream terminated by request');
  }
  
  // Remove session
  activeStreams.delete(callSid);
  logger.info(`Stream session terminated for call ${callSid}`);
};

/**
 * Create a streaming TwiML for SignalWire
 * @param {string} callSid - Call SID
 * @returns {string} TwiML with streaming instructions
 */
const createStreamingTwiML = (callSid) => {
  const hostname = process.env.PUBLIC_HOSTNAME || `http://localhost:${config.port}`;
  const streamUrl = `wss://${hostname.replace('http://', '').replace('https://', '')}/api/stream?callSid=${callSid}`;
  
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="${streamUrl}" />
      </Connect>
      <Say>Connecting to streaming service...</Say>
    </Response>
  `.trim();
};

/**
 * Get stream session metrics
 * @param {string} callSid - Call SID
 * @returns {Object} Session metrics
 */
const getStreamMetrics = (callSid) => {
  const session = activeStreams.get(callSid);
  
  if (!session) {
    return {
      active: false,
      callSid
    };
  }
  
  return {
    active: session.isActive,
    callSid,
    duration: Math.floor((Date.now() - session.startTime) / 1000),
    voiceAgentId: session.voiceAgentId,
    transcriptSegments: session.transcriptSegments.length
  };
};

/**
 * Record audio to file system
 * @param {string} callSid - Call SID 
 * @param {Buffer} audioBuffer - Audio buffer to save
 * @returns {string} File path where audio was saved
 */
const saveCallAudio = async (callSid, audioBuffer) => {
  const uploadDir = path.join(__dirname, '../../uploads/audio');
  
  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filename = `${callSid}-${Date.now()}.mp3`;
  const filePath = path.join(uploadDir, filename);
  
  // Write audio to file
  await fs.promises.writeFile(filePath, audioBuffer);
  
  logger.info(`Saved audio for call ${callSid} to ${filePath}`);
  
  return filePath;
};

module.exports = {
  initializeWebSocketServer,
  createStreamingTwiML,
  endStreamSession,
  getStreamMetrics,
  saveCallAudio
};
