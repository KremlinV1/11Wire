/**
 * Call Events Service
 * Provides real-time call event listeners and handlers for SignalWire integration
 */

const EventEmitter = require('events');
const socketIo = require('socket.io');
const logger = require('../utils/logger');
const config = require('../config');

// Create event emitter for call events
const callEventEmitter = new EventEmitter();

// Store active listeners by call SID
const activeListeners = new Map();

// Socket.io instance for real-time updates to clients
let io = null;

/**
 * Initialize Socket.IO server for real-time event broadcasting
 * @param {Object} server - HTTP/HTTPS server to attach Socket.IO to
 */
const initializeSocketServer = (server) => {
  io = socketIo(server, {
    path: '/socket.io',
    cors: {
      origin: config.corsOrigins || '*',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    logger.info(`Client connected to Socket.IO: ${socket.id}`);
    
    // Handle client subscribing to call events
    socket.on('subscribe', (callSid) => {
      if (callSid) {
        socket.join(`call:${callSid}`);
        logger.info(`Client ${socket.id} subscribed to call ${callSid}`);
      }
    });
    
    // Handle client unsubscribing from call events
    socket.on('unsubscribe', (callSid) => {
      if (callSid) {
        socket.leave(`call:${callSid}`);
        logger.info(`Client ${socket.id} unsubscribed from call ${callSid}`);
      }
    });
    
    // Handle client subscribing to all call events (admin/dashboard)
    socket.on('subscribe_all', () => {
      socket.join('calls:all');
      logger.info(`Client ${socket.id} subscribed to all call events`);
    });
    
    // Handle client unsubscribing from all call events
    socket.on('unsubscribe_all', () => {
      socket.leave('calls:all');
      logger.info(`Client ${socket.id} unsubscribed from all call events`);
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected from Socket.IO: ${socket.id}`);
    });
  });
  
  logger.info('Socket.IO server initialized for call events');
  
  return io;
};

/**
 * Add a call event listener
 * @param {string} callSid - Call SID
 * @param {Function} callback - Callback function to execute when event occurs
 * @param {string} eventType - Type of event to listen for (default: all)
 * @returns {Function} Function to remove the listener
 */
const addCallEventListener = (callSid, callback, eventType = 'all') => {
  const eventName = eventType === 'all' ? `call:${callSid}:*` : `call:${callSid}:${eventType}`;
  
  // Create listener function
  const listener = (event) => {
    callback(event);
  };
  
  // Add listener to event emitter
  callEventEmitter.on(eventName, listener);
  
  // Store listener information
  if (!activeListeners.has(callSid)) {
    activeListeners.set(callSid, new Map());
  }
  
  const callListeners = activeListeners.get(callSid);
  callListeners.set(eventName, listener);
  
  logger.debug(`Added listener for ${eventName}`);
  
  // Return function to remove listener
  return () => {
    callEventEmitter.removeListener(eventName, listener);
    
    const callListeners = activeListeners.get(callSid);
    if (callListeners) {
      callListeners.delete(eventName);
      
      // Clean up if no more listeners for this call
      if (callListeners.size === 0) {
        activeListeners.delete(callSid);
      }
    }
    
    logger.debug(`Removed listener for ${eventName}`);
  };
};

/**
 * Remove all listeners for a call
 * @param {string} callSid - Call SID
 */
const removeAllCallListeners = (callSid) => {
  const callListeners = activeListeners.get(callSid);
  
  if (callListeners) {
    // Remove each listener
    for (const [eventName, listener] of callListeners.entries()) {
      callEventEmitter.removeListener(eventName, listener);
    }
    
    // Remove from active listeners
    activeListeners.delete(callSid);
    
    logger.debug(`Removed all listeners for call ${callSid}`);
  }
};

/**
 * Process a call event from SignalWire webhook
 * @param {Object} eventData - Event data from webhook
 */
const processCallEvent = (eventData) => {
  try {
    const { CallSid, CallStatus, AnsweredBy, Direction } = eventData;
    
    if (!CallSid) {
      logger.warn('Received call event without CallSid', eventData);
      return;
    }
    
    // Create event object
    const event = {
      callSid: CallSid,
      status: CallStatus,
      answeredBy: AnsweredBy,
      direction: Direction,
      timestamp: Date.now(),
      rawData: eventData
    };
    
    // Emit specific event type
    const eventType = CallStatus ? CallStatus.toLowerCase() : 'unknown';
    callEventEmitter.emit(`call:${CallSid}:${eventType}`, event);
    
    // Emit general event for this call
    callEventEmitter.emit(`call:${CallSid}:*`, event);
    
    // Broadcast to Socket.IO if available
    broadcastCallEvent(CallSid, eventType, event);
    
    logger.info(`Processed call event for call ${CallSid}: ${eventType}`);
  } catch (error) {
    logger.error(`Error processing call event: ${error.message}`);
  }
};

/**
 * Process a call transcript update
 * @param {string} callSid - Call SID
 * @param {Object} transcriptData - Transcript data
 */
const processTranscriptUpdate = (callSid, transcriptData) => {
  try {
    // Create event object
    const event = {
      callSid,
      type: 'transcript',
      transcript: transcriptData,
      timestamp: Date.now()
    };
    
    // Emit transcript event
    callEventEmitter.emit(`call:${callSid}:transcript`, event);
    
    // Emit general event for this call
    callEventEmitter.emit(`call:${callSid}:*`, event);
    
    // Broadcast to Socket.IO if available
    broadcastCallEvent(callSid, 'transcript', event);
    
    logger.debug(`Processed transcript update for call ${callSid}`);
  } catch (error) {
    logger.error(`Error processing transcript update: ${error.message}`);
  }
};

/**
 * Broadcast call event to Socket.IO clients
 * @param {string} callSid - Call SID
 * @param {string} eventType - Type of event
 * @param {Object} event - Event data
 */
const broadcastCallEvent = (callSid, eventType, event) => {
  if (!io) {
    return;
  }
  
  // Broadcast to clients subscribed to this specific call
  io.to(`call:${callSid}`).emit('call_event', {
    type: eventType,
    data: event
  });
  
  // Broadcast to clients subscribed to all calls
  io.to('calls:all').emit('call_event', {
    type: eventType,
    callSid,
    data: event
  });
};

/**
 * Create a custom call event
 * @param {string} callSid - Call SID
 * @param {string} eventType - Type of event
 * @param {Object} data - Event data
 */
const createCustomEvent = (callSid, eventType, data) => {
  try {
    // Create event object
    const event = {
      callSid,
      type: eventType,
      ...data,
      timestamp: Date.now()
    };
    
    // Emit custom event
    callEventEmitter.emit(`call:${callSid}:${eventType}`, event);
    
    // Emit general event for this call
    callEventEmitter.emit(`call:${callSid}:*`, event);
    
    // Broadcast to Socket.IO if available
    broadcastCallEvent(callSid, eventType, event);
    
    logger.debug(`Created custom event for call ${callSid}: ${eventType}`);
    
    return event;
  } catch (error) {
    logger.error(`Error creating custom event: ${error.message}`);
    throw error;
  }
};

/**
 * Get statistics on active call listeners
 * @returns {Object} Statistics
 */
const getListenerStats = () => {
  const stats = {
    totalCalls: activeListeners.size,
    totalListeners: 0,
    calls: {}
  };
  
  // Gather stats for each call
  for (const [callSid, listeners] of activeListeners.entries()) {
    stats.totalListeners += listeners.size;
    stats.calls[callSid] = {
      listenerCount: listeners.size,
      eventTypes: Array.from(listeners.keys()).map(key => {
        const parts = key.split(':');
        return parts[parts.length - 1];
      })
    };
  }
  
  return stats;
};

module.exports = {
  callEventEmitter,
  initializeSocketServer,
  addCallEventListener,
  removeAllCallListeners,
  processCallEvent,
  processTranscriptUpdate,
  createCustomEvent,
  getListenerStats
};
