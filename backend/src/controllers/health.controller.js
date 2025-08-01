/**
 * Health Check Controller
 * Provides system health status endpoints
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { performance } = require('perf_hooks');

// Import service instances we want to monitor
const elevenlabsService = require('../services/elevenlabs.service');
const audioBridgeService = require('../services/audio-bridge.service');

/**
 * @route GET /api/health
 * @desc Get system health status
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const startTime = performance.now();
    const services = {};
    let overallStatus = 'healthy';
    
    // Get backend basic health status
    services.backend = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Get audio bridge health
    try {
      const audioBridgeHealth = await audioBridgeService.getHealthStatus();
      services.audioBridge = audioBridgeHealth;
      
      if (audioBridgeHealth.status !== 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      services.audioBridge = {
        status: 'unhealthy',
        error: error.message
      };
      overallStatus = 'degraded';
      logger.error(`Error checking audio bridge health: ${error.message}`);
    }
    
    // Check ElevenLabs API status
    try {
      const elevenlabsHealth = await elevenlabsService.checkApiHealth();
      services.elevenlabs = elevenlabsHealth;
      
      if (elevenlabsHealth.status !== 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      services.elevenlabs = {
        status: 'unhealthy',
        error: error.message
      };
      overallStatus = 'degraded';
      logger.error(`Error checking ElevenLabs API health: ${error.message}`);
    }
    
    const responseTime = Math.round(performance.now() - startTime);
    
    return res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/audio-bridge
 * @desc Get detailed audio bridge health metrics
 * @access Public
 */
router.get('/audio-bridge', async (req, res) => {
  try {
    const health = await audioBridgeService.getDetailedHealthStatus();
    return res.json(health);
  } catch (error) {
    logger.error(`Audio bridge health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
