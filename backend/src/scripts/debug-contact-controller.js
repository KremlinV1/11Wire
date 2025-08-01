/**
 * Debug Contact Controller Script
 * Directly tests the contact controller functions without going through Express
 */

const db = require('../models');
const logger = require('../utils/logger');
const contactController = require('../controllers/contact.controller');

async function debugContactController() {
  try {
    // Mock Express req/res objects
    const mockRes = {
      status: function(code) {
        console.log(`Status code: ${code}`);
        return this;
      },
      json: function(data) {
        console.log('Response data:', JSON.stringify(data, null, 2));
        return this;
      }
    };
    
    const mockReq = {
      query: {
        page: 1,
        limit: 10
      }
    };
    
    // Test connection
    logger.info('Testing database connection...');
    await db.sequelize.authenticate();
    logger.info('Database connection successful');
    
    // Check Contact model
    logger.info(`Contact model defined: ${!!db.Contact}`);
    logger.info(`Contact tableName: ${db.Contact.tableName}`);
    
    // Check if we have associations
    if (db.Contact.associations) {
      logger.info('Contact associations:');
      Object.keys(db.Contact.associations).forEach(assoc => {
        const association = db.Contact.associations[assoc];
        logger.info(` - ${assoc}: ${association.associationType} to ${association.target.name}`);
      });
    }
    
    // Test direct query first
    logger.info('Testing direct Contact query...');
    try {
      const contacts = await db.Contact.findAll({
        limit: 1,
        raw: true
      });
      logger.info('Direct query successful, results:');
      logger.info(JSON.stringify(contacts, null, 2));
    } catch (error) {
      logger.error(`Direct query failed: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Try the query with Campaign include but without other options
    logger.info('Testing Contact query with Campaign include...');
    try {
      const contacts = await db.Contact.findAll({
        limit: 1,
        include: [{
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name']
        }]
      });
      logger.info('Include query successful');
    } catch (error) {
      logger.error(`Include query failed: ${error.message}`);
      logger.error(error.stack);
    }
    
    // Test to see if any other model field is causing issues
    logger.info('Testing each field in Contact model...');
    const attributes = Object.keys(db.Contact.rawAttributes);
    logger.info(`Fields defined in Contact model: ${attributes.join(', ')}`);
    
    // Check actual columns in database
    logger.info('Checking actual columns in database...');
    const [columns] = await db.sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Contacts'
    `);
    logger.info('Columns in database:');
    columns.forEach(col => {
      logger.info(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check for missing columns
    logger.info('Checking for columns in model but not in database...');
    const dbColumns = columns.map(c => c.column_name);
    const missingColumns = attributes.filter(attr => !dbColumns.includes(attr));
    if (missingColumns.length > 0) {
      logger.error(`Missing columns in database: ${missingColumns.join(', ')}`);
    } else {
      logger.info('All model attributes exist in database');
    }
    
    // Test the controller functions directly
    logger.info('Testing getContacts controller function...');
    try {
      await contactController.getContacts(mockReq, mockRes);
    } catch (error) {
      logger.error(`getContacts error: ${error.message}`);
      logger.error(error.stack);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Diagnostic error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

debugContactController();
