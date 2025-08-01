/**
 * Agent Service
 * 
 * Provides methods for interacting with voice agents and ElevenLabs API backend.
 */

import apiClient from './apiClient';

/**
 * Get list of configured agents
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status
 * @param {string} params.search - Search term for name
 * @returns {Promise<Object>} - Configured agents
 */
export const getConfiguredAgents = async (params = {}) => {
  return await apiClient.get('/agents', { params });
};

/**
 * Get agent configuration by ID
 * 
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - Agent configuration
 */
export const getAgentConfig = async (agentId) => {
  return await apiClient.get(`/agents/${agentId}`);
};

/**
 * Create new agent configuration
 * 
 * @param {Object} agentData - Agent configuration data
 * @param {string} agentData.name - Agent name
 * @param {string} agentData.voiceId - ElevenLabs voice ID
 * @param {string} agentData.description - Agent description
 * @param {Object} agentData.settings - Agent settings
 * @param {Object} agentData.personality - Agent personality settings
 * @returns {Promise<Object>} - Created agent configuration
 */
export const createAgentConfig = async (agentData) => {
  return await apiClient.post('/agents', agentData);
};

/**
 * Update agent configuration
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} agentData - Updated agent data
 * @returns {Promise<Object>} - Updated agent configuration
 */
export const updateAgentConfig = async (agentId, agentData) => {
  return await apiClient.put(`/agents/${agentId}`, agentData);
};

/**
 * Delete agent configuration
 * 
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - Deletion response
 */
export const deleteAgentConfig = async (agentId) => {
  return await apiClient.delete(`/agents/${agentId}`);
};

/**
 * Get agent metrics
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date
 * @param {string} params.endDate - End date
 * @param {string} params.groupBy - Group by parameter (day, week, month)
 * @returns {Promise<Object>} - Agent metrics
 */
export const getAgentMetrics = async (agentId, params = {}) => {
  return await apiClient.get(`/agents/${agentId}/metrics`, { params });
};

/**
 * Get list of available ElevenLabs voices
 * 
 * @returns {Promise<Object>} - Available voices
 */
export const getAvailableVoices = async () => {
  return await apiClient.get('/agents/voices');
};

/**
 * Test agent voice with sample text
 * 
 * @param {Object} testData - Test data
 * @param {string} testData.voiceId - ElevenLabs voice ID
 * @param {string} testData.text - Text to synthesize
 * @param {Object} testData.settings - Voice settings
 * @returns {Promise<Object>} - Audio response
 */
export const testAgentVoice = async (testData) => {
  return await apiClient.post('/agents/test-voice', testData);
};

/**
 * Clone an agent configuration
 * 
 * @param {string} agentId - Agent ID to clone
 * @param {Object} options - Clone options
 * @param {string} options.name - New agent name
 * @returns {Promise<Object>} - Cloned agent
 */
export const cloneAgentConfig = async (agentId, options = {}) => {
  return await apiClient.post(`/agents/${agentId}/clone`, options);
};

/**
 * Get agent call history
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.startDate - Filter by start date
 * @param {string} params.endDate - Filter by end date
 * @returns {Promise<Object>} - Agent call history
 */
export const getAgentCallHistory = async (agentId, params = {}) => {
  return await apiClient.get(`/agents/${agentId}/calls`, { params });
};

/**
 * Update agent personality settings
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} personalityData - Personality data
 * @returns {Promise<Object>} - Updated agent
 */
export const updateAgentPersonality = async (agentId, personalityData) => {
  return await apiClient.put(`/agents/${agentId}/personality`, personalityData);
};

/**
 * Update agent voice settings
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} voiceData - Voice settings data
 * @param {string} voiceData.voiceId - ElevenLabs voice ID
 * @param {Object} voiceData.settings - Voice settings (stability, clarity, etc.)
 * @returns {Promise<Object>} - Updated agent
 */
export const updateAgentVoiceSettings = async (agentId, voiceData) => {
  return await apiClient.put(`/agents/${agentId}/voice`, voiceData);
};

/**
 * Get agent campaigns
 * 
 * @param {string} agentId - Agent ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} - Agent campaigns
 */
export const getAgentCampaigns = async (agentId, params = {}) => {
  return await apiClient.get(`/agents/${agentId}/campaigns`, { params });
};

/**
 * Create a custom voice for an agent
 * 
 * @param {string} agentId - Agent ID
 * @param {FormData} formData - Voice data form
 * @returns {Promise<Object>} - Voice creation response
 */
export const createCustomVoice = async (agentId, formData) => {
  return await apiClient.post(`/agents/${agentId}/voices/custom`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default {
  getConfiguredAgents,
  getAgentConfig,
  createAgentConfig,
  updateAgentConfig,
  deleteAgentConfig,
  getAgentMetrics,
  getAvailableVoices,
  testAgentVoice,
  cloneAgentConfig,
  getAgentCallHistory,
  updateAgentPersonality,
  updateAgentVoiceSettings,
  getAgentCampaigns,
  createCustomVoice
};
