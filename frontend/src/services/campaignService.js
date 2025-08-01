/**
 * Campaign Service
 * 
 * Provides methods for interacting with the campaigns backend API.
 */

import apiClient from './apiClient';

/**
 * Get paginated list of campaigns
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status
 * @param {string} params.search - Search term for name
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortDir - Sort direction (asc/desc)
 * @returns {Promise<Object>} - Paginated campaigns response
 */
export const getCampaigns = async (params = {}) => {
  return await apiClient.get('/campaigns', { params });
};

/**
 * Get campaign details by ID
 * 
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} - Campaign details
 */
export const getCampaignDetails = async (campaignId) => {
  return await apiClient.get(`/campaigns/${campaignId}`);
};

/**
 * Create a new campaign
 * 
 * @param {Object} campaignData - Campaign data
 * @param {string} campaignData.name - Campaign name
 * @param {string} campaignData.description - Campaign description
 * @param {string} campaignData.status - Campaign status
 * @param {string} campaignData.agentId - Agent ID
 * @param {Object} campaignData.settings - Campaign settings
 * @returns {Promise<Object>} - Created campaign
 */
export const createCampaign = async (campaignData) => {
  return await apiClient.post('/campaigns', campaignData);
};

/**
 * Update an existing campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} campaignData - Updated campaign data
 * @returns {Promise<Object>} - Updated campaign
 */
export const updateCampaign = async (campaignId, campaignData) => {
  return await apiClient.put(`/campaigns/${campaignId}`, campaignData);
};

/**
 * Delete a campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} - Deletion response
 */
export const deleteCampaign = async (campaignId) => {
  return await apiClient.delete(`/campaigns/${campaignId}`);
};

/**
 * Get campaign statistics
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.groupBy - Group by (day, week, month)
 * @returns {Promise<Object>} - Campaign statistics
 */
export const getCampaignStatistics = async (campaignId, params = {}) => {
  return await apiClient.get(`/campaigns/${campaignId}/statistics`, { params });
};

/**
 * Get campaign contacts
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortDir - Sort direction (asc/desc)
 * @returns {Promise<Object>} - Campaign contacts
 */
export const getCampaignContacts = async (campaignId, params = {}) => {
  return await apiClient.get(`/campaigns/${campaignId}/contacts`, { params });
};

/**
 * Get campaign call logs
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status
 * @returns {Promise<Object>} - Campaign call logs
 */
export const getCampaignCallLogs = async (campaignId, params = {}) => {
  return await apiClient.get(`/campaigns/${campaignId}/calls`, { params });
};

/**
 * Activate a campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} - Activation response
 */
export const activateCampaign = async (campaignId) => {
  return await apiClient.post(`/campaigns/${campaignId}/activate`);
};

/**
 * Pause a campaign
 * 
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} - Pause response
 */
export const pauseCampaign = async (campaignId) => {
  return await apiClient.post(`/campaigns/${campaignId}/pause`);
};

/**
 * Clone a campaign
 * 
 * @param {string} campaignId - Campaign ID to clone
 * @param {Object} options - Clone options
 * @param {string} options.name - New campaign name
 * @param {boolean} options.includeContacts - Whether to include contacts
 * @returns {Promise<Object>} - Cloned campaign
 */
export const cloneCampaign = async (campaignId, options = {}) => {
  return await apiClient.post(`/campaigns/${campaignId}/clone`, options);
};

/**
 * Update campaign script
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} scriptData - Script data
 * @param {string} scriptData.script - Script content
 * @param {Object} scriptData.variables - Script variables
 * @returns {Promise<Object>} - Updated campaign
 */
export const updateCampaignScript = async (campaignId, scriptData) => {
  return await apiClient.put(`/campaigns/${campaignId}/script`, scriptData);
};

/**
 * Update campaign settings
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - Campaign settings
 * @returns {Promise<Object>} - Updated campaign
 */
export const updateCampaignSettings = async (campaignId, settings) => {
  return await apiClient.put(`/campaigns/${campaignId}/settings`, settings);
};

/**
 * Get campaign queued calls
 * 
 * @param {string} campaignId - Campaign ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} - Queued calls
 */
export const getCampaignQueuedCalls = async (campaignId, params = {}) => {
  return await apiClient.get(`/campaigns/${campaignId}/queue`, { params });
};

export default {
  getCampaigns,
  getCampaignDetails,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStatistics,
  getCampaignContacts,
  getCampaignCallLogs,
  activateCampaign,
  pauseCampaign,
  cloneCampaign,
  updateCampaignScript,
  updateCampaignSettings,
  getCampaignQueuedCalls
};
