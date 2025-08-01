/**
 * Call Service
 * 
 * Provides methods for interacting with call-related backend APIs:
 * - Call Logs API
 * - Call Recordings API
 * - Call Transfers API
 * - Call Queue API
 */

import apiClient from './apiClient';

/**
 * Call Logs API
 */
export const callLogs = {
  /**
   * Get paginated list of call logs
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by call status
   * @param {string} params.campaignId - Filter by campaign ID
   * @param {string} params.phoneNumber - Filter by phone number
   * @param {string} params.direction - Filter by direction (inbound/outbound)
   * @param {string} params.startDate - Filter by start date
   * @param {string} params.endDate - Filter by end date
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortDir - Sort direction (asc/desc)
   * @returns {Promise<Object>} - Paginated call logs response
   */
  getCallLogs: async (params = {}) => {
    return await apiClient.get('/calls', { params });
  },

  /**
   * Get call log details by ID
   * 
   * @param {string} callId - Call ID or SID
   * @returns {Promise<Object>} - Call log details
   */
  getCallDetails: async (callId) => {
    return await apiClient.get(`/calls/${callId}`);
  },

  /**
   * Get call statistics
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.campaignId - Filter by campaign ID
   * @param {string} params.startDate - Filter by start date
   * @param {string} params.endDate - Filter by end date
   * @param {string} params.groupBy - Group by parameter (day, week, month)
   * @returns {Promise<Object>} - Call statistics
   */
  getCallStatistics: async (params = {}) => {
    return await apiClient.get('/calls/statistics', { params });
  }
};

/**
 * Call Recordings API
 */
export const callRecordings = {
  /**
   * Get paginated list of call recordings
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.callId - Filter by call ID
   * @param {string} params.status - Filter by status
   * @returns {Promise<Object>} - Paginated call recordings response
   */
  getRecordings: async (params = {}) => {
    return await apiClient.get('/call-recordings', { params });
  },

  /**
   * Get recording details by ID
   * 
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Recording details
   */
  getRecordingDetails: async (recordingId) => {
    return await apiClient.get(`/call-recordings/${recordingId}`);
  },

  /**
   * Get recording audio URL
   * 
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Recording audio URL
   */
  getRecordingAudioUrl: async (recordingId) => {
    return await apiClient.get(`/call-recordings/${recordingId}/audio`);
  },

  /**
   * Delete a recording
   * 
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Deletion response
   */
  deleteRecording: async (recordingId) => {
    return await apiClient.delete(`/call-recordings/${recordingId}`);
  }
};

/**
 * Call Transfers API
 */
export const callTransfers = {
  /**
   * Get list of active transfers
   * 
   * @returns {Promise<Object>} - Active transfers response
   */
  getActiveTransfers: async () => {
    return await apiClient.get('/transfers/active');
  },

  /**
   * Get transfer history
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.callId - Filter by call ID
   * @returns {Promise<Object>} - Transfer history response
   */
  getTransferHistory: async (params = {}) => {
    return await apiClient.get('/transfers/history', { params });
  },

  /**
   * Initiate a call transfer
   * 
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.callSid - Call SID to transfer
   * @param {string} transferData.destinationType - Destination type (phone/agent)
   * @param {string} transferData.destination - Destination phone or agent ID
   * @param {Object} transferData.metadata - Optional metadata to preserve
   * @returns {Promise<Object>} - Transfer initiation response
   */
  initiateTransfer: async (transferData) => {
    return await apiClient.post('/transfers/initiate', transferData);
  },

  /**
   * Complete a transfer
   * 
   * @param {string} transferId - Transfer ID
   * @returns {Promise<Object>} - Transfer completion response
   */
  completeTransfer: async (transferId) => {
    return await apiClient.post(`/transfers/${transferId}/complete`);
  },

  /**
   * Cancel a transfer
   * 
   * @param {string} transferId - Transfer ID
   * @returns {Promise<Object>} - Transfer cancellation response
   */
  cancelTransfer: async (transferId) => {
    return await apiClient.post(`/transfers/${transferId}/cancel`);
  }
};

