/**
 * Contact Controller
 * Handles phone list management for outbound calls
 */

const db = require('../models');
const { Op } = require('sequelize');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { createTempFile } = require('../utils/file-helpers');

/**
 * Get all contacts with pagination and filtering
 */
exports.getContacts = async (req, res) => {
  try {
    // Extract query parameters for pagination and filtering
    const { 
      page = 1, 
      limit = 20, 
      campaignId,
      status, 
      search,
      sortBy = 'createdAt',
      sortDir = 'DESC'
    } = req.query;

    // Prepare filter conditions
    const whereClause = {};
    
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Set up sort direction
    const order = [[sortBy, sortDir]];
    
    logger.debug('Contact query params:', { whereClause, limit, offset, order });

    // Use a simplified query with explicitly defined attributes
    // that we know exist in the database
    const { count, rows: contacts } = await db.Contact.findAndCountAll({
      attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status', 'notes', 'customFields', 'sourceType', 'campaignId', 'createdAt', 'updatedAt'],
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order,
      include: [
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        }
      ]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    
    res.status(200).json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      contacts
    });
  } catch (error) {
    logger.error(`Error getting contacts: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    console.log('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('Query parameters:', req.query);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contacts',
      error: error.message
    });
  }
};

/**
 * Get a contact by ID
 */
exports.getContactById = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    logger.debug('Getting contact by ID:', { contactId });
    
    const contact = await db.Contact.findByPk(contactId, {
      attributes: ['id', 'firstName', 'lastName', 'phone', 'email', 'status', 'notes', 'customFields', 'sourceType', 'campaignId', 'createdAt', 'updatedAt'],
      include: [
        {
          model: db.Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'status']
        }
      ]
    });
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: `Contact with id ${contactId} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error(`Error getting contact: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    console.log('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('Request parameters:', JSON.stringify(req.params));
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact',
      error: error.message
    });
  }
};

/**
 * Create a new contact
 */
exports.createContact = async (req, res) => {
  try {
    const { 
      campaignId, 
      firstName, 
      lastName, 
      phone, 
      email,
      customFields
    } = req.body;
    
    // Validate required fields
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Check if campaign exists if campaignId is provided
    if (campaignId) {
      const campaign = await db.Campaign.findByPk(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
    }
    
    // Create the contact
    const contact = await db.Contact.create({
      campaignId,
      firstName,
      lastName,
      phone,
      email,
      customFields,
      sourceType: 'manual'
    });
    
    res.status(201).json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error(`Error creating contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact'
    });
  }
};

/**
 * Update a contact
 */
exports.updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { 
      campaignId, 
      firstName, 
      lastName, 
      phone, 
      email,
      status,
      notes,
      customFields
    } = req.body;
    
    // Find contact
    const contact = await db.Contact.findByPk(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    // Check if campaign exists if campaignId is changing
    if (campaignId && campaignId !== contact.campaignId) {
      const campaign = await db.Campaign.findByPk(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
    }
    
    // Update contact fields
    await contact.update({
      campaignId: campaignId || contact.campaignId,
      firstName: firstName !== undefined ? firstName : contact.firstName,
      lastName: lastName !== undefined ? lastName : contact.lastName,
      phone: phone || contact.phone,
      email: email !== undefined ? email : contact.email,
      status: status || contact.status,
      notes: notes !== undefined ? notes : contact.notes,
      customFields: customFields || contact.customFields
    });
    
    res.status(200).json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error(`Error updating contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact'
    });
  }
};

/**
 * Delete a contact
 */
exports.deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Find contact
    const contact = await db.Contact.findByPk(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    // Delete the contact
    await contact.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting contact: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
};

/**
 * Upload contacts via CSV
 */
exports.uploadContacts = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const { campaignId } = req.body;
    
    // Check if campaign exists if campaignId is provided
    if (campaignId) {
      const campaign = await db.Campaign.findByPk(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
    }
    
    const csvFilePath = req.file.path;
    const results = [];
    const errors = [];
    let processedCount = 0;
    
    // Process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          // Validate required fields
          if (!data.phone) {
            errors.push({
              row: processedCount + 1,
              error: 'Missing phone number'
            });
          } else {
            results.push({
              campaignId: campaignId || null,
              firstName: data.firstName || data.first_name || '',
              lastName: data.lastName || data.last_name || '',
              phone: data.phone,
              email: data.email || '',
              customFields: {},
              sourceType: 'csv'
            });
          }
          
          processedCount++;
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Insert valid contacts into database
    if (results.length > 0) {
      await db.Contact.bulkCreate(results);
    }
    
    // Remove temporary file
    fs.unlinkSync(csvFilePath);
    
    res.status(200).json({
      success: true,
      message: 'Contacts uploaded successfully',
      totalProcessed: processedCount,
      imported: results.length,
      errors
    });
  } catch (error) {
    logger.error(`Error uploading contacts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to upload contacts'
    });
  }
};

/**
 * Get contact statistics
 */
exports.getContactStats = async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    const whereClause = campaignId ? { campaignId } : {};
    
    // Get counts by status using only fields known to exist in database
    const statusCounts = await db.Contact.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['status']
    });
    
    // Format status counts
    const formattedStatusCounts = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.dataValues.count);
      return acc;
    }, {});
    
    // Get total count
    const totalCount = await db.Contact.count({
      where: whereClause
    });
    
    res.status(200).json({
      success: true,
      totalContacts: totalCount,
      statusBreakdown: formattedStatusCounts
    });
  } catch (error) {
    logger.error(`Error getting contact stats: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get contact statistics'
    });
  }
};

/**
 * Import helper utility - used for testing and development
 */
exports.importContactsFromArray = async (contactsArray, campaignId = null) => {
  try {
    const formattedContacts = contactsArray.map(contact => ({
      ...contact,
      campaignId,
      sourceType: 'api',
      customFields: contact.customFields || {}
    }));
    
    return await db.Contact.bulkCreate(formattedContacts);
  } catch (error) {
    logger.error(`Error importing contacts: ${error.message}`);
    throw error;
  }
};
