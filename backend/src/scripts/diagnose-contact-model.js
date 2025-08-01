/**
 * Diagnostic script to directly test Contact model operations
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Set logging level to debug
logger.level = 'debug';

async function diagnoseContactModel() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Get the Contact model definition
    const Contact = db.Contact;
    logger.info('Contact model loaded:', {
      tableName: Contact.tableName,
      modelName: Contact.name,
      attributes: Object.keys(Contact.rawAttributes)
    });

    // Log actual table information from the database
    logger.info('Querying database table information...');
    const [tableInfo] = await db.sequelize.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${Contact.tableName}'
    `);
    logger.info('Actual database columns:', tableInfo);

    // Test a simple find operation
    logger.info('Testing simple find operation...');
    const contactCount = await Contact.count();
    logger.info(`Found ${contactCount} contacts in the database`);

    // Test retrieving contacts similar to getContacts
    logger.info('Testing getContacts operation...');
    const { count, rows } = await Contact.findAndCountAll({
      attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status', 'notes', 'customFields', 'sourceType', 'campaignId', 'createdAt', 'updatedAt'],
      limit: 10,
      offset: 0,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        }
      ]
    });
    logger.info(`Found ${count} contacts with pagination`);
    logger.info('First contact:', rows[0] ? rows[0].toJSON() : 'No contacts found');

    // Test retrieving a single contact by ID like getContactById
    if (rows.length > 0) {
      const contactId = rows[0].id;
      logger.info(`Testing getContactById operation with ID ${contactId}...`);
      const singleContact = await Contact.findByPk(contactId, {
        attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status', 'notes', 'customFields', 'sourceType', 'campaignId', 'createdAt', 'updatedAt'],
        include: [
          {
            model: db.Campaign,
            as: 'campaign',
            attributes: ['id', 'name', 'status']
          }
        ]
      });
      
      if (singleContact) {
        logger.info('Successfully retrieved contact by ID:', singleContact.toJSON());
      } else {
        logger.error(`Contact with ID ${contactId} not found`);
      }
    }

    // Test contact stats operation like getContactStats
    logger.info('Testing getContactStats operation...');
    const statusCounts = await Contact.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    logger.info('Contact status counts:', statusCounts.map(count => count.toJSON()));

    // Test total count
    const totalCount = await Contact.count();
    logger.info(`Total contacts: ${totalCount}`);

    // Test simplified query with minimal includes
    logger.info('Testing simplified query without includes...');
    const simpleQuery = await Contact.findAll({
      attributes: ['id', 'firstName', 'lastName'],
      limit: 5
    });
    logger.info(`Successfully retrieved ${simpleQuery.length} contacts with simplified query`);
    
    // Test query with explicit association
    logger.info('Testing explicit association with Campaign...');
    const hasAssociation = Contact.associations && Contact.associations.campaign;
    logger.info('Has campaign association:', !!hasAssociation);
    if (hasAssociation) {
      logger.info('Association details:', {
        target: hasAssociation.target && hasAssociation.target.name,
        source: hasAssociation.source && hasAssociation.source.name,
        as: hasAssociation.as,
        associationType: hasAssociation.associationType
      });
    }

    logger.info('Diagnostic complete. All operations executed successfully.');
  } catch (error) {
    logger.error(`Diagnostic failed: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } finally {
    await db.sequelize.close();
  }
}

// Execute the diagnostic function
diagnoseContactModel()
  .then(() => {
    console.log('Diagnostic script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic script failed:', error);
    process.exit(1);
  });
