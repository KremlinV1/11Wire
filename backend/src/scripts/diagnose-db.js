/**
 * Database Diagnostic Script
 * Used to verify database tables and run simple queries
 */

const db = require('../models');
const logger = require('../utils/logger');
const { QueryTypes } = require('sequelize');

async function diagnoseDatabase() {
  try {
    // Test connection
    logger.info('Testing database connection...');
    const connected = await db.testConnection();
    if (!connected) {
      logger.error('Failed to connect to the database');
      process.exit(1);
    }
    
    // List all tables in the database
    logger.info('Listing all tables in the database...');
    const [tables] = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    );
    
    logger.info('Tables found:');
    tables.forEach(row => {
      logger.info(`- ${row.table_name}`);
    });
    
    // Check table names case sensitivity
    logger.info('Checking for case sensitivity issues...');
    for (const table of tables) {
      logger.info(`Table name: "${table.table_name}" (type: ${typeof table.table_name})`);
    }
    
    // Check if Contacts table exists
    logger.info('Checking if Contacts table exists...');
    try {
      const contactsResult = await db.sequelize.query('SELECT COUNT(*) FROM "Contacts"');
      logger.info(`Contacts table exists, count: ${JSON.stringify(contactsResult)}`);
    } catch (error) {
      logger.error(`Error querying Contacts table: ${error.message}`);
    }
    
    // Try a direct query with the Contact model
    logger.info('Attempting a direct Sequelize query with Contact model...');
    try {
      const contactCount = await db.Contact.count();
      logger.info(`Contact count using Sequelize model: ${contactCount}`);
    } catch (error) {
      logger.error(`Error using Contact model: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
    }
    
    // Check all model tableName properties
    logger.info('Checking all model tableName properties...');
    Object.keys(db).forEach(key => {
      if (db[key] && db[key].tableName) {
        logger.info(`Model: ${key}, tableName: ${db[key].tableName}`);
      }
    });
    
    // Inspect columns in the Contacts table
    logger.info('Inspecting columns in the Contacts table...');
    try {
      const columns = await db.sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Contacts' AND table_schema = 'public'
      `);
      
      logger.info('Contacts table columns:');
      columns[0].forEach(col => {
        logger.info(`- ${col.column_name} (${col.data_type})`);
      });
    } catch (error) {
      logger.error(`Error getting Contacts columns: ${error.message}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Diagnostic error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

diagnoseDatabase();
