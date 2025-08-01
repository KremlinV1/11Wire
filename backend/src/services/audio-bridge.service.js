/**
 * Audio Bridge Service
 * Handles real-time audio bridging between SignalWire SIP calls and ElevenLabs services
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../config');
const elevenlabsService = require('./elevenlabs.service');
const wav = require('wav');
const pcmUtil = require('pcm-util');
const { Readable } = require('stream');
const { performance } = require('perf_hooks');
const { ULawDecoder, ALawDecoder, decodeULaw, decodeALaw } = require('../utils/audio-codecs');
const { 
  AudioBridgeError, 
  AudioFormatError, 
  ElevenLabsConnectionError, 
  SignalWireConnectionError,
  SpeechToTextError,
  TextToSpeechError,
  ResourceError,
  handleError
} = require('../utils/audio-bridge-error');

// Performance monitoring intervals (ms)
const PERF_LOG_INTERVAL = 30000; // Log performance metrics every 30 seconds
const HEALTH_CHECK_INTERVAL = 60000; // Check bridge health every minute

// ElevenLabs WebSocket URL for Speech-to-Text
// Base URL format is similar to TTS WebSocket URL
const EL_STT_WS_BASE_URL = 'wss://api.elevenlabs.io/v1/speech-to-text';

// Constants for audio processing
const MAX_AUDIO_CHUNKS = 1000;  // Maximum number of audio chunks to store
const DEFAULT_AUDIO_CHUNK_SIZE = 500000;  // 500 KB default maximum audio chunk size

// Health monitoring constants
const HEALTH_STATUS_EXPIRY = 60000; // Health status cache expiry (1 minute)
const ERROR_THRESHOLD_WARNING = 0.05; // 5% error rate triggers warning
const ERROR_THRESHOLD_CRITICAL = 0.20; // 20% error rate triggers critical
const PERFORMANCE_THRESHOLD_WARNING = 2000; // 2 second average processing time triggers warning
const PERFORMANCE_THRESHOLD_CRITICAL = 5000; // 5 second average processing time triggers critical

// Track service-wide metrics for health monitoring
let serviceHealthMetrics = {
  activeCallsCount: 0,
  totalCallsProcessed: 0,
  totalAudioChunksProcessed: 0,
  totalTranscriptionRequests: 0,
  successfulTranscriptions: 0,
  failedTranscriptions: 0,
  avgResponseTimeMs: 0,
  lastHealthCheck: null,
  status: 'initializing'
};

// Store active audio bridge sessions
const activeBridges = new Map();

/**
 * Audio Bridge Session Class
 * Manages the connection between SignalWire call audio and ElevenLabs services
 */
class AudioBridgeSession {
  constructor(callSid, voiceAgentId) {
    this.callSid = callSid;
    this.voiceAgentId = voiceAgentId;
    this.signalwireSocket = null;
    this.elevenlabsSttSocket = null;
    this.elevenlabsTtsSocket = null;
    this.isActive = false;
    this.conversationContext = [];
    this.audioBuffer = [];
    this.transcriptionInProgress = false;
    this.lastTranscriptionTime = 0;
    this.transcriptionQueue = [];
    this.mediaFormat = null;
  }

