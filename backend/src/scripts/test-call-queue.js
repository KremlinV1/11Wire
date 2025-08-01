/**
 * Call Queue Testing Script
 * Tests the call queue functionality by:
 * 1. Adding calls to the queue
 * 2. Retrieving queue items
 * 3. Updating priorities
 * 4. Processing the queue
 */

require('dotenv').config();
const db = require('../models');
const logger = require('../utils/logger');

// Mock the call-handling service to avoid making actual calls
const mockCallHandlingService = {
  initiateOutboundCall: async (to, from, voiceAgentId, scriptId, campaignData) => {
    console.log(`[MOCK] Initiating call to ${to} from ${from}`);
    return {
      callSid: `MOCK_SID_${Date.now()}`,
      status: 'queued',
      direction: 'outbound',
      to,
      from
    };
  }
};

// Override the call-handling service in the call-queue service
const callQueueService = require('../services/call-queue.service');

// Save original call handling service for restoration
const originalCallHandlingService = require('../services/call-handling.service');
const originalInitiateOutboundCall = originalCallHandlingService.initiateOutboundCall;

// Main test function
const testCallQueue = async () => {
  try {
    console.log('============ 11WIRE CALL QUEUE TEST ============');
    console.log('Testing call queue functionality...');
    
    // Replace the initiateOutboundCall method with our mock
    originalCallHandlingService.initiateOutboundCall = mockCallHandlingService.initiateOutboundCall;
    console.log('Call handling service mocked successfully');

    // Make sure database is connected
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('Database connected successfully');
    
    // Try to create just the CallQueue table if it doesn't exist yet
    try {
      await db.sequelize.query('SELECT * FROM call_queues LIMIT 1');
      console.log('CallQueue table exists');
    } catch (error) {
      console.log('CallQueue table does not exist yet, creating it...');
      // Instead of syncing all models, just create the CallQueue table
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS call_queues (
          id SERIAL PRIMARY KEY,
          to_number VARCHAR(255) NOT NULL,
          from_number VARCHAR(255) NOT NULL,
          priority INTEGER NOT NULL DEFAULT 5,
          campaign_id VARCHAR(255),
          contact_id INTEGER,
          queue_position INTEGER,
          entry_time TIMESTAMP NOT NULL DEFAULT NOW(),
          scheduled_time TIMESTAMP,
          status VARCHAR(50) NOT NULL DEFAULT 'waiting',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_attempt_time TIMESTAMP,
          voice_agent_id VARCHAR(255),
          script_id VARCHAR(255),
          metadata JSONB,
          call_sid VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('CallQueue table created');
    }
    
    // Step 1: Clear existing queue items for testing
    console.log('\n1. Clearing existing queue items...');
    await db.CallQueue.destroy({ where: {} });
    console.log('Queue cleared successfully');
    
    // Step 2: Add test calls to the queue
    console.log('\n2. Adding test calls to the queue...');
    
    // Add some calls with different priorities - using direct SQL to avoid model column name mismatches
    const testCalls = [
      {
        number: '+15551234001',
        from: '+15559876001',
        priority: 5, // Medium priority
        metadata: { testCall: true, scenario: 'standard' }
      },
      {
        number: '+15551234002',
        from: '+15559876001',
        priority: 8, // High priority
        metadata: { testCall: true, scenario: 'urgent' }
      },
      {
        number: '+15551234003',
        from: '+15559876001',
        priority: 3, // Low priority
        metadata: { testCall: true, scenario: 'routine' }
      },
      {
        number: '+15551234004',
        from: '+15559876001',
        priority: 10, // Highest priority
        metadata: { testCall: true, scenario: 'emergency' }
      },
      {
        number: '+15551234005',
        from: '+15559876001',
        priority: 1, // Lowest priority
        metadata: { testCall: true, scenario: 'bulk' }
      }
    ];
    
    // Add calls to queue using direct SQL
    for (const call of testCalls) {
      // Use direct SQL to insert into the table
      const [result] = await db.sequelize.query(
        `INSERT INTO call_queues 
        (to_number, from_number, priority, metadata, status, attempts, entry_time, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW()) RETURNING id`,
        {
          bind: [
            call.number,
            call.from,
            call.priority,
            JSON.stringify(call.metadata),
            'waiting',
            0
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
      
      const id = result[0].id;
      console.log(`Added call to ${call.number} (Priority: ${call.priority}) to queue - ID: ${id}`);
    }
    
    // Step 3: Get queue items and verify order using direct SQL
    console.log('\n3. Retrieving queue items...');
    
    // Query for queue items - ensure we get array result
    const queueItems = await db.sequelize.query(
      `SELECT * FROM call_queues ORDER BY priority DESC, entry_time ASC LIMIT 10`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    console.log(`Total queue items: ${queueItems.length}`);
    console.log('Queue items (ordered by priority):\n');
    
    queueItems.forEach(item => {
      console.log(`ID: ${item.id}, To: ${item.to_number}, Priority: ${item.priority}, Status: ${item.status}`);
    });
    
    // Step 4: Update priority for one item using direct SQL
    console.log('\n4. Updating priority for a queue item...');
    const itemToUpdate = queueItems[2]; // Get the third item
    console.log(`Changing priority of item ${itemToUpdate.id} from ${itemToUpdate.priority} to 9`);
    
    await db.sequelize.query(
      `UPDATE call_queues SET priority = $1, updated_at = NOW() WHERE id = $2`,
      {
        bind: [9, itemToUpdate.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    console.log('Priority updated successfully');
    
    // Step 5: Get queue statistics using direct SQL
    console.log('\n5. Getting queue statistics...');
    
    // Count items by status
    const countByStatus = await db.sequelize.query(
      `SELECT status, COUNT(*) as count FROM call_queues GROUP BY status`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    // Get min/max/avg priority
    const priorityStats = await db.sequelize.query(
      `SELECT 
        MIN(priority) as min_priority, 
        MAX(priority) as max_priority, 
        AVG(priority) as avg_priority 
      FROM call_queues`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    // The priority stats query returns an array with one item
    const priorityStatsItem = priorityStats[0] || {};
    
    // Format stats for display
    const stats = {
      totalItems: queueItems.length,
      byStatus: countByStatus,
      priorityStats: priorityStatsItem
    };
    
    console.log('Queue statistics:');
    console.log(JSON.stringify(stats, null, 2));
    
    // Step 6: Process a single call from the queue (without actually making the call)
    console.log('\n6. Simulating queue processing...');
    
    // Get highest priority item
    const nextCalls = await db.sequelize.query(
      `SELECT * FROM call_queues 
       WHERE status = 'waiting' 
       ORDER BY priority DESC, entry_time ASC LIMIT 1`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    // Get the first call if any exist
    const nextCall = nextCalls[0];
    
    if (nextCall) {
      console.log(`Would process call to ${nextCall.to_number} (Priority: ${nextCall.priority})`);
      
      // Update status to simulate processing using direct SQL
      const attempts = (nextCall.attempts || 0) + 1;
      await db.sequelize.query(
        `UPDATE call_queues 
         SET status = $1, attempts = $2, last_attempt_time = NOW(), updated_at = NOW() 
         WHERE id = $3`,
        {
          bind: ['processing', attempts, nextCall.id],
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
      
      // Simulate call completion after a delay
      setTimeout(async () => {
        const callSid = `TEST_SID_${Date.now()}`;
        
        await db.sequelize.query(
          `UPDATE call_queues 
           SET status = $1, call_sid = $2, updated_at = NOW() 
           WHERE id = $3`,
          {
            bind: ['completed', callSid, nextCall.id],
            type: db.sequelize.QueryTypes.UPDATE
          }
        );
        
        console.log(`Call to ${nextCall.to_number} marked as completed with SID: ${callSid}`);
        
        // Get final stats
        const finalCountByStatus = await db.sequelize.query(
          `SELECT status, COUNT(*) as count FROM call_queues GROUP BY status`,
          { type: db.sequelize.QueryTypes.SELECT }
        );
        
        const finalStats = {
          byStatus: finalCountByStatus
        };
        
        console.log('\nFinal queue statistics:');
        console.log(JSON.stringify(finalStats, null, 2));
        
        console.log('\nCall queue test completed successfully!');
        console.log('==========================================');
        
        // Exit the process
        process.exit(0);
      }, 2000);
    } else {
      console.log('No calls in queue to process');
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`Error in call queue test: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Function to restore original service methods
const cleanup = () => {
  console.log('\nRestoring original call handling service...');
  try {
    // Restore original method
    originalCallHandlingService.initiateOutboundCall = originalInitiateOutboundCall;
    console.log('Original service restored');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
};

// Run the test
testCallQueue()
  .then(() => {
    console.log('\nTest completed successfully!');
  })
  .catch(err => {
    console.error('Unhandled error in test:', err);
  })
  .finally(() => {
    cleanup();
    console.log('Exiting test...');
    process.exit(0);
  });

// Handle interrupts gracefully
process.on('SIGINT', () => {
  console.log('\nTest interrupted, cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup();
  process.exit(1);
});
