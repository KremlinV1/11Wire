/**
 * Direct Test for Agent Controller
 * Tests the agent controller functions directly without HTTP server
 */

const agentController = require('../controllers/elevenlabs-agent.controller');
const logger = require('../utils/logger');

// Mock Express request and response objects
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (params = {}, query = {}, body = {}) => ({
  params,
  query,
  body
});

async function testAgentController() {
  try {
    logger.info('Starting direct agent controller tests...');
    
    // Test 1: listConfiguredAgents
    logger.info('Test 1: listConfiguredAgents');
    try {
      const req = mockRequest({}, { active: 'true' });
      const res = mockResponse();
      
      await agentController.listConfiguredAgents(req, res);
      
      logger.info(`Response status: ${res.status.mock.calls[0][0]}`);
      logger.info(`Response data: ${JSON.stringify(res.json.mock.calls[0][0])}`);
    } catch (error) {
      logger.error(`Error testing listConfiguredAgents: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 2: getAgentConfig
    logger.info('Test 2: getAgentConfig');
    try {
      const req = mockRequest({ agentId: 'test-agent-id' });
      const res = mockResponse();
      
      await agentController.getAgentConfig(req, res);
      
      logger.info(`Response status: ${res.status.mock.calls[0][0]}`);
      logger.info(`Response data: ${JSON.stringify(res.json.mock.calls[0][0])}`);
    } catch (error) {
      logger.error(`Error testing getAgentConfig: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 3: saveAgentConfig (create)
    logger.info('Test 3: saveAgentConfig (create)');
    try {
      const req = mockRequest(
        { agentId: 'test-new-agent' },
        {},
        {
          name: 'New Test Agent',
          description: 'Created by test script',
          isActive: true,
          settings: { voiceId: 'test-voice' },
          promptSettings: { greeting: 'Hello, I am a test agent' }
        }
      );
      const res = mockResponse();
      
      await agentController.saveAgentConfig(req, res);
      
      logger.info(`Response status: ${res.status.mock.calls[0][0]}`);
      logger.info(`Response data: ${JSON.stringify(res.json.mock.calls[0][0])}`);
    } catch (error) {
      logger.error(`Error testing saveAgentConfig (create): ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test 4: saveAgentConfig (update)
    logger.info('Test 4: saveAgentConfig (update)');
    try {
      const req = mockRequest(
        { agentId: 'test-agent-id' },
        {},
        {
          name: 'Updated Test Agent',
          description: 'Updated by test script'
        }
      );
      const res = mockResponse();
      
      await agentController.saveAgentConfig(req, res);
      
      logger.info(`Response status: ${res.status.mock.calls[0][0]}`);
      logger.info(`Response data: ${JSON.stringify(res.json.mock.calls[0][0])}`);
    } catch (error) {
      logger.error(`Error testing saveAgentConfig (update): ${error.message}`);
      logger.error(error.stack);
    }
    
    logger.info('Direct agent controller tests complete.');
  } catch (error) {
    logger.error(`Error in test script: ${error.message}`);
    logger.error(error.stack);
  }
}

// Run the tests
testAgentController();
