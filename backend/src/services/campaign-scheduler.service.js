/**
 * Campaign Scheduler Service
 * Handles batch outbound call scheduling and execution for campaigns
 */

const db = require('../models');
const logger = require('../utils/logger');
const callHandlingService = require('./call-handling.service');
const signalwireService = require('./signalwire.service');
const config = require('../config');

// Store active campaign schedules
const activeSchedules = new Map();

// Default campaign batch settings
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_BATCH_DELAY_MS = 60000; // 1 minute between batches
const DEFAULT_CALL_DELAY_MS = 5000;   // 5 seconds between calls in a batch
const MAX_CONCURRENT_CALLS = 5;       // Maximum concurrent calls

/**
 * Campaign Scheduler class to manage a single campaign's call scheduling
 */
class CampaignScheduler {
  constructor(campaignId, settings = {}) {
    this.campaignId = campaignId;
    this.batchSize = settings.batchSize || DEFAULT_BATCH_SIZE;
    this.batchDelayMs = settings.batchDelayMs || DEFAULT_BATCH_DELAY_MS;
    this.callDelayMs = settings.callDelayMs || DEFAULT_CALL_DELAY_MS;
    this.maxConcurrentCalls = settings.maxConcurrentCalls || MAX_CONCURRENT_CALLS;
    
    this.isRunning = false;
    this.isPaused = false;
    this.currentBatchIndex = 0;
    this.processedContacts = 0;
    this.successfulCalls = 0;
    this.failedCalls = 0;
    this.activeCalls = new Set();
    this.intervalId = null;
    this.lastExecutionTime = null;
    this.campaignData = null;
  }
  