/**
 * Call Queue API
 */
export const callQueue = {
  /**
   * Get queue status
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.campaignId - Filter by campaign ID
   * @returns {Promise<Object>} - Queue status response
   */
  getQueueStatus: async (params = {}) => {
    return await apiClient.get('/call-queue/status', { params });
  },

  /**
   * Get paginated list of queue items
   * 
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status
   * @param {string} params.campaignId - Filter by campaign ID
   * @param {string} params.contactId - Filter by contact ID
   * @param {string} params.search - Search by contact name or phone number
   * @returns {Promise<Object>} - Paginated queue items response
   */
  getQueueItems: async (params = {}) => {
    return await apiClient.get('/call-queue', { params });
  },

  /**
   * Get queue item details
   * 
   * @param {string} queueId - Queue item ID
   * @returns {Promise<Object>} - Queue item details response
   */
  getQueueItemDetails: async (queueId) => {
    return await apiClient.get(`/call-queue/${queueId}`);
  },

  /**
   * Add item to call queue
   * 
   * @param {Object} queueItem - Queue item data
   * @param {string} queueItem.contactId - Contact ID
   * @param {string} queueItem.campaignId - Campaign ID
   * @param {number} queueItem.priority - Priority (higher = higher priority)
   * @param {string} queueItem.nextAttemptTime - Next attempt time
   * @returns {Promise<Object>} - Queue item creation response
   */
  addToQueue: async (queueItem) => {
    return await apiClient.post('/call-queue', queueItem);
  },

  /**
   * Update queue item
   * 
   * @param {string} queueId - Queue item ID
   * @param {Object} queueItem - Updated queue item data
   * @returns {Promise<Object>} - Queue item update response
   */
  updateQueueItem: async (queueId, queueItem) => {
    return await apiClient.put(`/call-queue/${queueId}`, queueItem);
  },

  /**
   * Delete queue item
   * 
   * @param {string} queueId - Queue item ID
   * @returns {Promise<Object>} - Queue item deletion response
   */
  deleteQueueItem: async (queueId) => {
    return await apiClient.delete(`/call-queue/${queueId}`);
  },

  /**
   * Add multiple items to queue
   * 
   * @param {Object} bulkData - Bulk queue data
   * @param {string} bulkData.campaignId - Campaign ID
   * @param {Array<string|number>} bulkData.contacts - Array of contact IDs
   * @param {number} bulkData.priority - Priority
   * @param {string} bulkData.startTime - Start time for first call
   * @param {number} bulkData.spacing - Seconds between calls
   * @returns {Promise<Object>} - Bulk add response
   */
  bulkAddToQueue: async (bulkData) => {
    return await apiClient.post('/call-queue/bulk', bulkData);
  },

  /**
   * Cancel an in-progress call
   * 
   * @param {string} queueId - Queue item ID
   * @param {Object} data - Cancellation data
   * @param {string} data.reason - Cancellation reason
   * @returns {Promise<Object>} - Cancellation response
   */
  cancelCall: async (queueId, data) => {
    return await apiClient.post(`/call-queue/${queueId}/cancel`, data);
  },

  /**
   * Schedule a callback
   * 
   * @param {string} queueId - Queue item ID
   * @param {Object} data - Callback data
   * @param {string} data.callbackTime - Callback time
   * @param {number} data.priority - New priority for callback
   * @returns {Promise<Object>} - Callback scheduling response
   */
  scheduleCallback: async (queueId, data) => {
    return await apiClient.post(`/call-queue/${queueId}/callback`, data);
  },

  /**
   * Initiate call immediately
   * 
   * @param {string} queueId - Queue item ID
   * @param {Object} data - Call data
   * @returns {Promise<Object>} - Call initiation response
   */
  callNow: async (queueId, data = {}) => {
    return await apiClient.post(`/call-queue/${queueId}/call-now`, data);
  }
};

export default {
  callLogs,
  callRecordings,
  callTransfers,
  callQueue
};
