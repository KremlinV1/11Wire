/**
 * Contact Service
 * 
 * Service to handle contact management operations
 */

const db = require('../models');
const logger = require('../utils/logger');
const { Contact } = db;

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @returns {Object} Created contact
 */
const createContact = async (contactData) => {
  try {
    const contact = await Contact.create({
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      phone: contactData.phone,
      email: contactData.email || null,
      company: contactData.company || null,
      jobTitle: contactData.jobTitle || null,
      address: contactData.address || null,
      city: contactData.city || null,
      state: contactData.state || null,
      zipCode: contactData.zipCode || null,
      country: contactData.country || null,
      notes: contactData.notes || null,
      tags: contactData.tags || [],
      metadata: contactData.metadata || {},
      campaignId: contactData.campaignId || null,
      status: contactData.status || 'active'
    });

    logger.debug(`Contact created: ${contact.id}`);
    return contact;
  } catch (error) {
    logger.error(`Error creating contact: ${error.message}`);
    throw error;
  }
};

/**
 * Get a contact by ID
 * @param {string} contactId - Contact ID
 * @returns {Object} Contact or null if not found
 */
const getContactById = async (contactId) => {
  try {
    const contact = await Contact.findByPk(contactId);
    return contact;
  } catch (error) {
    logger.error(`Error getting contact by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Get a contact by phone number
 * @param {string} phone - Phone number
 * @returns {Object} Contact or null if not found
 */
const getContactByPhone = async (phone) => {
  try {
    const contact = await Contact.findOne({
      where: { phone }
    });
    return contact;
  } catch (error) {
    logger.error(`Error getting contact by phone: ${error.message}`);
    throw error;
  }
};

/**
 * Update a contact
 * @param {string} contactId - Contact ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated contact
 */
const updateContact = async (contactId, updateData) => {
  try {
    const contact = await Contact.findByPk(contactId);
    
    if (!contact) {
      throw new Error(`Contact not found with ID: ${contactId}`);
    }
    
    await contact.update(updateData);
    
    logger.debug(`Contact updated: ${contactId}`);
    return contact;
  } catch (error) {
    logger.error(`Error updating contact: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a contact
 * @param {string} contactId - Contact ID
 * @returns {boolean} Success status
 */
const deleteContact = async (contactId) => {
  try {
    const contact = await Contact.findByPk(contactId);
    
    if (!contact) {
      throw new Error(`Contact not found with ID: ${contactId}`);
    }
    
    await contact.destroy();
    
    logger.debug(`Contact deleted: ${contactId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting contact: ${error.message}`);
    throw error;
  }
};

/**
 * List contacts with filtering
 * @param {Object} filters - Query filters
 * @param {Object} options - Query options (pagination, sorting)
 * @returns {Object} Contacts and count
 */
const listContacts = async (filters = {}, options = {}) => {
  try {
    const queryOptions = {
      where: filters,
      order: options.order || [['createdAt', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    };
    
    if (options.include) {
      queryOptions.include = options.include;
    }
    
    const { count, rows } = await Contact.findAndCountAll(queryOptions);
    
    return {
      contacts: rows,
      total: count
    };
  } catch (error) {
    logger.error(`Error listing contacts: ${error.message}`);
    throw error;
  }
};

/**
 * Import contacts in bulk
 * @param {Array} contacts - Array of contact data objects
 * @param {Object} options - Import options
 * @returns {Object} Import results
 */
const bulkImportContacts = async (contacts, options = {}) => {
  try {
    const importResults = {
      total: contacts.length,
      imported: 0,
      failed: 0,
      errors: []
    };
    
    for (const contactData of contacts) {
      try {
        // Check for duplicates if enabled
        if (options.checkDuplicates && contactData.phone) {
          const existing = await getContactByPhone(contactData.phone);
          
          if (existing) {
            if (options.updateExisting) {
              // Update existing contact
              await updateContact(existing.id, {
                ...contactData,
                updatedAt: new Date()
              });
              importResults.imported++;
              continue;
            } else {
              // Skip duplicate
              importResults.failed++;
              importResults.errors.push({
                contact: contactData,
                error: 'Duplicate phone number'
              });
              continue;
            }
          }
        }
        
        // Create new contact
        await createContact({
          ...contactData,
          campaignId: options.campaignId || null
        });
        
        importResults.imported++;
      } catch (error) {
        importResults.failed++;
        importResults.errors.push({
          contact: contactData,
          error: error.message
        });
      }
    }
    
    return importResults;
  } catch (error) {
    logger.error(`Error bulk importing contacts: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createContact,
  getContactById,
  getContactByPhone,
  updateContact,
  deleteContact,
  listContacts,
  bulkImportContacts
};