  /**
   * Initialize the audio bridge
   * @param {WebSocket} signalwireSocket - WebSocket connection from SignalWire
   * @param {Object} mediaFormat - Media format information from SignalWire
   * @param {Object} metadata - Call metadata
   */
  async initialize(signalwireSocket, mediaFormat, metadata = {}) {
    try {
      this.signalwireSocket = signalwireSocket;
      this.mediaFormat = mediaFormat;
      this.isActive = true;
      
      // Store the voice agent ID from metadata or use the one provided in constructor
      if (metadata && metadata.voiceAgentId) {
        this.voiceAgentId = metadata.voiceAgentId;
      }
      
      // Log session initialization
      logger.info(`Audio bridge session initialized for call ${this.callSid}`);
      logger.debug(`Media format: ${JSON.stringify(this.mediaFormat)}`);
      
      // Initialize connections to ElevenLabs services
      await this.initializeElevenLabsConnections();
      
      return true;
    } catch (error) {
      logger.error(`Error initializing audio bridge: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize connections to ElevenLabs services (STT and TTS)
   */
  async initializeElevenLabsConnections() {
    try {
      // Initialize Speech-to-Text WebSocket
      await this.initializeSpeechToText();
      
      // Wait for STT connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize Text-to-Speech WebSocket 
      // We'll use the existing streamSpeechRealTime function for TTS
      logger.info(`TTS connection ready for call ${this.callSid}`);
      
      return true;
    } catch (error) {
      logger.error(`Error initializing ElevenLabs connections: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize ElevenLabs Speech-to-Text using async API with webhooks
   */
  async initializeSpeechToText() {
    try {
      logger.info(`Initializing async STT for call ${this.callSid}`);
      
      // Initialize audio buffer collection for async STT
      this.audioChunks = [];
      this.isCollectingAudio = true;
      this.lastSttSubmission = 0;
      this.sttSubmissionMinInterval = 5000; // min 5 seconds between submissions
      this.audioChunkMaxSize = 1024 * 1024; // 1MB max audio size before submission
      
      // Set up event listener for STT results from webhook
      const eventEmitter = require('../utils/event-emitter');
      
      // Clean up any existing listeners
      eventEmitter.removeAllListeners(`stt-result:${this.callSid}`);
      
      // Create handler for STT results
      this.sttResultHandler = (result) => {
        if (result.call_id === this.callSid) {
          logger.info(`Received STT result for call ${this.callSid}`);
          this.handleSttResult(result);
        }
      };
      
      // Listen for STT results from webhook
      eventEmitter.on('stt-result', this.sttResultHandler);
      
      logger.info(`Async STT initialized for call ${this.callSid}`);
      return true;
    } catch (error) {
      logger.error(`Error initializing async STT: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Handle STT result from webhook
   * @param {Object} result - STT result from webhook
   */
  handleSttResult(result) {
    try {
      const { text, language } = result;
      
      if (!text) {
        logger.warn(`Received empty STT result for call ${this.callSid}`);
        return;
      }
      
      logger.info(`Processing STT result for call ${this.callSid}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      
      // Process transcription result
      const transcriptionResult = {
        text,
        language: language || 'en',
        final: true
      };
      
      // Handle the transcription like we would from WebSocket
      this.handleTranscription({
        type: 'transcript',
        text,
        language: language || 'en',
        is_final: true
      });
    } catch (error) {
      logger.error(`Error handling STT result: ${error.message}`);
    }
  }

  /**
   * Process incoming audio from SignalWire and collect for async STT
   * @param {Object} mediaChunk - Media chunk from SignalWire
   */
  async processSignalWireAudio(mediaChunk) {
    try {
      // Skip if session is not active or we're not collecting audio
      if (!this.isActive || !this.isCollectingAudio) {
        return; // Early return without logging for performance
      }
      
      // Only process inbound audio (from caller)
      if (mediaChunk.track !== 'inbound') {
        return; // Skip outbound audio without logging for performance
      }
      
      // Process audio chunk
      if (mediaChunk?.payload) { // Use optional chaining for performance
        // Initialize tracking counters if needed
        if (!this.chunksReceived) {
          this.chunksReceived = 0;
          this.totalAudioBytes = 0;
          this.processingTimes = [];
        }
        
        // Performance timing start
        const startTime = performance.now();
        
        // Decode base64 payload
        const audioBuffer = Buffer.from(mediaChunk.payload, 'base64');
        this.chunksReceived++;
        
        // Only log occasionally to reduce overhead
        if (this.chunksReceived % 250 === 0) {
          logger.info(`Received ${this.chunksReceived} audio chunks for call ${this.callSid}`);
        }
        
        // Process audio format for ElevenLabs compatibility - use cached format info when possible
        // Use non-blocking processing when possible
        const processedAudio = this.processAudioForElevenLabs(audioBuffer);
        
        // Add to collection for async submission
        if (processedAudio?.length > 0) { // Use optional chaining for performance
          // Use fixed-size circular buffer to prevent memory growth
          if (!this.maxBufferSize) {
            this.maxBufferSize = 500; // Max number of chunks to store (about 10s of audio)
          }
          
          // Implement circular buffer with fixed size
          this.audioChunks.push(processedAudio);
          if (this.audioChunks.length > this.maxBufferSize) {
            // Remove oldest chunk when buffer is full
            const removed = this.audioChunks.shift();
            this.totalAudioBytes -= removed.length || 0;
          }
          
          this.totalAudioBytes += processedAudio.length;
          
          // Performance tracking
          const processingTime = performance.now() - startTime;
          this.processingTimes.push(processingTime);
          
          // Keep only last 100 processing times
          if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
          }
          
          // Log performance metrics occasionally
          if (this.chunksReceived % 500 === 0) {
            const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
            logger.info(`Audio processing performance: avg=${avgProcessingTime.toFixed(2)}ms, chunks=${this.chunksReceived}, bytes=${this.totalAudioBytes}`);
          }
          
          // Check if we should submit audio for transcription - use throttled check
          if (!this.lastSubmitCheck || Date.now() - this.lastSubmitCheck > 1000) { // Check max once per second
            this.lastSubmitCheck = Date.now();
            await this.checkAndSubmitAudio();
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing SignalWire audio for call ${this.callSid}: ${error.message}`);
      // Only log stack trace for serious errors
      if (error.stack && (error.code === 'CRITICAL' || process.env.LOG_LEVEL === 'debug')) {
        logger.debug(`Stack trace: ${error.stack}`);
      }
    }
  }
  
  /**
   * Check if we should submit collected audio for async STT
   * @returns {Promise<boolean>} Whether audio was submitted
   */
  async checkAndSubmitAudio() {
    try {
      // Skip if submission is already in progress
      if (this.submissionInProgress) {
        return false;
      }

      const now = Date.now();
      
      // Skip if no audio chunks collected
      if (!this.audioChunks || this.audioChunks.length === 0) {
        return false;
      }
      
      // Use cached size calculation for performance
      const totalSize = this.totalAudioBytes || 0;
      
      // Optimize thresholds based on real-world data
      // Adaptive thresholds: adjust based on network conditions and transcription quality
      if (!this.adaptiveThresholds) {
        this.adaptiveThresholds = {
          // Start with default values
          minIntervalMs: this.sttSubmissionMinInterval || 2000,
          maxIntervalMs: 5000,
          minChunks: 10,
          optimalChunks: 25,
          // Track performance metrics
          successCount: 0,
          failureCount: 0,
          avgResponseTimeMs: 0
        };
      }
      
      // Determine if we should submit based on adaptive thresholds
      const timeSinceLastSubmission = now - (this.lastSttSubmission || 0);
      const timeThresholdMet = timeSinceLastSubmission >= this.adaptiveThresholds.minIntervalMs;
      const maxTimeThresholdMet = timeSinceLastSubmission >= this.adaptiveThresholds.maxIntervalMs;
      const sizeThresholdMet = totalSize >= this.audioChunkMaxSize;
      const minChunksThresholdMet = this.audioChunks.length >= this.adaptiveThresholds.minChunks;
      const optimalChunksReached = this.audioChunks.length >= this.adaptiveThresholds.optimalChunks;
      
      // Log the current status less frequently to reduce overhead
      if (this.audioChunks.length % 100 === 0) {
        logger.debug(`Audio collection status for call ${this.callSid}: ` + 
          `chunks=${this.audioChunks.length}, ` + 
          `size=${totalSize}, ` + 
          `timeSince=${timeSinceLastSubmission}ms`);
      }
      
      // Submit if thresholds are met using prioritization logic
      // 1. Optimal chunks reached and minimum time passed - best quality/latency balance
      // 2. Maximum time threshold met - ensure we're not waiting too long
      // 3. Size threshold met - prevent buffer overflow
      if ((optimalChunksReached && timeThresholdMet) || maxTimeThresholdMet || sizeThresholdMet) {
        // Set flag to prevent concurrent submissions
        this.submissionInProgress = true;
        
        // Performance timing
        const submissionStartTime = performance.now();
        
        // Take a copy of audio chunks and reset collection immediately to allow
        // new audio to be processed in parallel while we submit this batch
        const audioChunksToSubmit = [...this.audioChunks];
        const chunksCount = audioChunksToSubmit.length;
        const sizeToSubmit = totalSize;
        
        // Reset collection to allow parallel processing
        this.audioChunks = [];
        this.totalAudioBytes = 0;
        this.lastSttSubmission = now;
        
        logger.info(`Submitting ${chunksCount} audio chunks (${sizeToSubmit} bytes) for async STT - call ${this.callSid}`);
        
        try {
          // Concatenate chunks efficiently
          const concatenatedAudio = Buffer.concat(audioChunksToSubmit);
          
          // Free memory explicitly
          audioChunksToSubmit.length = 0;
          
          // Submit to ElevenLabs async STT
          const result = await this.submitAudioForTranscription(concatenatedAudio);
          
          // Update adaptive thresholds based on success
          if (result) {
            this.adaptiveThresholds.successCount++;
            const processingTime = performance.now() - submissionStartTime;
            
            // Update running average of response time
            this.adaptiveThresholds.avgResponseTimeMs = 
              (this.adaptiveThresholds.avgResponseTimeMs * (this.adaptiveThresholds.successCount - 1) + processingTime) / 
              this.adaptiveThresholds.successCount;
            
            // Optimize thresholds based on performance
            if (this.adaptiveThresholds.successCount % 10 === 0) {
              this._adjustThresholds();
            }
          } else {
            this.adaptiveThresholds.failureCount++;
          }
          
          // Clear submission flag
          this.submissionInProgress = false;
          return !!result;
        } catch (error) {
          // Update failure count for threshold adjustment
          this.adaptiveThresholds.failureCount++;
          throw error; // Re-throw to be caught by outer try/catch
        }
      }
      
      return false; // No submission made
    } catch (error) {
      // Reset submission flag on error
      this.submissionInProgress = false;
      
      // Only log errors occasionally to prevent log spam
      if (!this.submissionErrorCount) this.submissionErrorCount = 0;
      if (this.submissionErrorCount < 5) {
        logger.error(`Error submitting audio for call ${this.callSid}: ${error.message}`);
        if (process.env.LOG_LEVEL === 'debug' && error.stack) {
          logger.debug(`Stack trace: ${error.stack}`);
        }
        this.submissionErrorCount++;
      }
      return false;
    }
  }
  
  /**
   * Adjust audio processing thresholds based on performance metrics
   * @private
   */
  _adjustThresholds() {
    try {
      const { successCount, failureCount, avgResponseTimeMs } = this.adaptiveThresholds;
      const successRate = successCount / (successCount + failureCount || 1);
      
      // Adjust based on success rate and response time
      if (successRate > 0.95) {
        // High success rate, optimize for performance
        if (avgResponseTimeMs < 1000) {
          // Fast responses, we can be more aggressive
          this.adaptiveThresholds.minIntervalMs = Math.max(1000, this.adaptiveThresholds.minIntervalMs - 200);
          this.adaptiveThresholds.optimalChunks = Math.max(15, this.adaptiveThresholds.optimalChunks - 2);
        } else {
          // Slower responses, be more conservative
          this.adaptiveThresholds.minIntervalMs = Math.min(3000, this.adaptiveThresholds.minIntervalMs + 200);
        }
      } else if (successRate < 0.8) {
        // Lower success rate, be more conservative
        this.adaptiveThresholds.minIntervalMs = Math.min(4000, this.adaptiveThresholds.minIntervalMs + 500);
        this.adaptiveThresholds.optimalChunks = Math.min(40, this.adaptiveThresholds.optimalChunks + 5);
      }
      
      logger.info(`Adjusted audio thresholds for call ${this.callSid}: ` + 
        `minInterval=${this.adaptiveThresholds.minIntervalMs}ms, ` + 
        `optimalChunks=${this.adaptiveThresholds.optimalChunks}, ` + 
        `successRate=${(successRate * 100).toFixed(1)}%, ` + 
        `avgResponse=${avgResponseTimeMs.toFixed(0)}ms`);
    } catch (error) {
      logger.warn(`Error adjusting thresholds: ${error.message}`);
      // Don't let threshold adjustment failures impact the main processing
    }
  }
  
  /**
   * Submit audio for async transcription
   * @param {Buffer} audioBuffer - Audio buffer to transcribe
   * @returns {Promise<Object|null>} Response from ElevenLabs or null on error
   */
  async submitAudioForTranscription(audioBuffer) {
    // Performance monitoring
    const startTime = performance.now();
    const submissionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    try {
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new AudioFormatError('No audio to submit for transcription', {
          callSid: this.callSid,
          severity: 'WARNING',
          retryable: false
        });
      }
      
      // Get audio format details
      const sourceFormat = this.getSourceFormat();
      
      // IMPORTANT: Always convert to WAV format for ElevenLabs STT compatibility
      // regardless of what getElevenLabsCompatibleFormat returns
      const audioFormat = 'wav';
      
      // Log detailed diagnostic info but less verbose in production
      if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
        logger.info(`Submitting async STT request [${submissionId}] for call ${this.callSid}:` +
          `\n - Format: ${audioFormat} (always using WAV for STT)` +
          `\n - Sample rate: ${sourceFormat.sampleRate || 8000} Hz` +
          `\n - Audio size: ${audioBuffer.length} bytes` +
          `\n - Webhook URL: ${config.elevenLabs.webhook?.url || 'NOT CONFIGURED'}`
        );
      } else {
        logger.info(`Submitting STT request [${submissionId}] for call ${this.callSid}: ${audioBuffer.length} bytes`);
      }
      
      // First, check if webhook URL is configured
      if (!config.elevenLabs.webhook?.url) {
        throw new SpeechToTextError('Webhook URL is not configured. Required for async STT.', {
          callSid: this.callSid,
          severity: 'CRITICAL',
          code: 'WEBHOOK_CONFIG_ERROR',
          retryable: false
        });
      }
      
      // Verify API key is present
      if (!config.elevenLabs.apiKey) {
        throw new ElevenLabsConnectionError('ElevenLabs API key is not configured.', {
          callSid: this.callSid,
          severity: 'CRITICAL',
          code: 'API_KEY_CONFIG_ERROR',
          retryable: false
        });
      }
      
      // Convert audio to WAV format if needed
      let processedAudio = audioBuffer;
      
      // Get target format for ElevenLabs (16kHz PCM WAV)
      const targetFormat = this.getTargetFormat();
      
      // Convert audio to proper format for ElevenLabs
      logger.debug(`Converting audio from ${sourceFormat.codec || 'unknown'} to WAV for STT submission`);
      processedAudio = await this.convertAudioFormat(audioBuffer, sourceFormat, targetFormat);
      
      // Use the async STT method from ElevenLabs service with timeout
      try {
        const result = await Promise.race([
          elevenlabsService.submitSpeechToTextAsync(processedAudio, {
            audioFormat: audioFormat,  // Always use WAV format
            sampleRate: targetFormat.sampleRate, // Use 16kHz sample rate
            callId: this.callSid,
            outputLanguages: ['en'],  // Force English output for consistency
            webhookUrl: config.elevenLabs.webhook.url,
            // Include submission ID for tracking
            metadata: { submissionId }
          }),
          // Timeout after 10 seconds to prevent hanging
          new Promise((_, reject) => 
            setTimeout(() => reject(new ElevenLabsConnectionError('STT submission timed out', { 
              callSid: this.callSid,
              code: 'SUBMISSION_TIMEOUT',
              retryable: true
            })), 10000)
          )
        ]);
        
        // Store the request ID to track this submission
        if (result && result.request_id) {
          this.lastSttRequestId = result.request_id;
          this.pendingSttRequests = this.pendingSttRequests || [];
          
          // Track submission details for monitoring
          this.pendingSttRequests.push({
            requestId: result.request_id,
            submissionId,
            timestamp: Date.now(),
            audioSize: processedAudio.length,
            processingTimeMs: Math.round(performance.now() - startTime)
          });
          
          // Limit pending requests array size to prevent memory leaks
          if (this.pendingSttRequests.length > 100) {
            this.pendingSttRequests = this.pendingSttRequests.slice(-50);
          }
          
          // Log performance metrics
          const processingTime = Math.round(performance.now() - startTime);
          logger.info(`Async STT submission [${submissionId}] successful for call ${this.callSid}, request ID: ${result.request_id}, processed in ${processingTime}ms`);
          
          return result;
        } else {
          throw new SpeechToTextError('ElevenLabs STT submission returned without request_id', {
            callSid: this.callSid,
            context: { result },
            code: 'MISSING_REQUEST_ID',
            retryable: true
          });
        }
      } catch (apiError) {
        // Handle specific API errors with more context
        if (apiError.response?.status) {
          const status = apiError.response.status;
          const errorData = apiError.response.data || {};
          
          throw new ElevenLabsConnectionError(
            `ElevenLabs API error (${status}): ${errorData.detail || apiError.message}`, {
            callSid: this.callSid,
            context: { 
              statusCode: status,
              errorDetail: errorData.detail || null,
              submissionId
            },
            code: status === 429 ? 'RATE_LIMIT_EXCEEDED' : `API_ERROR_${status}`,
            retryable: status >= 500 || status === 429 // Server errors and rate limits are retryable
          });
        }
        
        // Re-throw other errors
        throw apiError;
      }
    } catch (error) {
      // Use our error handling utility for standardized error handling
      const audioBridgeError = error instanceof AudioBridgeError ? error : 
        new SpeechToTextError(`Error submitting STT: ${error.message}`, {
          callSid: this.callSid,
          context: { 
            originalError: error.message,
            submissionId,
            audioBufferSize: audioBuffer?.length || 0
          },
          retryable: error.message.includes('timeout') || error.message.includes('network')
        });
      
      // Log with standard format through our handler
      handleError(audioBridgeError);
      
      // Track error metrics
      if (!this.sttErrors) this.sttErrors = { count: 0, byType: {} };
      this.sttErrors.count++;
      
      // Track error types for monitoring
      const errorType = audioBridgeError.code || 'UNKNOWN';
      this.sttErrors.byType[errorType] = (this.sttErrors.byType[errorType] || 0) + 1;
      
      // Log error distribution occasionally
      if (this.sttErrors.count % 10 === 0) {
        logger.warn(`STT error distribution for call ${this.callSid}: ${JSON.stringify(this.sttErrors.byType)}`);
      }
      
      return null;
    } finally {
      // Track performance metrics regardless of outcome
      const processingTime = Math.round(performance.now() - startTime);
      if (!this.sttSubmissionTimes) this.sttSubmissionTimes = [];
      this.sttSubmissionTimes.push(processingTime);
      
      // Trim array to prevent memory bloat
      if (this.sttSubmissionTimes.length > 100) {
        this.sttSubmissionTimes = this.sttSubmissionTimes.slice(-50);
      }
    }
  }

  /**
   * Process audio data for ElevenLabs compatibility
   * @param {Buffer} audioBuffer - Raw audio buffer from SignalWire
   * @returns {Buffer} - Processed audio buffer compatible with ElevenLabs
   */
  processAudioForElevenLabs(audioBuffer) {
    try {
      // Fast path: If we've already determined the format is compatible, use cached result
      if (this.formatsCompatible === true) {
        return audioBuffer;
      }
      
      // If no media format is available, return the original buffer
      if (!this.mediaFormat) {
        // Only log this warning once
        if (!this.warnedAboutFormat) {
          logger.warn('No media format information available for audio conversion');
          this.warnedAboutFormat = true;
        }
        return audioBuffer;
      }
      
      // Use cached format details if available (computed once)
      if (!this.sourceFormat) {
        this.sourceFormat = this.getSourceFormat();
        this.targetFormat = this.getTargetFormat();
        
        // Check if formats are compatible (computed once)
        this.formatsCompatible = (
          this.sourceFormat.codec === this.targetFormat.codec && 
          this.sourceFormat.sampleRate === this.targetFormat.sampleRate && 
          this.sourceFormat.channels === this.targetFormat.channels
        );
        
        if (this.formatsCompatible) {
          logger.info(`Audio formats are compatible, no conversion needed for call ${this.callSid}`);
          return audioBuffer;
        }
        
        // Initialize converters once
        if (this.sourceFormat.codec === 'mulaw' && !this.ulawDecoder) {
          this.ulawDecoder = new ULawDecoder(this.sourceFormat);
        } else if (this.sourceFormat.codec === 'alaw' && !this.alawDecoder) {
          this.alawDecoder = new ALawDecoder(this.sourceFormat);
        }
      }
      
      // Fast path: If formats are compatible, return original
      if (this.formatsCompatible) {
        return audioBuffer;
      }
      
      // Perform format conversion - use optimized path based on format
      return this.convertAudioFormat(audioBuffer, this.sourceFormat, this.targetFormat);
    } catch (error) {
      // Only log first few errors to avoid log spam
      if (!this.conversionErrorCount) this.conversionErrorCount = 0;
      if (this.conversionErrorCount < 5) {
        logger.error(`Error processing audio for ElevenLabs: ${error.message}`);
        this.conversionErrorCount++;
      }
      // Return original audio as fallback
      return audioBuffer;
    }
  }
  
  /**
   * Get source audio format details from SignalWire media format
   * @returns {Object} Source format details
   */
  getSourceFormat() {
    const defaultFormat = {
      codec: 'pcm',
      sampleRate: 8000,
      channels: 1,
      bitDepth: 8
    };
    
    if (!this.mediaFormat) return defaultFormat;
    
    const format = {
      sampleRate: this.mediaFormat.sampleRate || 8000,
      channels: this.mediaFormat.channels || 1,
      bitDepth: 8
    };
    
    // Determine codec from encoding
    if (this.mediaFormat.encoding) {
      if (this.mediaFormat.encoding.includes('mulaw')) {
        format.codec = 'mulaw';
      } else if (this.mediaFormat.encoding.includes('alaw')) {
        format.codec = 'alaw';
      } else {
        format.codec = 'pcm';
        format.bitDepth = this.mediaFormat.bitDepth || 16;
      }
    }
    
    return format;
  }
  
  /**
   * Get target audio format details for ElevenLabs
   * @returns {Object} Target format details
   */
  getTargetFormat() {
    // ElevenLabs typically wants PCM at 16kHz
    return {
      codec: 'pcm',
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
    };
  }
  
  /**
   * Convert audio from source format to target format
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {Object} sourceFormat - Source audio format details
   * @param {Object} targetFormat - Target audio format details
   * @returns {Buffer} - Converted audio buffer
   */
  convertAudioFormat(audioBuffer, sourceFormat, targetFormat) {
    // Validate inputs
    if (!audioBuffer || audioBuffer.length === 0) {
      handleError(new AudioFormatError('Empty audio buffer provided for conversion', {
        callSid: this.callSid,
        severity: 'WARNING',
        context: { sourceFormat, targetFormat }
      }));
      return audioBuffer; // Return empty buffer
    }
    
    try {
      // Performance tracking
      const conversionStartTime = performance.now();
      
      // Use cached conversion path for performance
      if (!this.conversionPath) {
        // Determine the conversion path once and cache it
        this.conversionPath = [];
        
        // Step 1: Codec conversion if needed
        if (sourceFormat.codec === 'mulaw') {
          this.conversionPath.push('mulaw_to_pcm');
        } else if (sourceFormat.codec === 'alaw') {
          this.conversionPath.push('alaw_to_pcm');
        }
        
        // Step 2: Sample rate conversion if needed
        if (sourceFormat.sampleRate !== targetFormat.sampleRate) {
          this.conversionPath.push('resample');
        }
        
        // Step 3: Bit depth conversion if needed
        if (sourceFormat.bitDepth !== targetFormat.bitDepth) {
          this.conversionPath.push('bit_depth');
        }
        
        logger.info(`Audio conversion path for call ${this.callSid}: ${this.conversionPath.join(' -> ') || 'none'}`); 
      }
      
      // Fast path: no conversion needed
      if (this.conversionPath.length === 0) {
        return audioBuffer;
      }
      
      // Apply the conversion steps in sequence
      let pcmData = audioBuffer;
      let currentStep = '';
      
      try {
        // Use optimized conversion path with cached converters
        for (const step of this.conversionPath) {
          currentStep = step;
          
          switch (step) {
            case 'mulaw_to_pcm':
              // Use cached decoder for better performance
              if (!this.ulawDecoder) {
                pcmData = this.decodeULaw(pcmData);
              } else {
                pcmData = this.ulawDecoder.decode(pcmData);
              }
              break;
            case 'alaw_to_pcm':
              // Use cached decoder for better performance
              if (!this.alawDecoder) {
                pcmData = this.decodeALaw(pcmData);
              } else {
                pcmData = this.alawDecoder.decode(pcmData);
              }
              break;
            case 'resample':
              // Use cached resampler for better performance
              if (!this.resampler) {
                this.resampler = {
                  sourceFormat,
                  targetFormat,
                  resample: (buffer) => this.resamplePcm(buffer, sourceFormat, targetFormat)
                };
              }
              pcmData = this.resampler.resample(pcmData);
              break;
            case 'bit_depth':
              // Use cached converter for better performance
              if (!this.bitDepthConverter) {
                this.bitDepthConverter = {
                  sourceBitDepth: sourceFormat.bitDepth,
                  targetBitDepth: targetFormat.bitDepth,
                  convert: (buffer) => this.convertBitDepth(buffer, sourceFormat.bitDepth, targetFormat.bitDepth)
                };
              }
              pcmData = this.bitDepthConverter.convert(pcmData);
              break;
          }
        }
        
        // Track performance metrics
        const conversionTime = performance.now() - conversionStartTime;
        if (!this.conversionTimes) this.conversionTimes = [];
        this.conversionTimes.push(conversionTime);
        
        // Log performance metrics occasionally
        if (this.conversionTimes.length % 100 === 0) {
          const avgTime = this.conversionTimes.slice(-100).reduce((a, b) => a + b, 0) / Math.min(this.conversionTimes.length, 100);
          logger.debug(`Audio conversion performance: avg=${avgTime.toFixed(2)}ms, call=${this.callSid}`);
          
          // Trim array to prevent memory bloat
          if (this.conversionTimes.length > 1000) {
            this.conversionTimes = this.conversionTimes.slice(-500);
          }
        }
        
        return pcmData;
      } catch (stepError) {
        // Handle specific conversion step errors
        throw new AudioFormatError(`Failed during audio conversion step '${currentStep}'`, {
          callSid: this.callSid,
          context: { 
            step: currentStep, 
            sourceFormat, 
            targetFormat,
            originalError: stepError.message,
            audioLength: audioBuffer.length
          },
          retryable: true
        });
      }
    } catch (error) {
      // Use our error handling utility for consistent error handling
      const audioBridgeError = error instanceof AudioBridgeError ? error : 
        new AudioFormatError(`Error converting audio format: ${error.message}`, {
          callSid: this.callSid,
          context: { 
            sourceFormat, 
            targetFormat,
            conversionPath: this.conversionPath?.join(' -> ') || 'unknown',
            originalError: error.message
          }
        });
      
      // Log with rate limiting to prevent spam
      if (!this.conversionErrorCount) this.conversionErrorCount = 0;
      if (this.conversionErrorCount < 5) {
        handleError(audioBridgeError);
        this.conversionErrorCount++;
      } else if (this.conversionErrorCount === 5) {
        // Log that we're suppressing further errors
        logger.warn(`Suppressing additional audio format conversion errors for call ${this.callSid}`);
        this.conversionErrorCount++;
      }
      
      // Every 500 errors, log one to ensure we're still aware of ongoing issues
      if (this.conversionErrorCount > 5 && this.conversionErrorCount % 500 === 0) {
        handleError(audioBridgeError);
      }
      
      // Return original buffer as fallback
      return audioBuffer;
    }
  }
  
  /**
   * Decode μ-law audio to PCM
   * @param {Buffer} buffer - μ-law encoded buffer
   * @returns {Buffer} - PCM buffer
   */
  decodeULaw(buffer) {
    // μ-law decoding table
    const ULAW_TABLE = new Int16Array([
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
      -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
      -876, -844, -812, -780, -748, -716, -684, -652,
      -620, -588, -556, -524, -492, -460, -428, -396,
      -372, -356, -340, -324, -308, -292, -276, -260,
      -244, -228, -212, -196, -180, -164, -148, -132,
      -120, -112, -104, -96, -88, -80, -72, -64,
      -56, -48, -40, -32, -24, -16, -8, 0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
      7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
      5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
      3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
      2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
      1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
      1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
      876, 844, 812, 780, 748, 716, 684, 652,
      620, 588, 556, 524, 492, 460, 428, 396,
      372, 356, 340, 324, 308, 292, 276, 260,
      244, 228, 212, 196, 180, 164, 148, 132,
      120, 112, 104, 96, 88, 80, 72, 64,
      56, 48, 40, 32, 24, 16, 8, 0
    ]);
    
    const result = Buffer.alloc(buffer.length * 2);
    
    for (let i = 0; i < buffer.length; i++) {
      const sample = ULAW_TABLE[buffer[i] & 0xFF];
      result.writeInt16LE(sample, i * 2);
    }
    
    return result;
  }
  
  /**
   * Decode a-law audio to PCM
   * @param {Buffer} buffer - A-law encoded buffer
   * @returns {Buffer} - PCM buffer
   */
  decodeALaw(buffer) {
    // a-law decoding table
    const ALAW_TABLE = new Int16Array([
      -5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736,
      -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784,
      -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368,
      -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392,
      -22016, -20992, -24064, -23040, -17920, -16896, -19968, -18944,
      -30208, -29184, -32256, -31232, -26112, -25088, -28160, -27136,
      -11008, -10496, -12032, -11520, -8960, -8448, -9984, -9472,
      -15104, -14592, -16128, -15616, -13056, -12544, -14080, -13568,
      -344, -328, -376, -360, -280, -264, -312, -296,
      -472, -456, -504, -488, -408, -392, -440, -424,
      -88, -72, -120, -104, -24, -8, -56, -40,
      -216, -200, -248, -232, -152, -136, -184, -168,
      -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184,
      -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696,
      -688, -656, -752, -720, -560, -528, -624, -592,
      -944, -912, -1008, -976, -816, -784, -880, -848,
      5504, 5248, 6016, 5760, 4480, 4224, 4992, 4736,
      7552, 7296, 8064, 7808, 6528, 6272, 7040, 6784,
      2752, 2624, 3008, 2880, 2240, 2112, 2496, 2368,
      3776, 3648, 4032, 3904, 3264, 3136, 3520, 3392,
      22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944,
      30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136,
      11008, 10496, 12032, 11520, 8960, 8448, 9984, 9472,
      15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568,
      344, 328, 376, 360, 280, 264, 312, 296,
      472, 456, 504, 488, 408, 392, 440, 424,
      88, 72, 120, 104, 24, 8, 56, 40,
      216, 200, 248, 232, 152, 136, 184, 168,
      1376, 1312, 1504, 1440, 1120, 1056, 1248, 1184,
      1888, 1824, 2016, 1952, 1632, 1568, 1760, 1696,
      688, 656, 752, 720, 560, 528, 624, 592,
      944, 912, 1008, 976, 816, 784, 880, 848
    ]);
    
    const result = Buffer.alloc(buffer.length * 2);
    
    for (let i = 0; i < buffer.length; i++) {
      const sample = ALAW_TABLE[buffer[i] & 0xFF];
      result.writeInt16LE(sample, i * 2);
    }
    
    return result;
  }
  
  /**
   * Resample PCM audio to a different sample rate
   * @param {Buffer} buffer - PCM buffer
   * @param {Object} sourceFormat - Source format details
   * @param {Object} targetFormat - Target format details
   * @returns {Buffer} - Resampled PCM buffer
   */
  resamplePcm(buffer, sourceFormat, targetFormat) {
    try {
      // Simple nearest-neighbor resampling (not high quality but fast)
      const sourceSamples = buffer.length / (sourceFormat.bitDepth / 8);
      const targetSamples = Math.floor(sourceSamples * targetFormat.sampleRate / sourceFormat.sampleRate);
      const bytesPerSample = targetFormat.bitDepth / 8;
      const result = Buffer.alloc(targetSamples * bytesPerSample);
      
      for (let i = 0; i < targetSamples; i++) {
        const sourceIdx = Math.floor(i * sourceFormat.sampleRate / targetFormat.sampleRate);
        
        if (sourceFormat.bitDepth === 8 && targetFormat.bitDepth === 16) {
          // 8-bit to 16-bit
          const value = buffer[sourceIdx];
          // Scale 8-bit (0-255) to 16-bit (-32768 to 32767)
          const scaled = ((value - 128) * 256);
          result.writeInt16LE(scaled, i * 2);
        } else if (sourceFormat.bitDepth === 16 && targetFormat.bitDepth === 16) {
          // 16-bit to 16-bit (copy)
          const value = buffer.readInt16LE(sourceIdx * 2);
          result.writeInt16LE(value, i * 2);
        } else {
          // Default fallback (copy without conversion)
          for (let b = 0; b < bytesPerSample; b++) {
            result[i * bytesPerSample + b] = buffer[(sourceIdx * sourceFormat.bitDepth / 8) + (b % (sourceFormat.bitDepth / 8))];
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Error resampling PCM: ${error.message}`);
      return buffer; // Return original as fallback
    }
  }
  
  /**
   * Convert PCM bit depth
   * @param {Buffer} buffer - PCM buffer
   * @param {number} sourceBitDepth - Source bit depth
   * @param {number} targetBitDepth - Target bit depth
   * @returns {Buffer} - Converted PCM buffer
   */
  convertBitDepth(buffer, sourceBitDepth, targetBitDepth) {
    try {
      if (sourceBitDepth === targetBitDepth) {
        return buffer; // No conversion needed
      }
      
      const sourceBytesPerSample = sourceBitDepth / 8;
      const targetBytesPerSample = targetBitDepth / 8;
      const sourceSamples = buffer.length / sourceBytesPerSample;
      const result = Buffer.alloc(sourceSamples * targetBytesPerSample);
      
      // 8-bit to 16-bit conversion
      if (sourceBitDepth === 8 && targetBitDepth === 16) {
        for (let i = 0; i < sourceSamples; i++) {
          const sample = buffer[i];
          // Convert 8-bit unsigned (0-255) to 16-bit signed (-32768 to 32767)
          const sample16 = ((sample - 128) * 256);
          result.writeInt16LE(sample16, i * targetBytesPerSample);
        }
      } 
      // 16-bit to 8-bit conversion
      else if (sourceBitDepth === 16 && targetBitDepth === 8) {
        for (let i = 0; i < sourceSamples; i++) {
          const sample = buffer.readInt16LE(i * sourceBytesPerSample);
          // Convert 16-bit signed (-32768 to 32767) to 8-bit unsigned (0-255)
          const sample8 = (sample / 256) + 128;
          result[i] = Math.max(0, Math.min(255, Math.floor(sample8)));
        }
      } 
      // Other conversions (not implemented)
      else {
        logger.warn(`Bit depth conversion from ${sourceBitDepth} to ${targetBitDepth} not implemented`);
        return buffer; // Return original as fallback
      }
      
      return result;
    } catch (error) {
      logger.error(`Error converting bit depth: ${error.message}`);
      return buffer; // Return original as fallback
    }
  }

  /**
   * Handle transcription from ElevenLabs
   * @param {Object} response - Transcription response
   */
  async handleTranscription(response) {
    try {
      const now = Date.now();
      
      // If this is a final transcription result
      if (response.transcription && response.finalized) {
        const transcript = response.transcription.trim();
        
        // Only process if we have actual content
        if (!transcript) return;
        
        logger.info(`Transcription for call ${this.callSid}: "${transcript}"`);
        
        // Add to conversation context
        this.conversationContext.push({
          role: 'user',
          content: transcript
        });
        
        // Generate AI response
        await this.generateAiResponse(transcript);
        
        // Update last transcription time
        this.lastTranscriptionTime = now;
      }
      // Handle intermediate results if desired
    } catch (error) {
      logger.error(`Error handling transcription: ${error.message}`);
    }
  }

  /**
   * Generate AI response to user input
   * @param {string} userInput - User's transcribed speech
   */
  async generateAiResponse(userInput) {
    try {
      if (this.transcriptionInProgress) {
        // Queue this request
        this.transcriptionQueue.push(userInput);
        return;
      }
      
      this.transcriptionInProgress = true;
      
      // Generate response using ElevenLabs conversational API
      const response = await elevenlabsService.generateConversationalResponse(
        userInput, 
        this.voiceAgentId,
        this.conversationContext
      );
      
      // Add AI response to conversation context
      if (response && response.text) {
        this.conversationContext.push({
          role: 'assistant',
          content: response.text
        });
        
        // Trim conversation context if it gets too long
        if (this.conversationContext.length > 20) {
          this.conversationContext = this.conversationContext.slice(this.conversationContext.length - 20);
        }
        
        // Stream the response back to the call
        await this.streamResponseToCall(response.text);
      }
      
      this.transcriptionInProgress = false;
      
      // Process next item in queue if any
      if (this.transcriptionQueue.length > 0) {
        const nextInput = this.transcriptionQueue.shift();
        await this.generateAiResponse(nextInput);
      }
    } catch (error) {
      logger.error(`Error generating AI response: ${error.message}`);
      this.transcriptionInProgress = false;
    }
  }

  /**
   * Stream AI response back to the call
   * @param {string} responseText - Text to convert to speech
   */
  async streamResponseToCall(responseText) {
    try {
      // Use ElevenLabs to generate streaming audio
      const ws = await elevenlabsService.streamSpeechRealTime(
        responseText,
        this.voiceAgentId,
        (audioChunk) => {
          // Send audio chunk to SignalWire if connection is open
          if (this.signalwireSocket && 
              this.signalwireSocket.readyState === WebSocket.OPEN) {
            
            // Format the audio chunk for SignalWire
            const signalwireAudioMessage = {
              event: 'media',
              media: {
                track: 'outbound',
                chunk: Date.now().toString(),
                payload: audioChunk.toString('base64')
              }
            };
            
            this.signalwireSocket.send(JSON.stringify(signalwireAudioMessage));
          }
        },
        () => {
          logger.info(`Finished streaming response for call ${this.callSid}`);
        },
        { output_format: this.getElevenLabsCompatibleFormat(this.mediaFormat) }
      );
      
      // Store the TTS socket for cleanup
      this.elevenlabsTtsSocket = ws;
    } catch (error) {
      logger.error(`Error streaming response to call: ${error.message}`);
    }
  }

  /**
   * Map SignalWire audio format to ElevenLabs compatible format
   * @param {Object} mediaFormat - SignalWire media format
   * @returns {string} ElevenLabs compatible format
   */
  getElevenLabsCompatibleFormat(mediaFormat) {
    // Default to MP3 if we can't determine format
    if (!mediaFormat || !mediaFormat.encoding) {
      return 'mp3_44100';
    }
    
    // Map SignalWire format to ElevenLabs format
    if (mediaFormat.encoding.includes('mulaw')) {
      // μ-law is typically 8kHz
      return 'pcm_mulaw';
    } else if (mediaFormat.encoding.includes('alaw')) {
      return 'pcm_alaw';
    } else if (mediaFormat.encoding.includes('pcm')) {
      return 'pcm_16000';
    }
    
    // Default
    return 'mp3_44100';
  }

  /**
   * Close all connections and clean up resources
   */
  async close() {
    try {
      logger.info(`Closing audio bridge for call ${this.callSid}`);
      this.isActive = false;
      
      // Close ElevenLabs STT connection if open
      if (this.elevenlabsSttSocket && 
          this.elevenlabsSttSocket.readyState === WebSocket.OPEN) {
        
        // Send stop message
        this.elevenlabsSttSocket.send(JSON.stringify({
          action: 'stop'
        }));
        
        this.elevenlabsSttSocket.close();
        this.elevenlabsSttSocket = null;
      }
      
      // Close ElevenLabs TTS connection if open
      if (this.elevenlabsTtsSocket && 
          this.elevenlabsTtsSocket.readyState === WebSocket.OPEN) {
        
        this.elevenlabsTtsSocket.close();
        this.elevenlabsTtsSocket = null;
      }
      
      // SignalWire socket should be closed by the caller
      this.signalwireSocket = null;
      
      return true;
    } catch (error) {
      logger.error(`Error closing audio bridge: ${error.message}`);
      return false;
    }
  }
}

/**
 * Create a new audio bridge session
 * @param {string} callSid - Call SID
 * @param {string} voiceAgentId - Voice agent ID
 * @returns {AudioBridgeSession} New audio bridge session
 */
const createAudioBridge = (callSid, voiceAgentId) => {
  const bridge = new AudioBridgeSession(callSid, voiceAgentId);
  activeBridges.set(callSid, bridge);
  return bridge;
};

/**
 * Get an existing audio bridge session
 * @param {string} callSid - Call SID
 * @returns {AudioBridgeSession|null} Audio bridge session or null if not found
 */
const getAudioBridge = (callSid) => {
  return activeBridges.get(callSid) || null;
};

/**
 * Close and remove an audio bridge session
 * @param {string} callSid - Call SID
 * @returns {boolean} Success status
 */
const closeAudioBridge = async (callSid) => {
  try {
    const bridge = activeBridges.get(callSid);
    if (!bridge) return true;
    
    await bridge.close();
    activeBridges.delete(callSid);
    
    logger.info(`Audio bridge for call ${callSid} closed and removed`);
    return true;
  } catch (error) {
    logger.error(`Error closing audio bridge for call ${callSid}: ${error.message}`);
    return false;
  }
};

/**
 * Get basic health status of the audio bridge service
 * @returns {Promise<Object>} Health status object
 */
const getHealthStatus = async () => {
  try {
    // Only recalculate health status if expired
    if (!serviceHealthMetrics.lastHealthCheck || 
        Date.now() - serviceHealthMetrics.lastHealthCheck > HEALTH_STATUS_EXPIRY) {
      await _updateHealthMetrics();
    }
    
    return {
      status: serviceHealthMetrics.status,
      activeCalls: serviceHealthMetrics.activeCallsCount,
      successRate: serviceHealthMetrics.totalTranscriptionRequests > 0 ?
        (serviceHealthMetrics.successfulTranscriptions / serviceHealthMetrics.totalTranscriptionRequests) : 1,
      avgResponseTimeMs: Math.round(serviceHealthMetrics.avgResponseTimeMs),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error getting audio bridge health: ${error.message}`);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get detailed health status of the audio bridge service
 * @returns {Promise<Object>} Detailed health status object
 */
const getDetailedHealthStatus = async () => {
  try {
    // Always refresh metrics for detailed status
    await _updateHealthMetrics();
    
    // Get per-call metrics
    const callMetrics = [];
    activeBridges.forEach((bridge, callSid) => {
      callMetrics.push({
        callSid,
        sessionStartTime: bridge.sessionStartTime,
        sessionDuration: Date.now() - bridge.sessionStartTime,
        chunksProcessed: bridge.chunksReceived || 0,
        bytesProcessed: bridge.totalAudioBytes || 0,
        transcriptionRequests: bridge.pendingSttRequests?.length || 0,
        avgProcessingTime: bridge.sttSubmissionTimes?.length > 0 ? 
          bridge.sttSubmissionTimes.reduce((a, b) => a + b, 0) / bridge.sttSubmissionTimes.length : 0,
        errors: bridge.sttErrors || { count: 0 }
      });
    });
    
    return {
      status: serviceHealthMetrics.status,
      timestamp: new Date().toISOString(),
      metrics: {
        global: {
          totalCallsProcessed: serviceHealthMetrics.totalCallsProcessed,
          activeCallsCount: serviceHealthMetrics.activeCallsCount,
          totalAudioChunksProcessed: serviceHealthMetrics.totalAudioChunksProcessed,
          transcriptionRequests: serviceHealthMetrics.totalTranscriptionRequests,
          successfulTranscriptions: serviceHealthMetrics.successfulTranscriptions,
          failedTranscriptions: serviceHealthMetrics.failedTranscriptions,
          successRate: serviceHealthMetrics.totalTranscriptionRequests > 0 ?
            (serviceHealthMetrics.successfulTranscriptions / serviceHealthMetrics.totalTranscriptionRequests) : 1,
          avgResponseTimeMs: Math.round(serviceHealthMetrics.avgResponseTimeMs)
        },
        activeCalls: callMetrics,
        errorDistribution: _collectErrorDistribution()
      },
      diagnostics: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  } catch (error) {
    logger.error(`Error getting detailed audio bridge health: ${error.message}`);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Update service-wide health metrics
 * @private
 */
const _updateHealthMetrics = async () => {
  try {
    // Count active bridges
    serviceHealthMetrics.activeCallsCount = activeBridges.size;
    
    // Collect error statistics across all bridges
    let totalErrors = 0;
    let totalRequests = 0;
    let totalResponseTime = 0;
    let responseSamples = 0;
    
    // Process metrics from all active bridges
    activeBridges.forEach(bridge => {
      // Collect transcription metrics
      if (bridge.pendingSttRequests) {
        totalRequests += bridge.pendingSttRequests.length;
      }
      
      // Collect error metrics
      if (bridge.sttErrors) {
        totalErrors += bridge.sttErrors.count || 0;
      }
      
      // Collect performance metrics
      if (bridge.sttSubmissionTimes && bridge.sttSubmissionTimes.length > 0) {
        totalResponseTime += bridge.sttSubmissionTimes.reduce((a, b) => a + b, 0);
        responseSamples += bridge.sttSubmissionTimes.length;
      }
    });
    
    // Update global metrics
    serviceHealthMetrics.totalTranscriptionRequests += totalRequests;
    serviceHealthMetrics.failedTranscriptions += totalErrors;
    serviceHealthMetrics.successfulTranscriptions += (totalRequests - totalErrors);
    
    if (responseSamples > 0) {
      // Update rolling average of response time
      const newAvgTime = totalResponseTime / responseSamples;
      serviceHealthMetrics.avgResponseTimeMs = 
        (serviceHealthMetrics.avgResponseTimeMs * 0.7) + (newAvgTime * 0.3); // Weighted average
    }
    
    // Determine service status based on metrics
    const errorRate = serviceHealthMetrics.totalTranscriptionRequests > 0 ?
      serviceHealthMetrics.failedTranscriptions / serviceHealthMetrics.totalTranscriptionRequests : 0;
    
    // Update service status based on error rate and performance
    if (errorRate > ERROR_THRESHOLD_CRITICAL || 
        serviceHealthMetrics.avgResponseTimeMs > PERFORMANCE_THRESHOLD_CRITICAL) {
      serviceHealthMetrics.status = 'critical';
    } else if (errorRate > ERROR_THRESHOLD_WARNING || 
               serviceHealthMetrics.avgResponseTimeMs > PERFORMANCE_THRESHOLD_WARNING) {
      serviceHealthMetrics.status = 'degraded';
    } else {
      serviceHealthMetrics.status = 'healthy';
    }
    
    // Update last check timestamp
    serviceHealthMetrics.lastHealthCheck = Date.now();
    
    return serviceHealthMetrics;
  } catch (error) {
    logger.error(`Error updating health metrics: ${error.message}`);
    serviceHealthMetrics.status = 'unknown';
    serviceHealthMetrics.lastHealthCheck = Date.now();
    return serviceHealthMetrics;
  }
};

/**
 * Collect error distribution across all bridges
 * @private
 * @returns {Object} Aggregated error distribution
 */
const _collectErrorDistribution = () => {
  const errorTypes = {};
  
  // Collect errors from all bridges
  activeBridges.forEach(bridge => {
    if (bridge.sttErrors && bridge.sttErrors.byType) {
      Object.entries(bridge.sttErrors.byType).forEach(([type, count]) => {
        errorTypes[type] = (errorTypes[type] || 0) + count;
      });
    }
  });
  
  return errorTypes;
};

module.exports = {
  createAudioBridge,
  getAudioBridge,
  closeAudioBridge,
  activeBridges,
  getHealthStatus,
  getDetailedHealthStatus
};