  /**
   * Start the campaign scheduler
   * @returns {Object} Status information
   */
  async start() {
    if (this.isRunning) {
      return {
        status: 'already_running',
        campaignId: this.campaignId
      };
    }
    
    try {
      // Load campaign data
      this.campaignData = await db.Campaign.findByPk(this.campaignId);
      
      if (!this.campaignData) {
        throw new Error(`Campaign ${this.campaignId} not found`);
      }
      
      if (this.campaignData.status !== 'active') {
        return {
          status: 'not_active',
          message: `Campaign ${this.campaignId} is not active`
        };
      }
      
      // Update campaign status to 'in_progress'
      await this.campaignData.update({
        status: 'in_progress',
        startedAt: new Date()
      });
      
      // Start processing batches
      this.isRunning = true;
      this.isPaused = false;
      this.lastExecutionTime = Date.now();
      
      // Schedule the first batch
      this.scheduleBatch();
      
      logger.info(`Started campaign scheduler for campaign ${this.campaignId}`);
      
      return {
        status: 'started',
        campaignId: this.campaignId,
        settings: {
          batchSize: this.batchSize,
          batchDelayMs: this.batchDelayMs,
          callDelayMs: this.callDelayMs
        }
      };
    } catch (error) {
      logger.error(`Error starting campaign scheduler: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Pause the campaign scheduler
   * @returns {Object} Status information
   */
  pause() {
    if (!this.isRunning) {
      return {
        status: 'not_running',
        campaignId: this.campaignId
      };
    }
    
    if (this.isPaused) {
      return {
        status: 'already_paused',
        campaignId: this.campaignId
      };
    }
    
    this.isPaused = true;
    
    // Clear any scheduled batch
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    logger.info(`Paused campaign scheduler for campaign ${this.campaignId}`);
    
    return {
      status: 'paused',
      campaignId: this.campaignId,
      processedContacts: this.processedContacts,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      activeCalls: this.activeCalls.size
    };
  }
  
  /**
   * Resume the campaign scheduler
   * @returns {Object} Status information
   */
  resume() {
    if (!this.isRunning) {
      return {
        status: 'not_running',
        campaignId: this.campaignId
      };
    }
    
    if (!this.isPaused) {
      return {
        status: 'not_paused',
        campaignId: this.campaignId
      };
    }
    
    this.isPaused = false;
    this.lastExecutionTime = Date.now();
    
    // Schedule the next batch
    this.scheduleBatch();
    
    logger.info(`Resumed campaign scheduler for campaign ${this.campaignId}`);
    
    return {
      status: 'resumed',
      campaignId: this.campaignId
    };
  }
  
  /**
   * Stop the campaign scheduler
   * @param {boolean} markComplete - Whether to mark the campaign as complete
   * @returns {Object} Status information
   */
  async stop(markComplete = false) {
    if (!this.isRunning) {
      return {
        status: 'not_running',
        campaignId: this.campaignId
      };
    }
    
    // Clear any scheduled batch
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    // End any active calls
    const activeCallSids = Array.from(this.activeCalls);
    for (const callSid of activeCallSids) {
      try {
        await signalwireService.endCall(callSid);
        this.activeCalls.delete(callSid);
      } catch (error) {
        logger.error(`Error ending call ${callSid}: ${error.message}`);
      }
    }
    
    // Update campaign status
    if (this.campaignData) {
      const newStatus = markComplete ? 'completed' : 'stopped';
      await this.campaignData.update({
        status: newStatus,
        completedAt: markComplete ? new Date() : null,
        stats: {
          processed: this.processedContacts,
          successful: this.successfulCalls,
          failed: this.failedCalls
        }
      });
    }
    
    logger.info(`Stopped campaign scheduler for campaign ${this.campaignId}`);
    
    return {
      status: 'stopped',
      campaignId: this.campaignId,
      processedContacts: this.processedContacts,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls
    };
  }
  
  /**
   * Schedule the next batch of calls
   */
  scheduleBatch() {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    // Calculate delay until next batch
    const now = Date.now();
    const elapsedSinceLastExecution = now - this.lastExecutionTime;
    const delay = Math.max(0, this.batchDelayMs - elapsedSinceLastExecution);
    
    this.intervalId = setTimeout(() => {
      this.processBatch()
        .then(() => {
          this.lastExecutionTime = Date.now();
          this.scheduleBatch();
        })
        .catch(error => {
          logger.error(`Error processing batch: ${error.message}`);
          
          // Still schedule the next batch to continue the campaign
          this.lastExecutionTime = Date.now();
          this.scheduleBatch();
        });
    }, delay);
  }
  
  /**
   * Process a batch of contacts
   */
  async processBatch() {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    try {
      // Get batch of contacts to call
      const contacts = await this.getContactBatch();
      
      if (contacts.length === 0) {
        logger.info(`No more contacts to call for campaign ${this.campaignId}`);
        
        // Check if this was the last batch
        if (this.processedContacts > 0) {
          // Stop the campaign and mark as complete
          await this.stop(true);
        }
        
        return;
      }
      
      logger.info(`Processing batch of ${contacts.length} contacts for campaign ${this.campaignId}`);
      
      // Process each contact with delay
      for (const contact of contacts) {
        // Check if we should stop
        if (!this.isRunning || this.isPaused) {
          break;
        }
        
        // Wait if we've reached max concurrent calls
        while (this.activeCalls.size >= this.maxConcurrentCalls) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check again if we should stop
          if (!this.isRunning || this.isPaused) {
            return;
          }
        }
        
        // Make the call
        this.makeCall(contact)
          .then(() => {
            this.successfulCalls++;
          })
          .catch(error => {
            this.failedCalls++;
            logger.error(`Error making call to ${contact.phone}: ${error.message}`);
          })
          .finally(() => {
            this.processedContacts++;
          });
        
        // Add delay between calls
        await new Promise(resolve => setTimeout(resolve, this.callDelayMs));
      }
      
      // Increment batch index
      this.currentBatchIndex++;
      
      // Update campaign stats
      if (this.campaignData) {
        await this.campaignData.update({
          stats: {
            processed: this.processedContacts,
            successful: this.successfulCalls,
            failed: this.failedCalls,
            batches: this.currentBatchIndex
          }
        });
      }
    } catch (error) {
      logger.error(`Error processing batch for campaign ${this.campaignId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a batch of contacts to call
   * @returns {Array} Batch of contacts
   */
  async getContactBatch() {
    try {
      // In a real implementation, we would:
      // 1. Query the database for contacts associated with the campaign
      // 2. Filter by batch index and size
      // 3. Apply any campaign-specific filtering rules
      
      // For now, simulate retrieving contacts with mock data
      // if there are no more contacts, return an empty array
      
      // Simulate end of contacts after 5 batches
      if (this.currentBatchIndex >= 5) {
        return [];
      }
      
      // Mock contact data
      const mockContacts = Array.from({ length: this.batchSize }, (_, i) => ({
        id: `contact-${this.currentBatchIndex}-${i}`,
        name: `Contact ${this.currentBatchIndex * this.batchSize + i}`,
        phone: `+1555${String(this.currentBatchIndex).padStart(3, '0')}${String(i).padStart(4, '0')}`,
        email: `contact${this.currentBatchIndex * this.batchSize + i}@example.com`
      }));
      
      return mockContacts;
    } catch (error) {
      logger.error(`Error getting contact batch: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Make a call to a contact
   * @param {Object} contact - Contact to call
   * @returns {Object} Call result
   */
  async makeCall(contact) {
    try {
      // Get needed campaign settings for the call
      const voiceAgentId = this.campaignData.agentId || 'default-voice-agent';
      const fromNumber = this.campaignData.callerIdNumber || config.defaultCallerId;
      const scriptId = this.campaignData.scriptId;
      
      // Initiate the call
      const callResult = await callHandlingService.initiateOutboundCall(
        contact.phone,
        fromNumber,
        voiceAgentId,
        scriptId,
        { id: this.campaignId }
      );
      
      // Track the active call
      this.activeCalls.add(callResult.callSid);
      
      // Set up callback to remove from active calls when completed
      // This would be handled by the call status webhook in a real implementation
      setTimeout(() => {
        this.activeCalls.delete(callResult.callSid);
      }, 120000); // Assume call lasts at most 2 minutes for this mock implementation
      
      logger.info(`Call initiated to ${contact.phone} with SID: ${callResult.callSid}`);
      
      return callResult;
    } catch (error) {
      logger.error(`Error making call to ${contact.phone}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get status information for the scheduler
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      campaignId: this.campaignId,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      batchIndex: this.currentBatchIndex,
      processedContacts: this.processedContacts,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      activeCalls: Array.from(this.activeCalls),
      activeCallCount: this.activeCalls.size,
      settings: {
        batchSize: this.batchSize,
        batchDelayMs: this.batchDelayMs,
        callDelayMs: this.callDelayMs,
        maxConcurrentCalls: this.maxConcurrentCalls
      }
    };
  }
}

/**
 * Start a campaign scheduler
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - Scheduler settings
 * @returns {Object} Status information
 */
const startCampaign = async (campaignId, settings = {}) => {
  try {
    // Check if scheduler already exists
    if (activeSchedules.has(campaignId)) {
      const existingScheduler = activeSchedules.get(campaignId);
      
      if (existingScheduler.isRunning) {
        if (existingScheduler.isPaused) {
          return existingScheduler.resume();
        }
        
        return {
          status: 'already_running',
          campaignId
        };
      }
    }
    
    // Create new scheduler
    const scheduler = new CampaignScheduler(campaignId, settings);
    activeSchedules.set(campaignId, scheduler);
    
    // Start the scheduler
    const result = await scheduler.start();
    return result;
  } catch (error) {
    logger.error(`Error starting campaign ${campaignId}: ${error.message}`);
    throw error;
  }
};

/**
 * Pause a campaign scheduler
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Status information
 */
const pauseCampaign = (campaignId) => {
  const scheduler = activeSchedules.get(campaignId);
  
  if (!scheduler) {
    return {
      status: 'not_found',
      campaignId
    };
  }
  
  return scheduler.pause();
};

/**
 * Resume a campaign scheduler
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Status information
 */
const resumeCampaign = (campaignId) => {
  const scheduler = activeSchedules.get(campaignId);
  
  if (!scheduler) {
    return {
      status: 'not_found',
      campaignId
    };
  }
  
  return scheduler.resume();
};

/**
 * Stop a campaign scheduler
 * @param {string} campaignId - Campaign ID
 * @param {boolean} markComplete - Whether to mark the campaign as complete
 * @returns {Object} Status information
 */
const stopCampaign = async (campaignId, markComplete = false) => {
  const scheduler = activeSchedules.get(campaignId);
  
  if (!scheduler) {
    return {
      status: 'not_found',
      campaignId
    };
  }
  
  const result = await scheduler.stop(markComplete);
  
  // Keep the scheduler in the map for status queries but mark it as stopped
  // Will be removed when server restarts or after some time
  
  return result;
};

/**
 * Get campaign scheduler status
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Status information
 */
const getCampaignStatus = (campaignId) => {
  const scheduler = activeSchedules.get(campaignId);
  
  if (!scheduler) {
    return {
      status: 'not_found',
      campaignId
    };
  }
  
  return {
    status: scheduler.isRunning ? (scheduler.isPaused ? 'paused' : 'running') : 'stopped',
    ...scheduler.getStatus()
  };
};

/**
 * Get all active campaign schedulers
 * @returns {Array} Array of campaign status information
 */
const getAllActiveCampaigns = () => {
  const campaigns = [];
  
  for (const [campaignId, scheduler] of activeSchedules.entries()) {
    campaigns.push({
      campaignId,
      status: scheduler.isRunning ? (scheduler.isPaused ? 'paused' : 'running') : 'stopped',
      processedContacts: scheduler.processedContacts,
      activeCallCount: scheduler.activeCalls.size
    });
  }
  
  return campaigns;
};

/**
 * Update campaign scheduler settings
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - New settings
 * @returns {Object} Updated settings
 */
const updateCampaignSettings = (campaignId, settings) => {
  const scheduler = activeSchedules.get(campaignId);
  
  if (!scheduler) {
    return {
      status: 'not_found',
      campaignId
    };
  }
  
  // Update settings
  if (settings.batchSize !== undefined) {
    scheduler.batchSize = settings.batchSize;
  }
  
  if (settings.batchDelayMs !== undefined) {
    scheduler.batchDelayMs = settings.batchDelayMs;
  }
  
  if (settings.callDelayMs !== undefined) {
    scheduler.callDelayMs = settings.callDelayMs;
  }
  
  if (settings.maxConcurrentCalls !== undefined) {
    scheduler.maxConcurrentCalls = settings.maxConcurrentCalls;
  }
  
  return {
    status: 'updated',
    campaignId,
    settings: {
      batchSize: scheduler.batchSize,
      batchDelayMs: scheduler.batchDelayMs,
      callDelayMs: scheduler.callDelayMs,
      maxConcurrentCalls: scheduler.maxConcurrentCalls
    }
  };
};

module.exports = {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  getCampaignStatus,
  getAllActiveCampaigns,
  updateCampaignSettings
};
