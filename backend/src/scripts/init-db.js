/**
 * Database Initialization Script
 * Syncs Sequelize models with the database to create required tables
 */

// Load environment variables from .env.test for test database
require('dotenv').config({ path: process.env.ENV_FILE || '.env.test' });

const db = require('../models');
const logger = require('../utils/logger');

async function initializeDatabase() {
  try {
    // Test database connection
    const connected = await db.testConnection();
    
    if (!connected) {
      logger.error('Failed to connect to database. Check your database configuration.');
      process.exit(1);
    }
    
    logger.info('Syncing database models...');
    
    // Force sync will drop tables if they exist and recreate them
    // Use { force: false } if you don't want to drop existing tables
    await db.sequelize.sync({ force: true });
    
    logger.info('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
