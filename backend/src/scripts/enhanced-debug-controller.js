/**
 * Enhanced Debug Controller Script
 * Provides detailed debugging for contact controller and model
 */

const db = require('../models');
const logger = require('../utils/logger');
const contactController = require('../controllers/contact.controller');

async function enhancedDebugController() {
  try {
    // Mock Express req/res objects with detailed logging
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
    
    // Print models loaded
    logger.info('Models loaded:');
    Object.keys(db).forEach(modelName => {
      if (db[modelName].prototype && db[modelName].prototype.constructor.name === 'Model') {
        logger.info(` - ${modelName}`);
      }
    });
    
    // Check Contact model
    logger.info(`Contact model defined: ${!!db.Contact}`);
    if (db.Contact) {
      logger.info(`Contact tableName: ${db.Contact.tableName}`);
      
      // Check if model has attributes that match table
      logger.info('Contact model attributes:');
      Object.keys(db.Contact.rawAttributes).forEach(attr => {
        logger.info(` - ${attr}`);
      });
      
      // Check database columns directly
      try {
        const [dbColumns] = await db.sequelize.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'Contacts'
        `);
        
        logger.info('Database table "Contacts" columns:');
        dbColumns.forEach(col => {
          logger.info(` - ${col.column_name}: ${col.data_type}`);
        });
        
        // Compare model attributes to database columns
        const modelAttrs = Object.keys(db.Contact.rawAttributes);
        const dbColumnNames = dbColumns.map(c => c.column_name);
        
        const missingInDb = modelAttrs.filter(attr => !dbColumnNames.includes(attr));
        if (missingInDb.length > 0) {
          logger.error(`Model attributes missing in DB: ${missingInDb.join(', ')}`);
        }
        
        const missingInModel = dbColumnNames.filter(col => !modelAttrs.includes(col));
        if (missingInModel.length > 0) {
          logger.info(`DB columns missing in model: ${missingInModel.join(', ')}`);
        }
      } catch (error) {
        logger.error(`Error querying database columns: ${error.message}`);
      }
    }
    
    // Check contact controller methods
    logger.info('Contact controller methods:');
    Object.keys(contactController).forEach(method => {
      if (typeof contactController[method] === 'function') {
        logger.info(` - ${method}`);
      }
    });
    
    // Test directly modifying query to only select columns known to exist
    logger.info('Testing simplified query with only known fields...');
    try {
      const contacts = await db.Contact.findAll({
        attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status'],
        limit: 1
      });
      logger.info(`Query successful! Found ${contacts.length} contacts`);
      if (contacts.length > 0) {
        logger.info('First contact data:', JSON.stringify(contacts[0].get({ plain: true }), null, 2));
      }
    } catch (error) {
      logger.error(`Simplified query failed: ${error.message}`);
    }
    
    // Check contact controller source code to identify potential issues
    logger.info('Examining controller source structure...');
    try {
      logger.info('Checking getContacts method...');
      const getContactsStr = contactController.getContacts.toString();
      
      // Look for specific patterns that might cause issues
      if (getContactsStr.includes('callDuration')) {
        logger.warn('getContacts references callDuration which was removed from model');
      }
      if (getContactsStr.includes('lastCalled')) {
        logger.warn('getContacts references lastCalled which was removed from model');
      }
      if (getContactsStr.includes('attemptsCount')) {
        logger.warn('getContacts references attemptsCount which was removed from model');
      }
      
      // Extract attribute list from controller if possible
      const attributesMatch = getContactsStr.match(/attributes:\s*\[(.*?)\]/s);
      if (attributesMatch) {
        logger.info(`Attributes requested in controller: ${attributesMatch[1]}`);
      }
      
      // Extract include list
      const includeMatch = getContactsStr.match(/include:\s*\[(.*?)\]/s);
      if (includeMatch) {
        logger.info(`Include statement in controller: ${includeMatch[1]}`);
      }
    } catch (error) {
      logger.error(`Error analyzing controller code: ${error.message}`);
    }
    
    // Test contact controller with direct control over model query
    logger.info('Creating a modified contact controller for testing...');
    const testController = {
      getContacts: async (req, res) => {
        try {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const offset = (page - 1) * limit;
          
          const result = await db.Contact.findAndCountAll({
            attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status'],
            include: [{
              model: db.Campaign,
              as: 'campaign',
              attributes: ['id', 'name', 'status']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
          });
          
          return res.status(200).json({
            success: true,
            contacts: result.rows,
            totalCount: result.count,
            currentPage: page,
            totalPages: Math.ceil(result.count / limit)
          });
        } catch (error) {
          logger.error(`Modified controller error: ${error.message}`);
          return res.status(500).json({
            success: false,
            error: 'Failed to get contacts',
            details: error.message
          });
        }
      }
    };
    
    // Try the modified controller
    logger.info('Testing modified controller...');
    try {
      await testController.getContacts(mockReq, mockRes);
    } catch (error) {
      logger.error(`Modified controller failed: ${error.message}`);
    }
    
    // Try patching the original controller temporarily
    logger.info('Testing with controller patch...');
    const originalGetContacts = contactController.getContacts;
    try {
      contactController.getContacts = testController.getContacts;
      await contactController.getContacts(mockReq, mockRes);
    } catch (error) {
      logger.error(`Patched original controller failed: ${error.message}`);
    } finally {
      // Restore original method
      contactController.getContacts = originalGetContacts;
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Diagnostic error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

enhancedDebugController();
