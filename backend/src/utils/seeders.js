/**
 * Database seeders to populate initial data
 */

const db = require('../models');
const logger = require('./logger');

/**
 * Seed a sample campaign for testing
 */
const seedCampaigns = async () => {
  try {
    const count = await db.Campaign.count();
    
    // Only seed if no campaigns exist
    if (count === 0) {
      logger.info('Seeding initial campaign data...');
      
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 14); // 2 weeks from now
      
      await db.Campaign.create({
        id: `camp-${Date.now()}`,
        name: 'Welcome Campaign',
        description: 'Initial welcome campaign for new contacts',
        status: 'active',
        startDate: now,
        endDate: futureDate,
        contactsId: 'contacts-default',
        voiceAgentId: 'agent-default',
        scriptId: 'script-welcome',
        settings: {
          callsPerDay: 25,
          retryCount: 2,
          callHoursStart: '09:00',
          callHoursEnd: '17:00'
        },
        stats: {
          total: 50,
          completed: 10,
          failed: 2,
          inProgress: 38
        }
      });
      
      logger.info('Campaign seed completed');
      return true;
    } else {
      logger.info('Campaigns already exist, skipping seed');
      return false;
    }
  } catch (error) {
    logger.error(`Error seeding campaigns: ${error.message}`);
    return false;
  }
};

/**
 * Run all seeders
 */
const runSeeders = async () => {
  try {
    await seedCampaigns();
    logger.info('All seeders completed successfully');
    return true;
  } catch (error) {
    logger.error(`Error running seeders: ${error.message}`);
    return false;
  }
};

module.exports = {
  seedCampaigns,
  runSeeders
};
