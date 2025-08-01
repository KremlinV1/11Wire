/**
 * Sync Test Models Script
 * Force syncs all models with the test database to ensure schema matches model definitions
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');

async function syncModels() {
  try {
    logger.info('Starting targeted sync of models to test database...');
    
    // Authenticate database connection
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Get all model names
    const modelNames = Object.keys(db.sequelize.models);
    logger.info(`Models to sync: ${modelNames.join(', ')}`);
    
    // Use raw SQL to drop specific tables that need updating
    const queryInterface = db.sequelize.getQueryInterface();
    
    // Drop tables with cascade
    const tablesToDrop = ['contacts', 'call_logs', 'agent_configs'];
    
    for (const tableName of tablesToDrop) {
      try {
        await queryInterface.dropTable(tableName, { cascade: true });
        logger.info(`Dropped ${tableName} table`);
      } catch (err) {
        logger.warn(`Error dropping ${tableName} table, may not exist: ${err.message}`);
      }
    }
    
    // We'll use force: true to ensure tables are recreated if they don't exist
    // Create tables in correct order based on dependencies
    
    // First, create tables with no dependencies
    logger.info('Creating agent_configs table...');
    await db.AgentConfig.sync({ force: true });
    
    // Next, create contacts table (may depend on campaign)
    logger.info('Creating contacts table...');
    await db.Contact.sync({ force: true });
    
    // Finally, create call_logs (depends on contacts and campaign)
    logger.info('Creating call_logs table...');
    await db.CallLog.sync({ force: true });
    
    logger.info('Tables created successfully!');
    
    // Create test data for integration tests
    logger.info('Creating test data...');
    
    // Use a transaction to ensure data integrity
    const t = await db.sequelize.transaction();
    
    try {
      // Create test campaign first (since contacts reference campaigns)
      logger.info('Creating test campaign...');
      const campaign = await db.Campaign.create({
        id: 'test-campaign-id',
        name: 'Test Campaign',
        description: 'For testing',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        contactsId: 'test-contacts-list',
        voiceAgentId: 'test-agent-id',
        scriptId: 'test-script-id',
        settings: {
          callsPerDay: 50,
          retryCount: 2,
          callHoursStart: '09:00',
          callHoursEnd: '17:00'
        },
        stats: {
          total: 0,
          completed: 0,
          failed: 0,
          inProgress: 0
        }
      }, { transaction: t });
      
      // Commit the campaign creation to ensure it's available for foreign key references
      await t.commit();
      logger.info(`Created test campaign with ID: ${campaign.id}`);
      
      // Create test agent
      logger.info('Creating test agent...');
      const agent = await db.AgentConfig.create({
        agentId: 'test-agent-id',
        name: 'Existing Test Agent',
        description: 'For testing',
        isActive: true,
        settings: {}
      });
      logger.info(`Created test agent with ID: ${agent.agentId}`);
      
      // Create test call log
      logger.info('Creating test call log...');
      const callLog = await db.CallLog.create({
        callSid: 'TEST-CALL-SID-12345',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'outbound',
        status: 'completed',
        duration: 60,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60000)
      });
      logger.info(`Created test call log with ID: ${callLog.id}`);
      
      // Create test contact (now that campaign exists)
      logger.info('Creating test contact...');
      const contact = await db.Contact.create({
        firstName: 'Test',
        lastName: 'Contact',
        phone: '+15551234567',
        email: 'test@example.com',
        campaignId: campaign.id
      });
      logger.info(`Created test contact with ID: ${contact.id}`);
    } catch (error) {
      // If any error occurs during test data creation, roll back the transaction
      if (!t.finished) {
        await t.rollback();
      }
      throw error;
    }
    
    logger.info('Test data creation completed');
    
    // Close database connection
    await db.sequelize.close();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error syncing models: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the sync
syncModels();
