/**
 * Cleanup script for old/stale STT request mappings
 * Removes completed mappings older than a specified retention period
 * and failed/expired mappings older than a shorter period
 */

const { SttRequestMapping } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Configuration
const RETENTION_DAYS = {
  completed: 7,   // Keep successful mappings for 7 days
  pending: 1,     // Keep pending mappings for 1 day (they may be stalled)
  failed: 3       // Keep failed mappings for 3 days (for debugging)
};

async function cleanupOldMappings() {
  try {
    logger.info('Starting cleanup of old/stale STT request mappings...');
    
    const now = new Date();
    let totalDeleted = 0;
    
    // Process each status type with its own retention period
    for (const [status, days] of Object.entries(RETENTION_DAYS)) {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // For pending status, we use submitted_at
      // For completed status, we use result_received_at
      const dateField = status === 'completed' ? 'result_received_at' : 'submitted_at';
      
      // Find and delete old records
      const result = await SttRequestMapping.destroy({
        where: {
          [dateField]: {
            [Op.lt]: cutoffDate
          },
          status: status === 'pending' ? 'pending' : [status, 'expired']
        }
      });
      
      // result is the count directly, not an object with count property
      const count = result || 0;
      totalDeleted += count;
      logger.info(`Deleted ${count} ${status} mapping(s) older than ${days} days`);
    }
    
    // Mark very old pending requests as expired
    const pendingCutoff = new Date(now);
    pendingCutoff.setHours(pendingCutoff.getHours() - 2); // 2 hours threshold
    
    const [rowsUpdated] = await SttRequestMapping.update(
      { status: 'expired' },
      {
        where: {
          submitted_at: {
            [Op.lt]: pendingCutoff
          },
          status: 'pending',
          result_received_at: null
        }
      }
    );
    
    const expiredCount = rowsUpdated || 0;
    logger.info(`Marked ${expiredCount} pending mapping(s) as expired (older than 2 hours)`);
    
    return {
      deleted: totalDeleted,
      expired: expiredCount
    };
  } catch (error) {
    logger.error(`Error cleaning up STT mappings: ${error.message}`);
    throw error;
  }
}

// Export for use in scheduled tasks
module.exports = cleanupOldMappings;

// If run directly, execute the cleanup
if (require.main === module) {
  cleanupOldMappings()
    .then(result => {
      logger.info(`Cleanup completed: ${result.deleted} mappings deleted, ${result.expired} marked as expired`);
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Cleanup failed: ${error.message}`);
      process.exit(1);
    });
}
