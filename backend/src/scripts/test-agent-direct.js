/**
 * Direct Test for Agent Controller
 * Tests the agent controller functions directly without HTTP server
 * Uses a simpler mocking approach without Jest dependencies
 */

const agentController = require('../controllers/elevenlabs-agent.controller');
const db = require('../models');
const logger = require('../utils/logger');

// Simple mock for Express response
function createMockResponse() {
  const res = {
    statusCode: 0,
    responseData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.responseData = data;
      return this;
    }
  };
  return res;
}

// Simple mock for Express request
function createMockRequest(params = {}, query = {}, body = {}) {
  return { params, query, body };
}

async function testAgentController() {
  try {
    logger.info('Starting direct agent controller tests...');
    
    // Test 1: List all agent configurations
    logger.info('Test 1: listConfiguredAgents');
    try {
      const req = createMockRequest({}, {});
      const res = createMockResponse();
      
      await agentController.listConfiguredAgents(req, res);
      
      logger.info(`Status code: ${res.statusCode}`);
      logger.info(`Response: ${JSON.stringify(res.responseData)}`);
    } catch (error) {
      logger.error(`Error in listConfiguredAgents: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 2: Create test agent config in database directly
    logger.info('Test 2: Creating test agent config in database');
    try {
      const testAgent = await db.AgentConfig.create({
        agentId: 'test-agent-1',
        name: 'Test Agent',
        description: 'Created for testing',
        isActive: true,
        settings: { voiceId: 'test-voice-id' },
        promptSettings: { greeting: 'Hello, I am a test agent' }
      });
      
      logger.info(`Created test agent: ${JSON.stringify(testAgent.toJSON())}`);
    } catch (error) {
      logger.error(`Error creating test agent: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 3: Get agent by ID
    logger.info('Test 3: getAgentConfig');
    try {
      const req = createMockRequest({ agentId: 'test-agent-1' });
      const res = createMockResponse();
      
      await agentController.getAgentConfig(req, res);
      
      logger.info(`Status code: ${res.statusCode}`);
      logger.info(`Response: ${JSON.stringify(res.responseData)}`);
    } catch (error) {
      logger.error(`Error in getAgentConfig: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 4: Save (update) agent config
    logger.info('Test 4: saveAgentConfig (update)');
    try {
      const req = createMockRequest(
        { agentId: 'test-agent-1' },
        {},
        {
          name: 'Updated Test Agent',
          description: 'Updated for testing',
          settings: { voiceId: 'updated-voice-id' }
        }
      );
      const res = createMockResponse();
      
      await agentController.saveAgentConfig(req, res);
      
      logger.info(`Status code: ${res.statusCode}`);
      logger.info(`Response: ${JSON.stringify(res.responseData)}`);
    } catch (error) {
      logger.error(`Error in saveAgentConfig: ${error.message}`);
      logger.error(error.stack);
    }
    
    logger.info('Direct agent controller tests complete.');
  } catch (error) {
    logger.error(`Error in test script: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Clean up test data
    try {
      await db.AgentConfig.destroy({ where: { agentId: 'test-agent-1' } });
      logger.info('Test data cleaned up');
    } catch (error) {
      logger.error(`Error cleaning up test data: ${error.message}`);
    }
    
    // Close database connection
    await db.sequelize.close();
  }
}

// Run the tests
testAgentController();
