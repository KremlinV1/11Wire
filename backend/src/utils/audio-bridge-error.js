/**
 * Audio Bridge Error Handling Utility
 * Specialized error types and handling for audio bridge service
 */

const logger = require('./logger');

/**
 * Base class for Audio Bridge specific errors
 */
class AudioBridgeError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'AUDIO_BRIDGE_ERROR';
    this.callSid = options.callSid;
    this.timestamp = new Date();
    this.retryable = options.retryable !== undefined ? options.retryable : true;
    this.severity = options.severity || 'ERROR';
    this.context = options.context || {};
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Log this error with appropriate level and context
   */
  log() {
    const errorContext = {
      name: this.name,
      code: this.code,
      callSid: this.callSid,
      timestamp: this.timestamp,
      retryable: this.retryable,
      context: this.context
    };

    switch (this.severity) {
      case 'CRITICAL':
        logger.error(`CRITICAL: ${this.message}`, errorContext);
        break;
      case 'ERROR':
        logger.error(this.message, errorContext);
        break;
      case 'WARNING':
        logger.warn(this.message, errorContext);
        break;
      default:
        logger.info(this.message, errorContext);
    }

    return this;
  }
}

/**
 * Error class for Audio Format issues
 */
class AudioFormatError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'AUDIO_FORMAT_ERROR'
    });
  }
}

/**
 * Error class for ElevenLabs API connection issues
 */
class ElevenLabsConnectionError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'ELEVENLABS_CONNECTION_ERROR',
      retryable: options.retryable !== undefined ? options.retryable : true
    });
  }
}

/**
 * Error class for SignalWire connection issues
 */
class SignalWireConnectionError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'SIGNALWIRE_CONNECTION_ERROR',
      retryable: options.retryable !== undefined ? options.retryable : true
    });
  }
}

/**
 * Error class for Speech-to-Text issues
 */
class SpeechToTextError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'STT_ERROR'
    });
  }
}

/**
 * Error class for Text-to-Speech issues
 */
class TextToSpeechError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'TTS_ERROR'
    });
  }
}

/**
 * Error class for resource management issues (memory, buffers, etc.)
 */
class ResourceError extends AudioBridgeError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'RESOURCE_ERROR',
      severity: options.severity || 'CRITICAL'
    });
  }
}

/**
 * Handle an error with standard logging and potential recovery actions
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context for the error
 * @returns {AudioBridgeError} The processed error
 */
function handleError(error, context = {}) {
  // If already an AudioBridgeError, just add context and log
  if (error instanceof AudioBridgeError) {
    error.context = { ...error.context, ...context };
    return error.log();
  }

  // Convert regular error to AudioBridgeError
  const audioBridgeError = new AudioBridgeError(error.message, {
    callSid: context.callSid,
    context: {
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    }
  });

  return audioBridgeError.log();
}

module.exports = {
  AudioBridgeError,
  AudioFormatError,
  ElevenLabsConnectionError,
  SignalWireConnectionError,
  SpeechToTextError,
  TextToSpeechError,
  ResourceError,
  handleError
};
