/**
 * Debug script for contact and call statistics endpoints
 * This script directly tests the controller methods that are failing in tests
 */

const db = require('../models');
const logger = require('../utils/logger');
const contactController = require('../controllers/contact.controller');
const callController = require('../controllers/call.controller');

// Mock Express response object
const createMockResponse = () => {
  const res = {};
  res.status = (code) => {
    console.log(`Status code set to: ${code}`);
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    res.data = data;
    return res;
  };
  return res;
};

// Debug contact stats endpoint
const debugContactStats = async () => {
  console.log('\n=== DEBUGGING CONTACT STATS ENDPOINT ===\n');
  
  try {
    // Check if contact table exists
    try {
      await db.sequelize.query('SELECT * FROM contacts LIMIT 1');
      console.log('✅ contacts table exists');
    } catch (e) {
      console.error('❌ contacts table does not exist:', e.message);
    }
    
    // Log contact model structure
    console.log('\nContact model attributes:', Object.keys(db.Contact.rawAttributes));
    
    // Check for contacts in DB
    const contactCount = await db.Contact.count();
    console.log(`\nContact count in database: ${contactCount}`);
    
    if (contactCount > 0) {
      const sampleContact = await db.Contact.findOne();
      console.log('Sample contact:', JSON.stringify(sampleContact.toJSON(), null, 2));
    }
    
    // Test contact stats with raw SQL
    console.log('\nTesting contact status counts with raw SQL:');
    try {
      const statusCounts = await db.sequelize.query(
        'SELECT status, COUNT(*) as count FROM contacts GROUP BY status',
        { type: db.sequelize.QueryTypes.SELECT }
      );
      console.log('SQL status counts result:', statusCounts);
    } catch (sqlError) {
      console.error('❌ SQL query failed:', sqlError.message);
    }
    
    // Create mock request and response
    const mockReq = { query: {} };
    const mockRes = createMockResponse();
    
    // Call the actual controller method
    console.log('\nCalling contact stats controller method:');
    await contactController.getContactStats(mockReq, mockRes);
    
    console.log('\nContact stats debug complete\n');
  } catch (error) {
    console.error('❌ Error in debugContactStats:', error);
  }
};

// Debug call stats endpoint
const debugCallStats = async () => {
  console.log('\n=== DEBUGGING CALL STATS ENDPOINT ===\n');
  
  try {
    // Check if call_logs table exists
    try {
      await db.sequelize.query('SELECT * FROM call_logs LIMIT 1');
      console.log('✅ call_logs table exists');
    } catch (e) {
      console.error('❌ call_logs table does not exist:', e.message);
    }
    
    // Log CallLog model structure
    console.log('\nCallLog model attributes:', Object.keys(db.CallLog.rawAttributes));
    
    // Check for call logs in DB
    const callCount = await db.CallLog.count();
    console.log(`\nCall log count in database: ${callCount}`);
    
    if (callCount > 0) {
      const sampleCall = await db.CallLog.findOne();
      console.log('Sample call log:', JSON.stringify(sampleCall.toJSON(), null, 2));
    }
    
    // Test call stats with raw SQL
    console.log('\nTesting call status counts with raw SQL:');
    try {
      const statusCounts = await db.sequelize.query(
        'SELECT status, COUNT(*) as count FROM call_logs GROUP BY status',
        { type: db.sequelize.QueryTypes.SELECT }
      );
      console.log('SQL status counts result:', statusCounts);
    } catch (sqlError) {
      console.error('❌ SQL query failed:', sqlError.message);
    }
    
    // Test hourly distribution query
    console.log('\nTesting hourly distribution query with raw SQL:');
    try {
      const hourlyDistribution = await db.sequelize.query(
        'SELECT EXTRACT(HOUR FROM "startTime") as hour, COUNT(*) as count FROM call_logs WHERE "startTime" IS NOT NULL GROUP BY hour ORDER BY hour ASC',
        { type: db.sequelize.QueryTypes.SELECT }
      );
      console.log('SQL hourly distribution result:', hourlyDistribution);
    } catch (sqlError) {
      console.error('❌ SQL hourly distribution query failed:', sqlError.message);
    }
    
    // Create mock request and response
    const mockReq = { query: {} };
    const mockRes = createMockResponse();
    
    // Call the actual controller method
    console.log('\nCalling call stats controller method:');
    await callController.getCallStatistics(mockReq, mockRes);
    
    console.log('\nCall stats debug complete\n');
  } catch (error) {
    console.error('❌ Error in debugCallStats:', error);
  }
};

// Main function
const main = async () => {
  try {
    // Connect to database
    console.log('Connecting to test database...');
    
    // Run the debug functions
    await debugContactStats();
    await debugCallStats();
    
    // Close database connection
    await db.sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Main error:', error);
  }
};

// Run the script
main();
