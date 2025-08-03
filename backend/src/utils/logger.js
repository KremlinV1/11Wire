/**
 * Logger utility for 11Wire
 * Centralizes logging configuration and integrates with Sentry
 */

const winston = require('winston');
const path = require('path');
const { Sentry } = require('./sentry');
const config = require('../config');

// Ensure logs directory exists in production
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (process.env.NODE_ENV === 'production') {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Sentry transport for Winston
class SentryTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.name = 'SentryTransport';
    this.level = opts.level || 'error';
  }

  log(info, callback) {
    const { level, message, ...meta } = info;
    
    if (level === 'error' || level === 'warn') {
      // If it's an Error object, capture it directly
      if (message instanceof Error) {
        Sentry.captureException(message, { extra: meta });
      } else {
        // Otherwise capture as message with context
        Sentry.captureMessage(message, {
          level: level === 'error' ? Sentry.Severity.Error : Sentry.Severity.Warning,
          extra: meta
        });
      }
    }
    
    callback();
  }
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || config.logging?.level || 'info',
  format: logFormat,
  defaultMeta: { service: '11wire-api', environment: process.env.NODE_ENV || 'development' },
  transports: [
    // Console logging
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          // Clean meta to prevent circular references and large objects
          const cleanMeta = {};
          Object.keys(meta).forEach(key => {
            // Skip traceId, requestId, etc as they're handled separately
            if (!['traceId', 'requestId', 'service', 'environment'].includes(key)) {
              cleanMeta[key] = meta[key];
            }
          });
          
          const traceInfo = meta.traceId ? ` [trace:${meta.traceId}]` : '';
          const requestInfo = meta.requestId ? ` [req:${meta.requestId}]` : '';
          
          return `${timestamp} [${level}]${traceInfo}${requestInfo}: ${message} ${
            Object.keys(cleanMeta).length ? JSON.stringify(cleanMeta) : ''
          }`;
        })
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // File logging - error level
  logger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'error.log'), 
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }));
  
  // File logging - all levels
  logger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }));
  
  // Add Sentry transport for error reporting
  logger.add(new SentryTransport({ level: 'error' }));
}

// Log unhandled exceptions and rejections
if (process.env.NODE_ENV === 'production') {
  // Capture uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.stack });
    Sentry.captureException(error);
    
    // Give Sentry time to send the error before shutting down
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Capture unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
  });
}

// Utility method to create a child logger with request context
logger.child = (meta) => {
  return winston.createLogger({
    level: logger.level,
    format: logger.format,
    defaultMeta: { ...logger.defaultMeta, ...meta },
    transports: logger.transports,
  });
};

// Stream for Morgan integration
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
