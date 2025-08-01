/**
 * Authentication Middleware
 * 
 * Handles API authentication and authorization
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware to validate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateToken = (req, res, next) => {
  // For development, allow requests through without authentication
  // In a production environment, this should properly validate JWT tokens
  logger.debug('Authentication middleware bypassed for development');
  
  // Add a placeholder user to the request
  req.user = {
    id: 'dev-user',
    role: 'admin',
    email: 'dev@example.com'
  };
  
  next();
};

/**
 * Check if the user has admin privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  // For development, allow all requests through as admin
  // In a production environment, this should properly check user roles
  logger.debug('Admin access granted for development');
  next();
};

/**
 * Check if the user has specific permission
 * @param {string} permission - Permission to check
 * @returns {Function} Middleware function
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    // For development, grant all permissions
    // In a production environment, this should properly check user permissions
    logger.debug(`Permission '${permission}' granted for development`);
    next();
  };
};

module.exports = {
  validateToken,
  requireAdmin,
  hasPermission
};
