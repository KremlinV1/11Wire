/**
 * Global error handler middleware
 * Captures errors and sends to Sentry
 */
const { captureException } = require('../utils/sentry');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Get request-specific logger if available
  const log = req.logger || logger;
  
  // Determine if this is an operational error (expected) or programming error
  const isOperationalError = err.isOperational === true;
  
  // Log error details
  log.error(`Error occurred: ${err.message}`, {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      isOperational
    },
    path: req.path,
    method: req.method
  });
  
  // Send to Sentry if it's not an operational error
  if (!isOperationalError) {
    captureException(err, {
      user: req.user, // If you have auth implemented
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers
      }
    });
  }
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Prepare response
  const response = {
    status: 'error',
    message: isOperationalError || process.env.NODE_ENV !== 'production' 
      ? err.message 
      : 'An unexpected error occurred',
    requestId: req.requestId
  };
  
  // Only include stack trace in development environment
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  // Send response
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
