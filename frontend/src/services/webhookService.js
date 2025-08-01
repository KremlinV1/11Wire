/**
 * Webhook Service
 * 
 * Provides methods for interacting with the webhooks backend API.
 * Handles webhook configurations, logs, and testing.
 */

import apiClient from './apiClient';

/**
 * Get paginated list of webhook configurations
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status (active, inactive)
 * @returns {Promise<Object>} - Paginated webhook configurations
 */
export const getWebhookConfigurations = async (params = {}) => {
  return await apiClient.get('/webhooks', { params });
};

/**
 * Get webhook configuration by ID
 * 
 * @param {string} webhookId - Webhook ID
 * @returns {Promise<Object>} - Webhook configuration
 */
export const getWebhookConfigurationById = async (webhookId) => {
  return await apiClient.get(`/webhooks/${webhookId}`);
};

/**
 * Create new webhook configuration
 * 
 * @param {Object} webhookData - Webhook configuration data
 * @param {string} webhookData.name - Webhook name
 * @param {string} webhookData.targetUrl - Target URL to receive events
 * @param {Array<string>} webhookData.events - Array of events to trigger webhook
 * @param {Object} webhookData.headers - Custom headers to include
 * @param {boolean} webhookData.active - Whether webhook is active
 * @param {string} webhookData.secret - Secret key for signature validation
 * @returns {Promise<Object>} - Created webhook configuration
 */
export const createWebhookConfiguration = async (webhookData) => {
  return await apiClient.post('/webhooks', webhookData);
};

/**
 * Update webhook configuration
 * 
 * @param {string} webhookId - Webhook ID
 * @param {Object} webhookData - Updated webhook data
 * @returns {Promise<Object>} - Updated webhook configuration
 */
export const updateWebhookConfiguration = async (webhookId, webhookData) => {
  return await apiClient.put(`/webhooks/${webhookId}`, webhookData);
};

/**
 * Delete webhook configuration
 * 
 * @param {string} webhookId - Webhook ID
 * @returns {Promise<Object>} - Deletion response
 */
export const deleteWebhookConfiguration = async (webhookId) => {
  return await apiClient.delete(`/webhooks/${webhookId}`);
};

/**
 * Activate webhook
 * 
 * @param {string} webhookId - Webhook ID
 * @returns {Promise<Object>} - Activation response
 */
export const activateWebhook = async (webhookId) => {
  return await apiClient.post(`/webhooks/${webhookId}/activate`);
};

/**
 * Deactivate webhook
 * 
 * @param {string} webhookId - Webhook ID
 * @returns {Promise<Object>} - Deactivation response
 */
export const deactivateWebhook = async (webhookId) => {
  return await apiClient.post(`/webhooks/${webhookId}/deactivate`);
};

/**
 * Get webhook delivery logs
 * 
 * @param {string} webhookId - Webhook ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status (success, failed)
 * @param {string} params.startDate - Filter by start date
 * @param {string} params.endDate - Filter by end date
 * @returns {Promise<Object>} - Webhook delivery logs
 */
export const getWebhookLogs = async (webhookId, params = {}) => {
  return await apiClient.get(`/webhooks/${webhookId}/logs`, { params });
};

/**
 * Test webhook delivery
 * 
 * @param {string} webhookId - Webhook ID
 * @param {Object} testData - Test data
 * @param {string} testData.eventType - Event type to simulate
 * @param {Object} testData.payload - Test event payload
 * @returns {Promise<Object>} - Test delivery response
 */
export const testWebhookDelivery = async (webhookId, testData) => {
  return await apiClient.post(`/webhooks/${webhookId}/test`, testData);
};

/**
 * Retry failed webhook delivery
 * 
 * @param {string} webhookId - Webhook ID
 * @param {string} deliveryId - Delivery log ID
 * @returns {Promise<Object>} - Retry response
 */
export const retryWebhookDelivery = async (webhookId, deliveryId) => {
  return await apiClient.post(`/webhooks/${webhookId}/logs/${deliveryId}/retry`);
};

/**
 * Get available webhook event types
 * 
 * @returns {Promise<Object>} - Available webhook event types
 */
export const getWebhookEventTypes = async () => {
  return await apiClient.get('/webhooks/event-types');
};

/**
 * Generate new webhook secret
 * 
 * @param {string} webhookId - Webhook ID (optional, for existing webhooks)
 * @returns {Promise<Object>} - Generated secret
 */
export const generateWebhookSecret = async (webhookId = null) => {
  if (webhookId) {
    return await apiClient.post(`/webhooks/${webhookId}/generate-secret`);
  }
  return await apiClient.post('/webhooks/generate-secret');
};

/**
 * Get webhook statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @returns {Promise<Object>} - Webhook statistics
 */
export const getWebhookStatistics = async (params = {}) => {
  return await apiClient.get('/webhooks/statistics', { params });
};

/**
 * Verify webhook URL
 * 
 * @param {Object} data - URL data
 * @param {string} data.url - URL to verify
 * @returns {Promise<Object>} - Verification response
 */
export const verifyWebhookUrl = async (data) => {
  return await apiClient.post('/webhooks/verify-url', data);
};

export default {
  getWebhookConfigurations,
  getWebhookConfigurationById,
  createWebhookConfiguration,
  updateWebhookConfiguration,
  deleteWebhookConfiguration,
  activateWebhook,
  deactivateWebhook,
  getWebhookLogs,
  testWebhookDelivery,
  retryWebhookDelivery,
  getWebhookEventTypes,
  generateWebhookSecret,
  getWebhookStatistics,
  verifyWebhookUrl
};
