/**
 * Test Campaign Insert Script
 * Creates a test campaign record for testing the campaign scheduler
 */

// Load environment variables from .env.test for test database
require('dotenv').config({ path: process.env.ENV_FILE || '.env.test' });

const db = require('../models');
const logger = require('../utils/logger');

async function insertTestCampaign() {
  try {
    // Test database connection
    const connected = await db.testConnection();
    
    if (!connected) {
      logger.error('Failed to connect to database. Check your database configuration.');
      process.exit(1);
    }
    
    // Create test campaign
    const testCampaign = {
      id: 'test-campaign',
      name: 'Test Campaign',
      description: 'Test campaign for development and testing purposes',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      contactsId: 'test-contacts',
      voiceAgentId: 'test-voice',
      scriptId: 'test-script',
      settings: {
        callsPerHour: 10,
        retryAttempts: 3,
        timezone: 'America/Chicago'
      }
    };
    
    logger.info('Creating test campaign record...');
    
    // Check if test campaign already exists to avoid duplicates
    const existingCampaign = await db.Campaign.findByPk('test-campaign');
    
    if (existingCampaign) {
      logger.info('Test campaign already exists, updating...');
      await existingCampaign.update(testCampaign);
    } else {
      logger.info('Creating new test campaign...');
      await db.Campaign.create(testCampaign);
    }
    
    logger.info('Test campaign created successfully.');
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to create test campaign: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the insertion
insertTestCampaign();
