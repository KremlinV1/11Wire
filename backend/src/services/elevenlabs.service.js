/**
 * ElevenLabs Service
 * Handles AI voice generation and real-time streaming
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');
const wav = require('wav');
const { Readable } = require('stream');
const { SttRequestMapping } = require('../models');

/**
 * Get the call ID associated with a request ID
 * @param {string} requestId - The ElevenLabs request ID 
 * @returns {Promise<string|null>} The associated call ID or null if not found
 */
const getCallIdForRequestId = async (requestId) => {
  if (!requestId) return null;
  
  try {
    // Look up in the database
    const mapping = await SttRequestMapping.findByPk(requestId);
    if (mapping) {
      logger.info(`Found call ID ${mapping.call_id} for request ID ${requestId}`);
      
      // Update status if not already completed
      if (mapping.status === 'pending') {
        await mapping.update({
          status: 'completed',
          result_received_at: new Date()
        });
      }
      
      return mapping.call_id;
    }
    logger.warn(`No call ID found for request ID ${requestId}`);
    return null;
  } catch (error) {
    logger.error(`Error looking up call ID for request ${requestId}: ${error.message}`);
    return null;
  }
};

// Define service name for logging
const SERVICE_NAME = 'elevenlabs-service';

// Base URLs for ElevenLabs API
const API_BASE_URL = 'https://api.elevenlabs.io/v1';
const WEBSOCKET_URL = 'wss://api.elevenlabs.io/v1/text-to-speech';

// API Key from config or direct environment variable
const apiKey = config.elevenLabs?.apiKey || process.env.ELEVENLABS_API_KEY;

// Log API key status on service initialization
logger.debug(`ElevenLabs service initialized, API key status: ${apiKey ? 'present' : 'missing'}`);

/**
 * Get available voice models
 * @returns {Array} Available voices
 */
const getVoices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    logger.info(`Retrieved ${response.data.voices.length} voices from ElevenLabs`);
    return response.data.voices;
  } catch (error) {
    logger.error(`Error fetching ElevenLabs voices: ${error.message}`);
    throw error;
  }
};

/**
 * Get voice details including samples and settings
 * @param {string} voiceId - ID of the voice to fetch
 * @returns {Object} Voice details
 */
const getVoiceDetails = async (voiceId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching voice details: ${error.message}`);
    throw error;
  }
};

/**
 * Generate speech from text
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - ID of the voice to use
 * @param {Object} options - Additional options for speech generation
 * @returns {Buffer} Audio buffer
 */
const generateSpeech = async (text, voiceId, options = {}) => {
  try {
    // Validate voiceId
    if (!voiceId || voiceId === 'default-voice-id') {
      logger.info('No valid voice ID provided, fetching a default voice...');
      const voices = await getVoices();
      if (!voices || !voices.length) {
        throw new Error('No voices available from ElevenLabs API');
      }
      voiceId = voices[0].voice_id;
      logger.info(`Using default voice ID: ${voiceId}`);
    }

    // Updated default options with newer model
    const defaultOptions = {
      model_id: 'eleven_turbo_v2', // Updated to use newer model
      stability: 0.5,
      similarity_boost: 0.75
    };
    
    const requestOptions = {
      ...defaultOptions,
      ...options
    };
    
    logger.info(`Requesting TTS: Voice ID: ${voiceId}, Model: ${requestOptions.model_id}, Text length: ${text.length}`);
    
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/text-to-speech/${voiceId}`,
      data: {
        text,
        ...requestOptions
      },
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      responseType: 'arraybuffer'
    });
    
    logger.info(`Successfully generated speech for text (${text.length} chars) with voice ${voiceId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error generating speech: ${error.message}`);
    if (error.response) {
      logger.error(`ElevenLabs API Error - Status: ${error.response.status}`);
      // Handle non-binary response errors
      if (error.response.data && !Buffer.isBuffer(error.response.data)) {
        logger.error('Response data:', error.response.data);
      }
    }
    throw error;
  }
};

/**
 * Save generated audio to file
 * @param {Buffer} audioBuffer - Audio buffer to save
 * @param {string} filePath - Path to save the file
 * @returns {string} Full path to saved file
 */
