/**
 * Test Agent API Endpoints Directly
 * This script tests the agent endpoints directly without going through the test framework
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Define test server URL
const API_URL = 'http://localhost:3000/api';

// Start server in test mode first using a separate terminal:
// NODE_ENV=test node src/server.js

async function testAgentEndpoints() {
  try {
    logger.info('Starting agent endpoints test...');
    
    // Test 1: GET all agents
    logger.info('Test 1: GET /api/agents - List all configured agents');
    try {
      const listResponse = await axios.get(`${API_URL}/agents`);
      logger.info(`Response status: ${listResponse.status}`);
      logger.info(`Response data: ${JSON.stringify(listResponse.data)}`);
    } catch (error) {
      logger.error(`Error testing GET /api/agents: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error(error.stack);
    }
    
    // Test 2: GET agent by ID
    const testAgentId = 'test-agent-id';
    logger.info(`Test 2: GET /api/agents/${testAgentId} - Get agent by ID`);
    try {
      const getResponse = await axios.get(`${API_URL}/agents/${testAgentId}`);
      logger.info(`Response status: ${getResponse.status}`);
      logger.info(`Response data: ${JSON.stringify(getResponse.data)}`);
    } catch (error) {
      logger.error(`Error testing GET /api/agents/${testAgentId}: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error(error.stack);
    }
    
    // Test 3: POST to create new agent
    const newAgentId = 'test-new-agent';
    logger.info(`Test 3: POST /api/agents/${newAgentId} - Create new agent`);
    try {
      const createData = {
        name: 'New Test Agent',
        description: 'Created by test script',
        isActive: true,
        settings: { voiceId: 'test-voice' },
        promptSettings: { greeting: 'Hello, I am a test agent' }
      };
      
      const createResponse = await axios.post(
        `${API_URL}/agents/${newAgentId}`,
        createData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      logger.info(`Response status: ${createResponse.status}`);
      logger.info(`Response data: ${JSON.stringify(createResponse.data)}`);
    } catch (error) {
      logger.error(`Error testing POST /api/agents/${newAgentId}: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error(error.stack);
    }
    
    // Test 4: PUT to update agent
    logger.info(`Test 4: PUT /api/agents/${testAgentId} - Update agent`);
    try {
      const updateData = {
        name: 'Updated Test Agent',
        description: 'Updated by test script',
        settings: { voiceId: 'updated-voice' }
      };
      
      const updateResponse = await axios.put(
        `${API_URL}/agents/${testAgentId}`,
        updateData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      logger.info(`Response status: ${updateResponse.status}`);
      logger.info(`Response data: ${JSON.stringify(updateResponse.data)}`);
    } catch (error) {
      logger.error(`Error testing PUT /api/agents/${testAgentId}: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error(error.stack);
    }
    
    logger.info('Agent endpoint tests complete.');
  } catch (error) {
    logger.error(`Error in test script: ${error.message}`);
    logger.error(error.stack);
  }
}

// Run the tests
testAgentEndpoints();
