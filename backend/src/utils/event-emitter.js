/**
 * Event Emitter Utility
 * Provides a centralized event bus for inter-service communication
 */

const EventEmitter = require('events');

// Create singleton event emitter instance
const eventEmitter = new EventEmitter();

// Configure for more listeners if needed
eventEmitter.setMaxListeners(30);

module.exports = eventEmitter;