const saveAudioToFile = async (audioBuffer, filePath) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, audioBuffer);
    logger.info(`Audio saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    logger.error(`Error saving audio file: ${error.message}`);
    throw error;
  }
};

/**
 * Stream text-to-speech in real-time (for live calls)
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - ID of the voice to use
 * @param {function} onChunk - Callback for audio chunks
 * @param {function} onDone - Callback when streaming is complete
 * @param {Object} options - Additional options for streaming
 */
const streamSpeechRealTime = async (text, voiceId, onChunk, onDone, options = {}) => {
  try {
    // Validate voiceId
    if (!voiceId || voiceId === 'default-voice-id') {
      logger.info('No valid voice ID provided for streaming, fetching a default voice...');
      const voices = await getVoices();
      if (!voices || !voices.length) {
        throw new Error('No voices available from ElevenLabs API');
      }
      voiceId = voices[0].voice_id;
      logger.info(`Using default voice ID for streaming: ${voiceId}`);
    }
    
    const defaultOptions = {
      model_id: 'eleven_turbo_v2', // Updated to use newer model
      stability: 0.5,
      similarity_boost: 0.75,
      output_format: 'mp3_44100'
    };
    
    const streamOptions = {
      ...defaultOptions,
      ...options
    };
    
    // Prepare the request payload
    const requestBody = {
      text,
      voice_id: voiceId,
      ...streamOptions
    };
    
    // Initialize WebSocket connection with API key in query parameter
    const ws = new WebSocket(`${WEBSOCKET_URL}/${voiceId}/stream-input?xi-api-key=${apiKey}`);
    
    // WebSocket event handlers
    ws.on('open', () => {
      logger.info(`WebSocket connection opened for streaming speech with voice ${voiceId}`);
      // Send the request as JSON
      ws.send(JSON.stringify(requestBody));
    });
    
    ws.on('message', (data) => {
      // Process incoming audio chunk
      const audioChunk = data;
      if (onChunk && typeof onChunk === 'function') {
        onChunk(audioChunk);
      }
    });
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      if (onDone && typeof onDone === 'function') {
        onDone();
      }
    });
    
    ws.on('error', (error) => {
      logger.error(`WebSocket error: ${error.message}`);
      ws.close();
      throw error;
    });
    
    return ws;
  } catch (error) {
    logger.error(`Error streaming speech: ${error.message}`);
    throw error;
  }
};

/**
 * Get the list of available voice clones or custom voices
 * @returns {Array} Available voice clones
 */
const getVoiceClones = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/voices/clones`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching voice clones: ${error.message}`);
    throw error;
  }
};

/**
 * Generate a dynamic conversational response using voice AI
 * @param {string} prompt - Conversation context or prompt
 * @param {string} voiceId - ID of the voice to use
 * @param {Array} history - Previous conversation history
 * @returns {Object} Response including audio and transcript
 */
const generateConversationalResponse = async (prompt, voiceId, history = []) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/conversation`, {
      prompt,
      voice_id: voiceId,
      history
    }, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Generated conversational response for prompt: ${prompt.substring(0, 50)}...`);
    return response.data;
  } catch (error) {
    logger.error(`Error generating conversational response: ${error.message}`);
    throw error;
  }
};

/**
 * Get available voice agents for automated calling
 * @returns {Array} Available voice agents
 */
const getAvailableVoiceAgents = async () => {
  try {
    logger.info('Getting available voice agents from ElevenLabs API');
    
    const response = await axios.get(`${API_BASE_URL}/conversation/agents`, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Retrieved ${response.data.agents?.length || 0} agents from ElevenLabs`);
    return response.data.agents || [];
  } catch (error) {
    logger.error(`Error fetching voice agents: ${error.message}`);
    if (error.response) {
      logger.error(`ElevenLabs API Error - Status: ${error.response.status}`);
      logger.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Get a specific voice agent by ID
 * @param {string} agentId - ID of the agent to fetch
 * @returns {Object} Agent details
 */
const getVoiceAgentById = async (agentId) => {
  try {
    logger.info(`Getting voice agent by ID from ElevenLabs API: ${agentId}`);
    
    const response = await axios.get(`${API_BASE_URL}/conversation/agents/${agentId}`, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Successfully retrieved agent: ${response.data.name || agentId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching voice agent: ${error.message}`);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }
      logger.error(`ElevenLabs API Error - Status: ${error.response.status}`);
      logger.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Update webhook URL for a voice agent
 * @param {string} agentId - ID of the agent to update
 * @param {string} webhookUrl - New webhook URL
 * @returns {Object} Updated agent details
 */
const updateAgentWebhook = async (agentId, webhookUrl) => {
  try {
    logger.info(`Updating webhook for agent ${agentId} to ${webhookUrl}`);
    
    // First get current agent configuration
    const agent = await getVoiceAgentById(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Prepare update payload
    const webhookConfig = {
      url: webhookUrl,
      enabled: true
    };
    
    // Update the agent with new webhook URL
    const response = await axios.patch(`${API_BASE_URL}/conversation/agents/${agentId}`, {
      webhook_config: webhookConfig
    }, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Successfully updated webhook for agent ${agentId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error updating agent webhook: ${error.message}`);
    if (error.response) {
      logger.error(`ElevenLabs API Error - Status: ${error.response.status}`);
      logger.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Submit audio for asynchronous speech-to-text processing
 * Uses the ElevenLabs async STT API with webhook callback
 * 
 * @param {Buffer} audioBuffer - Audio buffer to transcribe
 * @param {Object} options - STT options
 * @param {string} options.audioFormat - Format of audio ('mp3', 'wav', etc.)
 * @param {number} options.sampleRate - Sample rate of audio in Hz
 * @param {string} options.callId - Call ID for tracking purposes
 * @param {string} [options.webhookUrl] - Webhook URL for results (defaults to configured URL)
 * @returns {Promise<Object>} Response with request ID
 */
async function submitSpeechToTextAsync(audioBuffer, options) {
  try {
    const {
      audioFormat = 'wav',
      sampleRate = 8000,
      callId,
      // Get webhook URL directly from environment if available, otherwise from config
      webhookUrl = process.env.ELEVENLABS_WEBHOOK_URL || config.elevenLabs.webhook.url
    } = options || {};

    if (!audioBuffer) {
      throw new Error('Audio buffer is required');
    }

    if (!webhookUrl) {
      throw new Error('Webhook URL is required for async STT');
    }

    logger.info(`Submitting async STT request for call ${callId}`);

    // According to ElevenLabs API docs, we need to send the audio as a FormData object,
    // not as JSON with base64-encoded audio
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Ensure we have proper WAV formatting for ElevenLabs STT
    let processedAudioBuffer = audioBuffer;
    const fileExtension = audioFormat.toLowerCase() || 'wav';
    
    // If the format is WAV but doesn't have proper WAV headers, format it
    if (fileExtension === 'wav' && !hasWavHeader(audioBuffer)) {
      logger.info('Adding WAV headers to audio for proper format');
      processedAudioBuffer = await formatAsWav(audioBuffer, sampleRate);
      logger.info(`Formatted audio as WAV: ${processedAudioBuffer.length} bytes`);
    }
    
    // Map common audio formats to their correct MIME types
    let contentType;
    switch (fileExtension) {
      case 'wav':
        contentType = 'audio/wav';
        break;
      case 'mp3':
        contentType = 'audio/mpeg';
        break;
      case 'raw':
        contentType = 'audio/x-mulaw';
        break;
      default:
        contentType = `audio/${fileExtension}`;
    }
    
    // Log detailed diagnostic info
    logger.info(`Submitting audio to ElevenLabs:` + 
      `\n - Format: ${fileExtension}` + 
      `\n - Content type: ${contentType}` + 
      `\n - Sample rate: ${sampleRate} Hz` + 
      `\n - Audio size: ${processedAudioBuffer.length} bytes`
    );
    
    formData.append('file', processedAudioBuffer, {
      filename: `audio-${Date.now()}.${fileExtension}`,
      contentType
    });
    
    // Add other parameters with valid model ID as per API docs
    formData.append('model_id', 'scribe_v1');
    
    // Add webhook parameter for async processing
    formData.append('callback', webhookUrl);
    
    // Add metadata for callback using the correct field name
    // Store call ID in callback_metadata which will be returned in the webhook payload
    const metadata = {
      call_id: callId,
      request_time: new Date().toISOString(),
      request_id: options.requestId || `req_${Date.now()}`
    };
    formData.append('callback_metadata', JSON.stringify(metadata));
    
    // For audio properties - don't add if already in WAV format
    if (fileExtension !== 'wav' && sampleRate) {
      formData.append('sample_rate', sampleRate.toString());
    }
    
    // For language identification
    formData.append('language_identification', 'true');

    // Send the request to ElevenLabs
    // Using the standard speech-to-text endpoint with webhook parameter set to true
    formData.append('webhook', 'true'); // Add webhook parameter to enable async processing
    
    // Make sure we have an API key, trying all possible sources
    const effectiveApiKey = apiKey || config.elevenLabs?.apiKey || process.env.ELEVENLABS_API_KEY;
    
    if (!effectiveApiKey) {
      throw new Error('CRITICAL: ElevenLabs API key is not configured.');
    }
    
    logger.debug(`Using API key for async STT: ${effectiveApiKey ? 'configured' : 'missing'}`);
    
    const response = await axios.post(`${API_BASE_URL}/speech-to-text`, formData, {
      headers: {
        'xi-api-key': effectiveApiKey,
        ...formData.getHeaders() // Let FormData set the correct content-type and boundaries
      }
    });

    // Enhanced debugging for the response
    logger.info(`Async STT response received: ${JSON.stringify(response.data)}`, { service: SERVICE_NAME });
    
    // Store the mapping between request_id and call_id for webhook processing
    const requestId = response.data.request_id;
    
    try {
      // Store mapping in database
      await SttRequestMapping.create({
        request_id: requestId,
        call_id: callId,
        metadata: metadata, // Store the full metadata
        status: 'pending',
        submitted_at: new Date()
      });
      
      logger.info(`Stored persistent mapping: request_id ${requestId} -> call_id ${callId}`);
    } catch (error) {
      logger.error(`Error storing STT request mapping: ${error.message}`);
      // Continue even if mapping fails - we don't want to fail the STT request
    }

    // Log success
    logger.info(`Async STT submission successful for call ${callId}, request ID: ${requestId}`);
    
    return {
      success: true,
      request_id: requestId,
      call_id: callId
    };

    if (!response.data?.request_id) {
      logger.warn(`Async STT submission for call ${callId} returned without request_id. Response: ${JSON.stringify(response.data)}`, { service: SERVICE_NAME });
    }

  } catch (error) {
    logger.error(`Error submitting async STT request: ${error.message}`);
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Check if an audio buffer already has WAV headers
 * @param {Buffer} audioBuffer - Audio buffer to check
 * @returns {boolean} True if buffer has WAV headers
 */
function hasWavHeader(audioBuffer) {
  // WAV files start with the 'RIFF' marker
  if (audioBuffer.length < 12) return false;
  
  const header = audioBuffer.slice(0, 4).toString();
  return header === 'RIFF';
}

/**
 * Format audio as WAV with proper headers
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @param {number} sampleRate - Sample rate of the audio (Hz)
 * @returns {Promise<Buffer>} WAV formatted buffer
 */
async function formatAsWav(audioBuffer, sampleRate = 16000) {
  return new Promise((resolve, reject) => {
    try {
      logger.info(`Converting ${audioBuffer.length} bytes of audio to WAV format at ${sampleRate}Hz`);
      
      // WAV writer with standard PCM format
      const writer = new wav.Writer({
        sampleRate: sampleRate,
        channels: 1,      // Mono
        bitDepth: 16      // 16-bit PCM
      });
      
      // Create a readable stream from the audio buffer
      const readableStream = new Readable();
      readableStream.push(audioBuffer);
      readableStream.push(null); // End of stream
      
      // Collect chunks of WAV data
      const wavChunks = [];
      writer.on('data', (chunk) => {
        wavChunks.push(chunk);
      });
      
      writer.on('end', () => {
        // Combine chunks into a single buffer
        const wavBuffer = Buffer.concat(wavChunks);
        logger.info(`Converted to WAV format: ${wavBuffer.length} bytes`);
        resolve(wavBuffer);
      });
      
      writer.on('error', (err) => {
        reject(err);
      });
      
      // Pipe the stream through the WAV writer
      readableStream.pipe(writer);
    } catch (error) {
      logger.error(`Error formatting audio as WAV: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Check ElevenLabs API health status
 * @returns {Promise<Object>} Health status object
 */
const checkApiHealth = async () => {
  try {
    const startTime = performance.now();
    
    // Log API key status for debugging
    logger.debug(`ElevenLabs API key status: ${apiKey ? 'present' : 'missing'}, length: ${apiKey?.length || 0}`);
    logger.debug(`API key from config: ${config.elevenLabs.apiKey ? 'present' : 'missing'}`);
    logger.debug(`API key from env: ${process.env.ELEVENLABS_API_KEY ? 'present' : 'missing'}`);
    
    // Use API key directly from environment if config value is undefined
    const effectiveApiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    
    // Check API connectivity with a lightweight call
    const response = await axios.get(`${API_BASE_URL}/models`, {
      headers: {
        'xi-api-key': effectiveApiKey
      },
      timeout: 5000 // 5 second timeout for health checks
    });
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Validate response has expected structure
    const isHealthy = response.status === 200 && 
                     Array.isArray(response.data?.models) && 
                     response.data.models.length > 0;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      responseTimeMs: responseTime,
      apiKey: effectiveApiKey ? 'configured' : 'missing',
      modelCount: response.data?.models?.length || 0,
      webhookUrl: config.elevenLabs.webhook?.url || 'not configured',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`ElevenLabs API health check failed: ${error.message}`);
    
    // Provide detailed diagnostics based on error type
    return {
      status: 'unhealthy',
      error: error.message,
      errorType: error.code || (error.response ? `HTTP_${error.response.status}` : 'UNKNOWN'),
      apiKey: apiKey ? 'configured' : 'missing',
      details: error.response ? 
        `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}` : 
        'Connection failed',
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  getVoices,
  getVoiceDetails,
  generateSpeech,
  saveAudioToFile,
  streamSpeechRealTime,
  getVoiceClones,
  generateConversationalResponse,
  getAvailableVoiceAgents,
  getVoiceAgentById,
  updateAgentWebhook,
  submitSpeechToTextAsync,
  getCallIdForRequestId,
  checkApiHealth,
  // Export utility functions for testing
  hasWavHeader,
  formatAsWav
};
