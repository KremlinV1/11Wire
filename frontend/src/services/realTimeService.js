/**
 * Real-Time Service
 * 
 * Provides methods for handling real-time data via WebSockets
 * for live call updates, agent status changes, and notifications.
 */

import io from 'socket.io-client';
import { getToken } from './authService';

let socket = null;

/**
 * Initialize the WebSocket connection
 * 
 * @param {Object} options - Socket.IO options
 * @param {Function} onConnect - Callback when connection is established
 * @param {Function} onDisconnect - Callback when connection is lost
 * @param {Function} onError - Callback when error occurs
 * @returns {Object} - Socket instance
 */
export const initializeSocket = (options = {}, onConnect, onDisconnect, onError) => {
  // Close existing socket if any
  if (socket) {
    socket.close();
  }

  // Get API URL from environment or use default
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Create new socket connection with authentication token
  socket = io(API_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: {
      token: getToken()
    },
    ...options
  });

  // Set up event handlers
  if (onConnect) socket.on('connect', onConnect);
  if (onDisconnect) socket.on('disconnect', onDisconnect);
  if (onError) socket.on('error', onError);

  return socket;
};

/**
 * Get the current socket instance
 * 
 * @returns {Object|null} - Socket instance or null if not connected
 */
export const getSocket = () => socket;

/**
 * Check if socket is connected
 * 
 * @returns {boolean} - Connection status
 */
export const isSocketConnected = () => socket && socket.connected;

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Subscribe to call events
 * 
 * @param {Function} onCallStarted - Callback for call started event
 * @param {Function} onCallEnded - Callback for call ended event
 * @param {Function} onCallUpdated - Callback for call status update event
 */
export const subscribeToCallEvents = (onCallStarted, onCallEnded, onCallUpdated) => {
  if (!socket) return;
  
  if (onCallStarted) socket.on('call:started', onCallStarted);
  if (onCallEnded) socket.on('call:ended', onCallEnded);
  if (onCallUpdated) socket.on('call:updated', onCallUpdated);
};

/**
 * Unsubscribe from call events
 */
export const unsubscribeFromCallEvents = () => {
  if (!socket) return;
  
  socket.off('call:started');
  socket.off('call:ended');
  socket.off('call:updated');
};

/**
 * Subscribe to agent events
 * 
 * @param {Function} onAgentStatusChanged - Callback for agent status change
 * @param {Function} onAgentMetricsUpdated - Callback for agent metrics update
 */
export const subscribeToAgentEvents = (onAgentStatusChanged, onAgentMetricsUpdated) => {
  if (!socket) return;
  
  if (onAgentStatusChanged) socket.on('agent:status_changed', onAgentStatusChanged);
  if (onAgentMetricsUpdated) socket.on('agent:metrics_updated', onAgentMetricsUpdated);
};

/**
 * Unsubscribe from agent events
 */
export const unsubscribeFromAgentEvents = () => {
  if (!socket) return;
  
  socket.off('agent:status_changed');
  socket.off('agent:metrics_updated');
};

/**
 * Subscribe to campaign events
 * 
 * @param {Function} onCampaignStatusChanged - Callback for campaign status change
 * @param {Function} onCampaignMetricsUpdated - Callback for campaign metrics update
 */
export const subscribeToCampaignEvents = (onCampaignStatusChanged, onCampaignMetricsUpdated) => {
  if (!socket) return;
  
  if (onCampaignStatusChanged) socket.on('campaign:status_changed', onCampaignStatusChanged);
  if (onCampaignMetricsUpdated) socket.on('campaign:metrics_updated', onCampaignMetricsUpdated);
};

/**
 * Unsubscribe from campaign events
 */
export const unsubscribeFromCampaignEvents = () => {
  if (!socket) return;
  
  socket.off('campaign:status_changed');
  socket.off('campaign:metrics_updated');
};

/**
 * Subscribe to queue events
 * 
 * @param {Function} onQueueItemAdded - Callback for queue item added
 * @param {Function} onQueueItemRemoved - Callback for queue item removed
 * @param {Function} onQueueItemUpdated - Callback for queue item updated
 */
export const subscribeToQueueEvents = (onQueueItemAdded, onQueueItemRemoved, onQueueItemUpdated) => {
  if (!socket) return;
  
  if (onQueueItemAdded) socket.on('queue:item_added', onQueueItemAdded);
  if (onQueueItemRemoved) socket.on('queue:item_removed', onQueueItemRemoved);
  if (onQueueItemUpdated) socket.on('queue:item_updated', onQueueItemUpdated);
};

/**
 * Unsubscribe from queue events
 */
export const unsubscribeFromQueueEvents = () => {
  if (!socket) return;
  
  socket.off('queue:item_added');
  socket.off('queue:item_removed');
  socket.off('queue:item_updated');
};

/**
 * Subscribe to notification events
 * 
 * @param {Function} onNotification - Callback for new notification
 */
export const subscribeToNotifications = (onNotification) => {
  if (!socket) return;
  
  if (onNotification) socket.on('notification', onNotification);
};

/**
 * Unsubscribe from notification events
 */
export const unsubscribeFromNotifications = () => {
  if (!socket) return;
  
  socket.off('notification');
};

/**
 * Subscribe to system events
 * 
 * @param {Function} onSystemAlert - Callback for system alert
 */
export const subscribeToSystemEvents = (onSystemAlert) => {
  if (!socket) return;
  
  if (onSystemAlert) socket.on('system:alert', onSystemAlert);
};

/**
 * Unsubscribe from system events
 */
export const unsubscribeFromSystemEvents = () => {
  if (!socket) return;
  
  socket.off('system:alert');
};

/**
 * Send a heartbeat ping to keep connection alive
 */
export const sendHeartbeat = () => {
  if (!socket) return;
  
  socket.emit('heartbeat');
};

export default {
  initializeSocket,
  getSocket,
  isSocketConnected,
  disconnectSocket,
  subscribeToCallEvents,
  unsubscribeFromCallEvents,
  subscribeToAgentEvents,
  unsubscribeFromAgentEvents,
  subscribeToCampaignEvents,
  unsubscribeFromCampaignEvents,
  subscribeToQueueEvents,
  unsubscribeFromQueueEvents,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  subscribeToSystemEvents,
  unsubscribeFromSystemEvents,
  sendHeartbeat
};
