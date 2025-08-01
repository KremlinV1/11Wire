/**
 * Sync Call Recording Model Script
 * This script will force-sync the CallRecording model to create the table in the test database
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../models');
const logger = require('../utils/logger');

async function syncCallRecordingModel() {
  try {
    logger.info('Connecting to database...');
    await db.sequelize.authenticate();
    logger.info('Connection established successfully');
    
    // Display current tables
    logger.info('Current tables in database:');
    const [tables] = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    logger.info(`Found ${tables.length} tables:`, tables.map(t => t.table_name).join(', '));
    
    // Sync only the CallRecording model
    logger.info('Synchronizing CallRecording model...');
    await db.CallRecording.sync({ force: true });
    logger.info('CallRecording model synchronized successfully');
    
    // Verify call_recordings table exists now
    const [verifyResult] = await db.sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_recordings')"
    );
    const tableExists = verifyResult[0]?.exists;
    logger.info(`call_recordings table exists: ${tableExists}`);
    
    // Show table columns
    if (tableExists) {
      const [columns] = await db.sequelize.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'call_recordings'"
      );
      logger.info('call_recordings table columns:');
      columns.forEach(col => {
        logger.info(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    await db.sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
    
    try {
      await db.sequelize.close();
    } catch (e) {
      // Ignore close error
    }
  }
}

// Run the sync function
syncCallRecordingModel();
