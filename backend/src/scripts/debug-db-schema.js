/**
 * Database Schema Diagnostic Script
 * Checks schema names, table existence across schemas, and connection details
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');

async function checkDatabase() {
  try {
    logger.info('Connecting to database...');
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Log connection details
    logger.info(`Database details:
      - Name: ${db.sequelize.config.database}
      - Host: ${db.sequelize.config.host}
      - Port: ${db.sequelize.config.port}
      - Username: ${db.sequelize.config.username}
      - Dialect: ${db.sequelize.config.dialect}
    `);
    
    // Check current schema
    const [schemaResult] = await db.sequelize.query('SHOW search_path;');
    logger.info(`Current search_path: ${JSON.stringify(schemaResult)}`);
    
    // List all schemas in the database
    const [schemas] = await db.sequelize.query('SELECT schema_name FROM information_schema.schemata;');
    logger.info(`Available schemas: ${schemas.map(s => s.schema_name).join(', ')}`);
    
    // Check tables in public schema
    logger.info('Checking tables in public schema...');
    const [publicTables] = await db.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    logger.info(`Tables in public schema: ${publicTables.map(t => t.table_name).join(', ')}`);
    
    // Try raw SQL queries to check if tables exist
    logger.info('Trying direct SQL queries...');
    
    try {
      const [contactResults] = await db.sequelize.query('SELECT COUNT(*) FROM contacts');
      logger.info(`Successfully queried contacts table: ${JSON.stringify(contactResults)}`);
    } catch (err) {
      logger.error(`Error querying contacts table: ${err.message}`);
      
      // Try with schema prefix
      try {
        const [contactResults] = await db.sequelize.query('SELECT COUNT(*) FROM public.contacts');
        logger.info(`Successfully queried public.contacts table: ${JSON.stringify(contactResults)}`);
      } catch (schemaErr) {
        logger.error(`Error querying public.contacts table: ${schemaErr.message}`);
      }
    }
    
    try {
      const [callLogResults] = await db.sequelize.query('SELECT COUNT(*) FROM call_logs');
      logger.info(`Successfully queried call_logs table: ${JSON.stringify(callLogResults)}`);
    } catch (err) {
      logger.error(`Error querying call_logs table: ${err.message}`);
      
      // Try with schema prefix
      try {
        const [callLogResults] = await db.sequelize.query('SELECT COUNT(*) FROM public.call_logs');
        logger.info(`Successfully queried public.call_logs table: ${JSON.stringify(callLogResults)}`);
      } catch (schemaErr) {
        logger.error(`Error querying public.call_logs table: ${schemaErr.message}`);
      }
    }
    
    // Check model definitions vs table names
    logger.info('Checking model definitions vs table names...');
    
    const models = ['Contact', 'CallLog', 'AgentConfig', 'Campaign'];
    for (const modelName of models) {
      if (db[modelName]) {
        logger.info(`Model ${modelName}:`);
        logger.info(`  - Model name: ${db[modelName].name}`);
        logger.info(`  - Table name: ${db[modelName].tableName}`);
        
        // Check if model.tableName is properly set
        if (db[modelName].getTableName) {
          const tableName = db[modelName].getTableName();
          logger.info(`  - getTableName(): ${JSON.stringify(tableName)}`);
        }
      } else {
        logger.warn(`Model ${modelName} not found in db object`);
      }
    }
    
  } catch (error) {
    logger.error(`Error checking database: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Close database connection
    await db.sequelize.close();
    logger.info('Database connection closed');
  }
}

// Run the script
checkDatabase();
