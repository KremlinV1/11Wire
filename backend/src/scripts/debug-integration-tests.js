/**
 * Integration Test Diagnostic Script
 * Simulates the same database setup and API calls as the integration tests
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');
const contactController = require('../controllers/contact.controller');
const callController = require('../controllers/call.controller');
const agentController = require('../controllers/elevenlabs-agent.controller');

// Mock Express request/response objects
const createMockReq = (params = {}, query = {}, body = {}) => ({
  params,
  query,
  body
});

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    console.log(`Response status: ${code}`);
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    res.data = data;
    return res;
  };
  res.send = (data) => {
    console.log('Response sent:', data);
    res.data = data;
    return res;
  };
  return res;
};

async function testContactEndpoints() {
  try {
    logger.info('===== Testing Contact Endpoints =====');
    
    // 1. Get all contacts
    logger.info('Testing GET /api/contacts');
    const getAllReq = createMockReq();
    const getAllRes = createMockRes();
    await contactController.getContacts(getAllReq, getAllRes);
    
    // 2. Get contact stats
    logger.info('Testing GET /api/contacts/stats');
    const statsReq = createMockReq();
    const statsRes = createMockRes();
    await contactController.getContactStats(statsReq, statsRes);
    
  } catch (error) {
    logger.error(`Error in contact endpoints: ${error.message}`);
    logger.error(error.stack);
  }
}

async function testCallEndpoints() {
  try {
    logger.info('===== Testing Call Endpoints =====');
    
    // 1. Get call statistics
    logger.info('Testing GET /api/calls/stats');
    const statsReq = createMockReq();
    const statsRes = createMockRes();
    await callController.getCallStatistics(statsReq, statsRes);
    
  } catch (error) {
    logger.error(`Error in call endpoints: ${error.message}`);
    logger.error(error.stack);
  }
}

async function testAgentEndpoints() {
  try {
    logger.info('===== Testing Agent Endpoints =====');
    
    // 1. List configured agents
    logger.info('Testing GET /api/agents');
    const listReq = createMockReq();
    const listRes = createMockRes();
    await agentController.listConfiguredAgents(listReq, listRes);
    
  } catch (error) {
    logger.error(`Error in agent endpoints: ${error.message}`);
    logger.error(error.stack);
  }
}

// Main function
async function runTests() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await db.sequelize.authenticate();
    logger.info('Database connection established');
    
    // Check if tables exist by doing a simple count query
    const tables = ['contacts', 'call_logs', 'agent_configs', 'campaigns'];
    
    for (const table of tables) {
      try {
        const [result] = await db.sequelize.query(`SELECT COUNT(*) FROM ${table}`);
        logger.info(`Table ${table} exists with ${result[0].count} records`);
      } catch (err) {
        logger.error(`Error querying table ${table}: ${err.message}`);
      }
    }
    
    // Run endpoint tests
    await testContactEndpoints();
    await testCallEndpoints();
    await testAgentEndpoints();
    
  } catch (error) {
    logger.error(`Main error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Close database connection
    await db.sequelize.close();
    logger.info('Database connection closed');
  }
}

// Run the script
runTests();
