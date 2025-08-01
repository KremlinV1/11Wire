/**
 * Debug Agent API Endpoints
 * This script adds detailed error logging to help diagnose HTTP 500 errors
 */

const express = require('express');
const routes = require('../routes');
const db = require('../models');
const logger = require('../utils/logger');
const cors = require('cors');
const helmet = require('helmet');

// Create Express app with error logging middleware
const app = express();

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Standard middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add detailed error tracking middleware
app.use((req, res, next) => {
  // Store the original res.json method
  const originalJson = res.json;
  
  // Override res.json to log responses
  res.json = function(body) {
    logger.info(`[DEBUG] Response for ${req.method} ${req.url} - Status: ${res.statusCode}`);
    return originalJson.call(this, body);
  };
  
  next();
});

// Register routes
app.use('/api', routes);

// Add enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error(`[DEBUG] Error in ${req.method} ${req.url}: ${err.message}`);
  logger.error(`[DEBUG] Error stack: ${err.stack}`);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: `${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Simple test function for agent endpoints
async function testAgentEndpoints() {
  try {
    const PORT = 3333; // Use a different port to avoid conflicts
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Debug server running on port ${PORT}`);
    });
    
    // Direct test of the ElevenLabs service and models
    logger.info('[TEST] Testing direct ElevenLabs service and model operations');
    
    // Import the ElevenLabs service
    const elevenlabsService = require('../services/elevenlabs.service');
    
    // Test the elevenlabs service directly
    try {
      logger.info('[TEST] Testing elevenlabs.service.js operation directly');
      
      // Check if ElevenLabs service is properly initialized
      if (!elevenlabsService) {
        logger.error('[TEST] ElevenLabs service is not properly imported');
      } else {
        logger.info('[TEST] ElevenLabs service imported successfully');
        
        // Check service methods
        const serviceMethods = Object.keys(elevenlabsService);
        logger.info(`[TEST] Available ElevenLabs service methods: ${serviceMethods.join(', ')}`);
        
        // Check if required methods are available
        const requiredMethods = [
          'getAvailableVoiceAgents', 
          'getVoiceAgentById',
          'updateAgentWebhook'
        ];
        
        const missingMethods = requiredMethods.filter(method => !serviceMethods.includes(method));
        if (missingMethods.length > 0) {
          logger.error(`[TEST] Missing required ElevenLabs service methods: ${missingMethods.join(', ')}`);
        } else {
          logger.info('[TEST] All required ElevenLabs service methods are available');
        }
        
        // Test creating and reading from the AgentConfig model directly
        logger.info('[TEST] Testing direct database operations on agent_configs table');
        
        try {
          // Check if table exists
          const [results] = await db.sequelize.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agent_configs')"
          );
          const tableExists = results[0].exists;
          
          logger.info(`[TEST] agent_configs table exists: ${tableExists}`);
          
          if (tableExists) {
            // Try to create a test record directly
            const testAgent = await db.AgentConfig.create({
              agentId: 'direct-test-agent-' + Date.now(),
              name: 'Test Agent (Direct)',
              description: 'Created via direct model test',
              isActive: true,
              settings: { test: true }
            });
            
            logger.info(`[TEST] Successfully created test agent with ID: ${testAgent.id}`);
            
            // Try to retrieve it
            const retrievedAgent = await db.AgentConfig.findByPk(testAgent.id);
            logger.info(`[TEST] Successfully retrieved test agent: ${retrievedAgent.name}`);
            
            // Try SQL query directly
            const [agentRecords] = await db.sequelize.query('SELECT * FROM agent_configs');
            logger.info(`[TEST] Raw SQL query found ${agentRecords.length} agent records`);
          }
        } catch (dbError) {
          logger.error(`[TEST] Direct database operations failed: ${dbError.message}`);
          logger.error(dbError.stack);
        }
      }
    } catch (serviceError) {
      logger.error(`[TEST] Error testing ElevenLabs service: ${serviceError.message}`);
      logger.error(serviceError.stack);
    }
    
    // Now test via HTTP endpoints
    const request = require('axios');
    const baseUrl = `http://localhost:${PORT}/api`;
    
    // Test getting all agents via HTTP
    try {
      logger.info('[TEST] Testing GET /api/agents endpoint via HTTP');
      const response = await request.get(`${baseUrl}/agents`);
      logger.info(`Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      logger.error(`Error testing GET /api/agents: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error('No response object available (connection error)');
      }
    }
    
    // Test getting agent by ID via HTTP
    try {
      const testAgentId = 'test-agent-id';
      logger.info(`[TEST] Testing GET /api/agents/${testAgentId} endpoint via HTTP`);
      const response = await request.get(`${baseUrl}/agents/${testAgentId}`);
      logger.info(`Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      logger.error(`Error testing GET /api/agents/test-agent-id: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error('No response object available (connection error)');
      }
    }
    
    // Close server and database connection
    server.close(() => {
      logger.info('Debug server closed');
      db.sequelize.close();
    });
    
  } catch (error) {
    logger.error(`Main error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Connect to database and run tests
db.sequelize.authenticate()
  .then(() => {
    logger.info('Database connected');
    return testAgentEndpoints();
  })
  .catch(err => {
    logger.error(`Database connection error: ${err.message}`);
    process.exit(1);
  });
