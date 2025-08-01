/**
 * Contact Service
 * 
 * Provides methods for interacting with the contacts backend API.
 */

import apiClient from './apiClient';

/**
 * Get paginated list of contacts
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term for name, email, or phone
 * @param {string} params.campaignId - Filter by campaign ID
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortDir - Sort direction (asc/desc)
 * @param {string} params.tag - Filter by tag
 * @returns {Promise<Object>} - Paginated contacts response
 */
export const getContacts = async (params = {}) => {
  return await apiClient.get('/contacts', { params });
};

/**
 * Get contact details by ID
 * 
 * @param {string|number} contactId - Contact ID
 * @returns {Promise<Object>} - Contact details
 */
export const getContactDetails = async (contactId) => {
  return await apiClient.get(`/contacts/${contactId}`);
};

/**
 * Create a new contact
 * 
 * @param {Object} contactData - Contact data
 * @param {string} contactData.firstName - First name
 * @param {string} contactData.lastName - Last name
 * @param {string} contactData.phoneNumber - Phone number
 * @param {string} contactData.email - Email address
 * @param {Object} contactData.metadata - Optional metadata
 * @returns {Promise<Object>} - Created contact
 */
export const createContact = async (contactData) => {
  return await apiClient.post('/contacts', contactData);
};

/**
 * Update an existing contact
 * 
 * @param {string|number} contactId - Contact ID
 * @param {Object} contactData - Updated contact data
 * @returns {Promise<Object>} - Updated contact
 */
export const updateContact = async (contactId, contactData) => {
  return await apiClient.put(`/contacts/${contactId}`, contactData);
};

/**
 * Delete a contact
 * 
 * @param {string|number} contactId - Contact ID
 * @returns {Promise<Object>} - Deletion response
 */
export const deleteContact = async (contactId) => {
  return await apiClient.delete(`/contacts/${contactId}`);
};

/**
 * Get contact call history
 * 
 * @param {string|number} contactId - Contact ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} - Contact call history
 */
export const getContactCallHistory = async (contactId, params = {}) => {
  return await apiClient.get(`/contacts/${contactId}/calls`, { params });
};

/**
 * Get contact conversations
 * 
 * @param {string|number} contactId - Contact ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} - Contact conversations
 */
export const getContactConversations = async (contactId, params = {}) => {
  return await apiClient.get(`/contacts/${contactId}/conversations`, { params });
};

/**
 * Add tag to contact
 * 
 * @param {string|number} contactId - Contact ID
 * @param {string} tag - Tag to add
 * @returns {Promise<Object>} - Updated contact
 */
export const addContactTag = async (contactId, tag) => {
  return await apiClient.post(`/contacts/${contactId}/tags`, { tag });
};

/**
 * Remove tag from contact
 * 
 * @param {string|number} contactId - Contact ID
 * @param {string} tag - Tag to remove
 * @returns {Promise<Object>} - Updated contact
 */
export const removeContactTag = async (contactId, tag) => {
  return await apiClient.delete(`/contacts/${contactId}/tags/${tag}`);
};

/**
 * Preview contact import from CSV or XLSX file
 * 
 * @param {FormData} formData - Form data with file
 * @returns {Promise<Object>} - Preview results with headers and sample rows
 */
export const previewImport = async (formData) => {
  return await apiClient.post('/contacts/import/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Import contacts from CSV or XLSX file
 * 
 * @param {FormData} formData - Form data with file and options
 * @param {Function} onUploadProgress - Progress callback
 * @returns {Promise<Object>} - Import results
 */
export const importContacts = async (formData, onUploadProgress = null) => {
  return await apiClient.post('/contacts/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

/**
 * Get available campaigns
 * 
 * @returns {Promise<Array>} - List of campaigns
 */
export const getCampaigns = async () => {
  return await apiClient.get('/campaigns');
};

/**
 * Export contacts to CSV
 * 
 * @param {Object} filters - Export filters
 * @param {string} filters.campaignId - Filter by campaign ID
 * @param {string} filters.tag - Filter by tag
 * @returns {Promise<Blob>} - CSV file blob
 */
export const exportContactsToCsv = async (filters = {}) => {
  return await apiClient.get('/contacts/export', {
    params: filters,
    responseType: 'blob',
  });
};

/**
 * Add contacts to campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Array<string|number>} contactIds - Contact IDs to add
 * @returns {Promise<Object>} - Result
 */
export const addContactsToCampaign = async (campaignId, contactIds) => {
  return await apiClient.post(`/campaigns/${campaignId}/contacts`, { contactIds });
};

/**
 * Remove contacts from campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Array<string|number>} contactIds - Contact IDs to remove
 * @returns {Promise<Object>} - Result
 */
export const removeContactsFromCampaign = async (campaignId, contactIds) => {
  return await apiClient.delete(`/campaigns/${campaignId}/contacts`, {
    data: { contactIds },
  });
};

export const contactService = {
  getContacts,
  getContactDetails,
  createContact,
  updateContact,
  deleteContact,
  getContactCallHistory,
  getContactConversations,
  addContactTag,
  removeContactTag,
  previewImport,
  importContacts,
  exportContactsToCsv,
  getCampaigns,
  addContactsToCampaign,
  removeContactsFromCampaign
};

export default contactService;
