/**
 * Request logging middleware
 * Provides request tracking with unique IDs and performance monitoring
 */
const { v4: uuidv4 } = require('uuid');
const { startTransaction } = require('../utils/sentry');
const logger = require('../utils/logger');

// Generate a unique request ID and set up logging context
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Create request-specific logger
  req.logger = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Track request timing
  req.startTime = Date.now();
  
  // Start Sentry transaction for performance monitoring
  const transaction = startTransaction(
    `${req.method} ${req.path}`,
    'http.server'
  );
  
  // Add transaction to request for later use
  req.transaction = transaction;
  
  // Log request start
  req.logger.debug(`Request started`);
  
  // Track response completion
  res.on('finish', () => {
    // Calculate request duration
    const duration = Date.now() - req.startTime;
    
    // Log at appropriate level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 
                     'debug';
    
    req.logger[logLevel](`Request completed`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    
    // Finish Sentry transaction
    if (req.transaction) {
      req.transaction.setHttpStatus(res.statusCode);
      req.transaction.finish();
    }
  });
  
  next();
};

module.exports = requestLogger;
