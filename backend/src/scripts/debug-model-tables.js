/**
 * Debug Model Tables Script
 * Tests all models and table relationships to diagnose issues
 */

const db = require('../models');
const logger = require('../utils/logger');
const { QueryTypes } = require('sequelize');

async function debugModelTables() {
  try {
    // Test connection
    logger.info('Testing database connection...');
    await db.sequelize.authenticate();
    logger.info('Database connection successful');
    
    // List all tables in the database with case-sensitive names
    logger.info('Listing all tables in the database...');
    const [tables] = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    );
    
    logger.info(`Tables in database (${tables.length}):`);
    tables.forEach(row => {
      logger.info(`- ${JSON.stringify(row.table_name)}`);
    });
    
    // List all models and their table names
    logger.info('Models and their table names:');
    Object.keys(db).forEach(modelName => {
      if (db[modelName] && db[modelName].tableName) {
        logger.info(`Model: ${modelName}, tableName: '${db[modelName].tableName}'`);
      }
    });
    
    // Test each model with a simple query
    logger.info('Testing each model with a simple count query:');
    
    // Test Contact model
    logger.info('Testing Contact model...');
    try {
      const contactCount = await db.Contact.count();
      logger.info(`Contact count: ${contactCount}`);
    } catch (error) {
      logger.error(`Contact model error: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test Campaign model
    logger.info('Testing Campaign model...');
    try {
      const campaignCount = await db.Campaign.count();
      logger.info(`Campaign count: ${campaignCount}`);
    } catch (error) {
      logger.error(`Campaign model error: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test CallLog model
    logger.info('Testing CallLog model...');
    try {
      const callLogCount = await db.CallLog.count();
      logger.info(`CallLog count: ${callLogCount}`);
    } catch (error) {
      logger.error(`CallLog model error: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test AgentConfig model
    logger.info('Testing AgentConfig model...');
    try {
      const agentConfigCount = await db.AgentConfig.count();
      logger.info(`AgentConfig count: ${agentConfigCount}`);
    } catch (error) {
      logger.error(`AgentConfig model error: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Try direct SQL queries for each model's table with exact case
    logger.info('Testing direct SQL queries with case-sensitive table names:');
    
    // Test Contacts table
    logger.info('Testing "Contacts" table...');
    try {
      const [contactsResult] = await db.sequelize.query('SELECT COUNT(*) FROM "Contacts"');
      logger.info(`Contacts table count: ${JSON.stringify(contactsResult[0].count)}`);
    } catch (error) {
      logger.error(`Contacts SQL error: ${error.message}`);
    }
    
    // Test Campaigns table
    logger.info('Testing "Campaigns" table...');
    try {
      const [campaignsResult] = await db.sequelize.query('SELECT COUNT(*) FROM "Campaigns"');
      logger.info(`Campaigns table count: ${JSON.stringify(campaignsResult[0].count)}`);
    } catch (error) {
      logger.error(`Campaigns SQL error: ${error.message}`);
    }
    
    // Test all include combinations for Contact and Campaign
    logger.info('Testing Contact-Campaign association with explicit include:');
    try {
      const contactsWithCampaign = await db.Contact.findAll({
        limit: 1,
        include: [{
          model: db.Campaign,
          as: 'campaign'
        }]
      });
      logger.info(`Association query result count: ${contactsWithCampaign.length}`);
    } catch (error) {
      logger.error(`Association error: ${error.message}`);
      logger.error(`Association error stack: ${error.stack}`);
    }
    
    // Check the model associations
    logger.info('Checking model associations:');
    
    // Contact associations
    if (db.Contact.associations) {
      logger.info('Contact associations:');
      Object.keys(db.Contact.associations).forEach(assoc => {
        const association = db.Contact.associations[assoc];
        logger.info(` - ${assoc}: ${association.associationType} to ${association.target.name}`);
      });
    }
    
    // Campaign associations
    if (db.Campaign.associations) {
      logger.info('Campaign associations:');
      Object.keys(db.Campaign.associations).forEach(assoc => {
        const association = db.Campaign.associations[assoc];
        logger.info(` - ${assoc}: ${association.associationType} to ${association.target.name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Diagnostic error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

debugModelTables();
