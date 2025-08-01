/**
 * Create Test Data Script
 * Creates minimal test data needed for integration tests
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');

async function createTestData() {
  try {
    logger.info('Creating test data for integration tests...');
    
    // Clear existing test data to avoid unique constraint errors
    logger.info('Clearing existing test data...');
    
    // Delete in reverse order of dependencies
    try {
      // First check if CallRecording model exists and clear it if it does
      if (db.CallRecording) {
        await db.CallRecording.destroy({ where: {}, truncate: { cascade: true } });
        logger.info('Cleared call_recordings table');
      }
    } catch (error) {
      logger.warn(`Error clearing call_recordings: ${error.message}`);
    }
    
    // Now safe to clear call logs
    await db.CallLog.destroy({ where: {}, truncate: { cascade: true } });
    logger.info('Cleared call_logs table');
    
    await db.Contact.destroy({ where: {}, truncate: { cascade: true } });
    logger.info('Cleared contacts table');
    
    await db.AgentConfig.destroy({ where: {}, truncate: { cascade: true } });
    logger.info('Cleared agent_configs table');
    
    await db.Campaign.destroy({ where: { id: { [db.Sequelize.Op.in]: ['test-campaign-id', 'test-campaign'] } } });
    logger.info('Cleared test campaigns');
    
    // Simplified test data creation without schema changes
    // Create test campaign
    logger.info('Creating test campaign...');
    const campaign = await db.Campaign.create({
      id: 'test-campaign-id',
      name: 'Test Campaign',
      description: 'For testing',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      contactsId: 'test-contacts-list',
      voiceAgentId: 'test-agent-id',
      scriptId: 'test-script-id',
      settings: {
        callsPerDay: 50,
        retryCount: 2,
        callHoursStart: '09:00',
        callHoursEnd: '17:00'
      },
      stats: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    });
    logger.info(`Created test campaign with ID: ${campaign.id}`);
    
    // Create test campaign with the ID expected by telephony integration tests
    logger.info('Creating telephony test campaign...');
    const telephonyCampaign = await db.Campaign.create({
      id: 'test-campaign',
      name: 'Telephony Test Campaign',
      description: 'For telephony integration testing',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      contactsId: 'telephony-contacts-list',
      voiceAgentId: 'test-agent-id',
      scriptId: 'test-script-id',
      settings: {
        callsPerDay: 50,
        retryCount: 2,
        callHoursStart: '09:00',
        callHoursEnd: '17:00'
      },
      stats: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    });
    logger.info(`Created telephony test campaign with ID: ${telephonyCampaign.id}`);
    
    // Create test agent
    logger.info('Creating test agent...');
    const agent = await db.AgentConfig.create({
      agentId: 'test-agent-id',
      name: 'Existing Test Agent',
      description: 'For testing',
      isActive: true,
      settings: {}
    });
    logger.info(`Created test agent with ID: ${agent.agentId}`);
    
    // Create test contact
    logger.info('Creating test contact...');
    const contact = await db.Contact.create({
      firstName: 'Test',
      lastName: 'Contact',
      phone: '+15551234567',
      email: 'test@example.com',
      campaignId: campaign.id,
      status: 'pending'
    });
    logger.info(`Created test contact with ID: ${contact.id}`);
    
    // Create test call log
    logger.info('Creating test call log...');
    const callLog = await db.CallLog.create({
      callSid: 'TEST-CALL-SID-12345',
      from: '+15551234567',
      to: '+15559876543',
      direction: 'outbound',
      status: 'completed',
      duration: 60,
      startTime: new Date(),
      endTime: new Date(Date.now() + 60000)
    });
    logger.info(`Created test call log with ID: ${callLog.id}`);
    
    logger.info('Test data creation completed');
  } catch (error) {
    logger.error(`Error creating test data: ${error.message}`);
    logger.error(error.stack);
    throw error;
  } finally {
    // Close database connection
    await db.sequelize.close();
    logger.info('Database connection closed');
  }
}

// Run the script
createTestData();
