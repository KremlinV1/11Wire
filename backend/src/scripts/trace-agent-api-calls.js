/**
 * Detailed Agent API Tracing Script
 * This script provides low-level tracing of agent API calls
 * to diagnose why they fail in Jest but work in direct Express
 */

require('dotenv').config({ path: '.env.test' });
const express = require('express');
const axios = require('axios');
const logger = require('../utils/logger');
const db = require('../models');
const cors = require('cors');
const helmet = require('helmet');

// Get the agent controller directly
const agentController = require('../controllers/elevenlabs-agent.controller');

// Create a minimal express app with advanced tracing
const app = express();

// Add request tracing
app.use((req, res, next) => {
  logger.info(`[TRACE] ${req.method} ${req.url} - Request started`);
  
  // Store original methods to trace
  const originalStatus = res.status;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Track response lifecycle
  res.status = function(code) {
    logger.info(`[TRACE] Setting status ${code} for ${req.method} ${req.url}`);
    return originalStatus.call(this, code);
  };
  
  res.json = function(body) {
    logger.info(`[TRACE] Response body for ${req.method} ${req.url}:`);
    if (body.error) {
      logger.error(`[TRACE] Error response: ${JSON.stringify(body)}`);
    } else {
      logger.info(`[TRACE] Success response with keys: ${Object.keys(body).join(', ')}`);
    }
    return originalJson.call(this, body);
  };
  
  res.end = function(...args) {
    logger.info(`[TRACE] ${req.method} ${req.url} - Response completed`);
    return originalEnd.apply(this, args);
  };
  
  // Add error handling
  res.logError = function(error) {
    logger.error(`[TRACE] Error in ${req.method} ${req.url}: ${error.message}`);
    logger.error(`[TRACE] Stack trace: ${error.stack}`);
  };
  
  next();
});

// Standard middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add special error interceptor for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[TRACE] Unhandled Rejection at:', promise);
  logger.error('[TRACE] Reason:', reason);
});

// Create test routes with direct controller access
app.get('/api/agents', (req, res) => {
  logger.info('[TRACE] Direct controller call to listConfiguredAgents');
  return agentController.listConfiguredAgents(req, res);
});

app.get('/api/agents/:agentId', (req, res) => {
  logger.info(`[TRACE] Direct controller call to getAgentConfig with ID: ${req.params.agentId}`);
  return agentController.getAgentConfig(req, res);
});

app.post('/api/agents/:agentId', (req, res) => {
  logger.info(`[TRACE] Direct controller call to saveAgentConfig with ID: ${req.params.agentId}`);
  return agentController.saveAgentConfig(req, res);
});

app.put('/api/agents/:agentId', (req, res) => {
  logger.info(`[TRACE] Direct controller call to saveAgentConfig (PUT) with ID: ${req.params.agentId}`);
  return agentController.saveAgentConfig(req, res);
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`[TRACE] Global error handler caught: ${err.message}`);
  logger.error(`[TRACE] Error stack: ${err.stack}`);
  res.status(500).json({
    success: false,
    error: err.message || 'Unknown error',
    trace: true
  });
});

// Function to run the test
async function runApiTests() {
  try {
    // Connect to database first
    await db.sequelize.authenticate();
    logger.info('[TRACE] Database connected successfully');

    // Start server
    const PORT = 3334;
    const server = app.listen(PORT, () => {
      logger.info(`[TRACE] Server running on port ${PORT}`);
    });

    // Test data
    const testAgent = {
      name: 'Test Agent',
      description: 'For integration testing',
      isActive: true,
      settings: { voiceId: 'test-voice' }
    };
    
    // Helper function
    const api = axios.create({
      baseURL: `http://localhost:${PORT}/api`,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });

    // Track agent ID from test
    let testAgentId;

    try {
      // Test 1: Create agent config
      logger.info('[TEST] Testing POST /agents/:agentId endpoint');
      const createResponse = await api.post('/agents/test-agent-id', testAgent);
      logger.info(`[TEST] Create response: ${JSON.stringify(createResponse.data)}`);
      testAgentId = createResponse.data.config.agentId;

      // Test 2: Get all agents
      logger.info('[TEST] Testing GET /agents endpoint');
      const listResponse = await api.get('/agents');
      logger.info(`[TEST] List response: ${JSON.stringify(listResponse.data)}`);

      // Test 3: Get agent by ID
      logger.info(`[TEST] Testing GET /agents/${testAgentId} endpoint`);
      const getResponse = await api.get(`/agents/${testAgentId}`);
      logger.info(`[TEST] Get response: ${JSON.stringify(getResponse.data)}`);

      // Test 4: Update agent
      logger.info(`[TEST] Testing PUT /agents/${testAgentId} endpoint`);
      const updateResponse = await api.put(`/agents/${testAgentId}`, {
        name: 'Updated Test Agent'
      });
      logger.info(`[TEST] Update response: ${JSON.stringify(updateResponse.data)}`);

      logger.info('[TEST] All tests completed successfully');

    } catch (apiError) {
      logger.error(`[TEST] API Error: ${apiError.message}`);
      if (apiError.response) {
        logger.error(`[TEST] Status code: ${apiError.response.status}`);
        logger.error(`[TEST] Response data: ${JSON.stringify(apiError.response.data)}`);
      } else {
        logger.error(`[TEST] No response object available`);
      }
    }

    // Clean up and close server
    server.close(() => {
      logger.info('[TRACE] Server closed');
      db.sequelize.close()
        .then(() => {
          logger.info('[TRACE] Database connection closed');
          process.exit(0);
        })
        .catch(err => {
          logger.error(`[TRACE] Error closing database: ${err.message}`);
          process.exit(1);
        });
    });

  } catch (mainError) {
    logger.error(`[TRACE] Main error: ${mainError.message}`);
    logger.error(mainError.stack);
    process.exit(1);
  }
}

// Run the tests
runApiTests();
