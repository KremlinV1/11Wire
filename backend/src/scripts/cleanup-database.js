/**
 * Database Cleanup Script
 * 
 * This script drops duplicate capitalized tables that were created during testing
 * and ensures only the correct lowercase tables remain.
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');

async function cleanupDatabase() {
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
      - Dialect: ${db.sequelize.getDialect()}
    `);
    
    // Check tables in public schema
    logger.info('Checking for duplicate capitalized tables...');
    const [tables] = await db.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    logger.info(`Found tables: ${tables.map(t => t.table_name).join(', ')}`);
    
    // Find duplicate capitalized tables
    const correctTableNames = ['contacts', 'call_logs', 'agent_configs', 'campaigns', 
                              'conversations', 'call_recordings'];
    
    const duplicateTables = tables
      .map(t => t.table_name)
      .filter(tableName => {
        // Check if this table has a lowercase version
        const lowercaseVersion = tableName.toLowerCase();
        return lowercaseVersion !== tableName && 
               correctTableNames.includes(lowercaseVersion);
      });
    
    if (duplicateTables.length === 0) {
      logger.info('No duplicate capitalized tables found.');
      return;
    }
    
    logger.info(`Found ${duplicateTables.length} duplicate capitalized tables to drop: ${duplicateTables.join(', ')}`);
    
    // Drop duplicate tables
    for (const tableName of duplicateTables) {
      logger.info(`Dropping table: ${tableName}`);
      await db.sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    }
    
    logger.info('Database cleanup completed successfully');
    
    // Verify tables after cleanup
    const [remainingTables] = await db.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    logger.info(`Remaining tables: ${remainingTables.map(t => t.table_name).join(', ')}`);
    
  } catch (error) {
    logger.error(`Error cleaning up database: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Close database connection
    await db.sequelize.close();
    logger.info('Database connection closed');
  }
}

// Run the script
cleanupDatabase();
