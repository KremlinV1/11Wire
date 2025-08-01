/**
 * Initialize Database Schema Script
 * Run this script to create all database tables based on Sequelize models
 */

const db = require('../models');
const logger = require('../utils/logger');
const { QueryTypes } = require('sequelize');

/**
 * Sync database models
 */
async function syncDatabaseModels() {
  try {
    logger.info('Synchronizing database with models using Sequelize...');
    
    // First sync models without foreign key dependencies
    logger.info('Syncing models in dependency order...');
    
    // 1. Base models without foreign keys
    await db.Campaign.sync({ force: false });
    logger.info('Campaign model synced');
    
    await db.AgentConfig.sync({ force: false });
    logger.info('AgentConfig model synced');
    
    // 2. Models with simple foreign keys
    await db.Contact.sync({ force: false });
    logger.info('Contact model synced');
    
    // 3. Models that depend on the above
    await db.CallLog.sync({ force: false });
    logger.info('CallLog model synced');
    
    // 4. Models that depend on CallLog
    await db.CallRecording.sync({ force: false });
    logger.info('CallRecording model synced');
    
    await db.Conversation.sync({ force: false });
    logger.info('Conversation model synced');
    
    // 5. STT Request mapping (no dependencies)
    await db.SttRequestMapping.sync({ force: false });
    logger.info('SttRequestMapping model synced');
    logger.info('All models synchronized successfully with database!');
    
    // List all models that were synchronized
    logger.info('Models synchronized:');
    Object.keys(db).forEach(modelName => {
      if (db[modelName].tableName) {
        logger.info(`- ${modelName} (table: ${db[modelName].tableName})`);
      }
    });
    
    return true;
  } catch (error) {
    logger.error(`Error synchronizing models: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

async function initializeDatabase() {
  try {
    logger.info('Starting database initialization...');
    
    // Test the connection first
    logger.info('Testing database connection...');
    try {
      await db.sequelize.authenticate();
      logger.info('Database connection established successfully.');
    } catch (connError) {
      logger.error(`Failed to connect to the database: ${connError.message}`);
      logger.error(connError.stack);
      process.exit(1);
    }
    
    // Completely reset the database schema
    logger.info('Resetting entire database schema...');
    try {
      // Drop and recreate the entire schema - this is the most reliable way to ensure a clean database
      await db.sequelize.query('DROP SCHEMA IF EXISTS public CASCADE;');
      await db.sequelize.query('CREATE SCHEMA public;');
      await db.sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
      await db.sequelize.query('GRANT ALL ON SCHEMA public TO public;');
      
      logger.info('Successfully reset database schema.');
    } catch (dropError) {
      logger.error(`Error resetting schema: ${dropError.message}`);
      logger.error(dropError.stack);
      process.exit(1);
    }
    
    // Synchronize models with database
    logger.info('Synchronizing database with models...');
    try {
      await syncDatabaseModels();
      logger.info('All tables synchronized with models successfully.');
    } catch (syncError) {
      logger.error(`Error synchronizing tables: ${syncError.message}`);
      logger.error(syncError.stack);
      process.exit(1);
    }
    
    // Verify tables were created
    logger.info('Verifying tables were created...');
    try {
      // In PostgreSQL, table names from our models might be automatically lowercased when created
      // So we'll query by directly checking if these tables exist using pg_catalog rather than information_schema
      // for a more accurate representation
      const [tables] = await db.sequelize.query(`
        SELECT tablename FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public'
      `);
      
      // Extract table names from the query result
      const tableNames = tables.map(t => t.tablename).filter(name => name !== undefined);
      logger.info(`Tables found in database: ${JSON.stringify(tableNames)}`);
      
      // Expected tables with correct capitalization as defined in our models
      const expectedTables = ['Campaigns', 'Contacts', 'AgentConfigs', 'CallRecordings', 'Conversations', 'CallLogs'];
      
      // Check for missing tables
      const missingTables = expectedTables.filter(expectedTable => 
        !tableNames.includes(expectedTable)
      );
      
      if (missingTables.length > 0) {
        logger.error(`Missing tables: ${missingTables.join(', ')}`);
        process.exit(1);
      }
      
      logger.info('All expected tables verified!');
    } catch (verifyError) {
      logger.error(`Error verifying tables: ${verifyError.message}`);
      logger.error(verifyError.stack);
      process.exit(1);
    }
    
    logger.info('Database schema successfully initialized!');
    
    // List all tables in the database
    const [tables] = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    );
    
    logger.info('The following tables are available:');
    tables.forEach(row => {
      logger.info(`- ${row.table_name}`);
    });
    
    // Insert test data using Sequelize models rather than raw SQL
    // This ensures data types match the model definitions
    logger.info('Creating test data for integration tests using Sequelize models...');
    
    try {
      // Create test campaign
      logger.info('Creating test campaign...');
      const testCampaign = await db.Campaign.create({
        name: 'Test Campaign',
        description: 'Test campaign for integration tests',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        contactsId: 'test-contacts-list',
        voiceAgentId: 'test-voice-agent',
        scriptId: 'test-script'
      });
      
      logger.info(`Created test campaign with ID: ${testCampaign.id}`);
      
      // Create test agent config
      logger.info('Creating test agent config...');
      const testAgentConfig = await db.AgentConfig.create({
        agentId: 'test-agent-id',
        name: 'Test Agent',
        description: 'Test agent for integration tests',
        isActive: true,
        settings: { voiceId: 'test-voice' },
        promptSettings: { greeting: 'Hello, this is a test' }
      });
      
      logger.info(`Created test agent config with ID: ${testAgentConfig.id}`);
      
      // Create test contact
      logger.info('Creating test contact...');
      const testContact = await db.Contact.create({
        firstName: 'Test',
        lastName: 'User',
        phone: '+11234567890',
        email: 'test@example.com',
        status: 'pending',
        campaignId: testCampaign.id
      });
      
      logger.info(`Created test contact with ID: ${testContact.id}`);
    } catch (insertError) {
      logger.error(`Error inserting test data: ${insertError.message}`);
      logger.error(insertError.stack);
      process.exit(1);
    }
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    logger.error(`Error initializing database: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
