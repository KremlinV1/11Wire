/**
 * Statistics Service
 * 
 * Provides methods for interacting with the statistics and dashboard data APIs.
 */

import apiClient from './apiClient';

/**
 * Get dashboard overview statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.timeZone - Time zone
 * @returns {Promise<Object>} - Dashboard overview statistics
 */
export const getDashboardOverview = async (params = {}) => {
  return await apiClient.get('/dashboard/overview', { params });
};

/**
 * Get calls statistics for dashboard
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.groupBy - Group by (day, week, month)
 * @param {string} params.timeZone - Time zone
 * @returns {Promise<Object>} - Call statistics
 */
export const getCallStatistics = async (params = {}) => {
  return await apiClient.get('/dashboard/calls', { params });
};

/**
 * Get agent performance statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.agentId - Filter by agent ID
 * @param {string} params.campaignId - Filter by campaign ID
 * @returns {Promise<Object>} - Agent performance statistics
 */
export const getAgentPerformance = async (params = {}) => {
  return await apiClient.get('/dashboard/agents', { params });
};

/**
 * Get campaign performance statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.campaignId - Filter by campaign ID
 * @returns {Promise<Object>} - Campaign performance statistics
 */
export const getCampaignPerformance = async (params = {}) => {
  return await apiClient.get('/dashboard/campaigns', { params });
};

/**
 * Get contact engagement statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.campaignId - Filter by campaign ID
 * @returns {Promise<Object>} - Contact engagement statistics
 */
export const getContactEngagement = async (params = {}) => {
  return await apiClient.get('/dashboard/contacts', { params });
};

/**
 * Get system health statistics
 * 
 * @returns {Promise<Object>} - System health statistics
 */
export const getSystemHealth = async () => {
  return await apiClient.get('/dashboard/system-health');
};

/**
 * Get real-time statistics
 * 
 * @returns {Promise<Object>} - Real-time statistics
 */
export const getRealTimeStats = async () => {
  return await apiClient.get('/dashboard/real-time');
};

/**
 * Get custom date range statistics
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {Array<string>} params.metrics - Metrics to include
 * @param {string} params.groupBy - Group by (day, week, month)
 * @returns {Promise<Object>} - Custom statistics
 */
export const getCustomStatistics = async (params = {}) => {
  return await apiClient.post('/dashboard/custom', params);
};

/**
 * Export dashboard data to CSV
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.reportType - Report type (calls, agents, campaigns)
 * @returns {Promise<Blob>} - CSV file blob
 */
export const exportDashboardData = async (params = {}) => {
  return await apiClient.get('/dashboard/export', { 
    params,
    responseType: 'blob'
  });
};

export default {
  getDashboardOverview,
  getCallStatistics,
  getAgentPerformance,
  getCampaignPerformance,
  getContactEngagement,
  getSystemHealth,
  getRealTimeStats,
  getCustomStatistics,
  exportDashboardData
};
