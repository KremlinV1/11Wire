/**
 * Scheduled Jobs Service
 * Manages scheduled maintenance and cleanup tasks
 */

const logger = require('../utils/logger');
const cleanupSttMappings = require('../scripts/cleanup-stt-mappings');

// Store job intervals for cleanup on shutdown
const activeJobs = new Map();

/**
 * Initialize scheduled jobs
 */
const initScheduledJobs = () => {
  logger.info('Initializing scheduled jobs...');
  
  // Schedule STT mapping cleanup - run every 6 hours
  scheduleJob('stt-mapping-cleanup', async () => {
    try {
      const result = await cleanupSttMappings();
      logger.info(`STT mapping cleanup completed: ${result.deleted} deleted, ${result.expired} expired`);
    } catch (error) {
      logger.error(`STT mapping cleanup failed: ${error.message}`);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours interval
  
  logger.info('Scheduled jobs initialized');
};

/**
 * Schedule a job to run periodically
 * @param {string} name - Job name
 * @param {Function} jobFunction - Function to execute
 * @param {number} interval - Interval in milliseconds
 */
const scheduleJob = (name, jobFunction, interval) => {
  logger.info(`Scheduling job: ${name} (every ${interval/1000/60} minutes)`);
  
  // Run job immediately on startup
  setTimeout(() => {
    logger.info(`Running initial ${name} job`);
    jobFunction();
  }, 10000); // Wait 10 seconds after startup
  
  // Schedule recurring job
  const jobInterval = setInterval(jobFunction, interval);
  activeJobs.set(name, jobInterval);
  
  return jobInterval;
};

/**
 * Stop all scheduled jobs
 */
const stopScheduledJobs = () => {
  logger.info('Stopping all scheduled jobs...');
  
  let count = 0;
  activeJobs.forEach((interval, name) => {
    clearInterval(interval);
    logger.info(`Stopped job: ${name}`);
    count++;
  });
  
  activeJobs.clear();
  logger.info(`Stopped ${count} scheduled jobs`);
};

module.exports = {
  initScheduledJobs,
  scheduleJob,
  stopScheduledJobs
};
