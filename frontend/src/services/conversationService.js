/**
 * Conversation Service
 * Provides methods for interacting with conversation API endpoints
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

const CONVERSATION_API = `${API_BASE_URL}/conversations`;

/**
 * Get conversations with filtering and pagination
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise} Promise with conversation data
 */
export const getConversations = async (params = {}) => {
  try {
    const response = await axios.get(CONVERSATION_API, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Get a specific conversation by ID
 * @param {number} id - Conversation ID
 * @returns {Promise} Promise with conversation data
 */
export const getConversationById = async (id) => {
  try {
    const response = await axios.get(`${CONVERSATION_API}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching conversation ${id}:`, error);
    throw error;
  }
};

/**
 * Update conversation metadata
 * @param {number} id - Conversation ID
 * @param {Object} metadata - Metadata object to update
 * @returns {Promise} Promise with updated conversation data
 */
export const updateConversationMetadata = async (id, metadata) => {
  try {
    const response = await axios.put(`${CONVERSATION_API}/${id}/metadata`, { metadata });
    return response.data;
  } catch (error) {
    console.error(`Error updating conversation metadata for ${id}:`, error);
    throw error;
  }
};

/**
 * Get conversation statistics
 * @param {Object} params - Query parameters for filtering stats
 * @returns {Promise} Promise with conversation statistics
 */
export const getConversationStats = async (params = {}) => {
  try {
    const response = await axios.get(`${CONVERSATION_API}/stats`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversation statistics:', error);
    throw error;
  }
};

/**
 * Helper to format conversation metadata in a consistent way
 * @param {Object} metadata - Raw metadata object
 * @returns {Object} Formatted metadata
 */
export const formatConversationMetadata = (metadata = {}) => {
  return {
    outcome: metadata.outcome || 'unknown',
    sentiment: metadata.sentiment || { positive: 0, negative: 0, neutral: 0 },
    topics: metadata.topics || [],
    keyPoints: metadata.key_points || [],
    actionItems: metadata.action_items || []
  };
};

export default {
  getConversations,
  getConversationById,
  updateConversationMetadata,
  getConversationStats,
  formatConversationMetadata
};
