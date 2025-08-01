/**
 * Debug AgentConfig Model Issues
 * This script diagnoses issues with the AgentConfig model and database table
 */

const db = require('../models');
const { QueryTypes } = require('sequelize');
const logger = require('../utils/logger');

async function debugAgentConfig() {
  try {
    logger.info('Starting AgentConfig diagnostics...');
    
    // Test database connection first
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Check if the AgentConfigs table exists
    logger.info('Checking if AgentConfigs table exists...');
    const [tables] = await db.sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const tableNames = tables.map(t => t.tablename);
    logger.info(`Tables found in database: ${JSON.stringify(tableNames)}`);
    
    const agentConfigTableExists = tableNames.includes('AgentConfigs');
    if (!agentConfigTableExists) {
      logger.error('AgentConfigs table does not exist!');
      process.exit(1);
    }
    
    logger.info('AgentConfigs table exists.');
    
    // Check table structure
    logger.info('Checking table structure...');
    const [columns] = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'AgentConfigs'
    `);
    
    logger.info('AgentConfigs table structure:');
    columns.forEach(column => {
      logger.info(`- ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Check if there is any data in the table
    logger.info('Checking if any records exist in AgentConfigs...');
    const count = await db.AgentConfig.count();
    logger.info(`AgentConfigs record count: ${count}`);
    
    if (count > 0) {
      // Try to fetch a record using Sequelize model
      logger.info('Attempting to fetch records using Sequelize model...');
      try {
        const agentConfigs = await db.AgentConfig.findAll({
          raw: true
        });
        logger.info(`Successfully retrieved ${agentConfigs.length} records:`);
        agentConfigs.forEach(config => {
          logger.info(JSON.stringify(config));
        });
      } catch (seqError) {
        logger.error(`Error fetching with Sequelize model: ${seqError.message}`);
        logger.error(seqError.stack);
      }
      
      // Try direct SQL query for comparison
      logger.info('Attempting direct SQL query...');
      try {
        const [rawAgents] = await db.sequelize.query(
          'SELECT * FROM "AgentConfigs" LIMIT 5',
          { type: QueryTypes.SELECT }
        );
        logger.info(`Direct SQL query results: ${JSON.stringify(rawAgents)}`);
      } catch (sqlError) {
        logger.error(`SQL query error: ${sqlError.message}`);
        logger.error(sqlError.stack);
      }
    } else {
      // Try to insert a test record
      logger.info('No records found. Attempting to create a test record...');
      try {
        const testAgent = await db.AgentConfig.create({
          agentId: 'test-agent-id',
          name: 'Test Agent',
          description: 'Test agent for debugging',
          isActive: true,
          settings: { debug: true },
          promptSettings: { greeting: 'Hello, this is a test' }
        });
        logger.info(`Successfully created test agent with ID: ${testAgent.id}`);
      } catch (createError) {
        logger.error(`Error creating test agent: ${createError.message}`);
        logger.error(createError.stack);
      }
    }
    
    // Check associations
    logger.info('Checking model associations...');
    if (db.AgentConfig.associations) {
      const associationNames = Object.keys(db.AgentConfig.associations);
      logger.info(`AgentConfig has ${associationNames.length} associations: ${associationNames.join(', ')}`);
    } else {
      logger.info('AgentConfig has no associations defined.');
    }
    
    logger.info('AgentConfig diagnostics complete.');
  } catch (error) {
    logger.error(`Error during diagnostics: ${error.message}`);
    logger.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the diagnostics
debugAgentConfig();
