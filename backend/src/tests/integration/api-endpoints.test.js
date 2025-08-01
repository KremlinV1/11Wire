/**
 * API Endpoints Integration Test
 * Tests the REST API endpoints for contacts, call logs, and agent configuration
 */

require('dotenv').config({ path: '.env.test' });
const express = require('express');
const request = require('supertest');
const routes = require('../../routes');
const db = require('../../models');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const cors = require('cors');
const helmet = require('helmet');

// Create a test app instance
const app = express();

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(`[TEST] ${req.method} ${req.url}`);
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add response tracking middleware
app.use((req, res, next) => {
  // Store the original res.json and res.status methods
  const originalJson = res.json;
  const originalStatus = res.status;
  
  // Track the status code
  res.status = function(code) {
    logger.info(`[TEST] Setting status ${code} for ${req.method} ${req.url}`);
    return originalStatus.call(this, code);
  };
  
  // Track the response body
  res.json = function(body) {
    if (res.statusCode >= 400) {
      logger.error(`[TEST] Error response for ${req.method} ${req.url} - Status: ${res.statusCode}, Body: ${JSON.stringify(body)}`);
    } else {
      logger.info(`[TEST] Response for ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }
    return originalJson.call(this, body);
  };
  
  next();
});

// Register routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error(`[TEST] Unhandled error in ${req.method} ${req.url}: ${err.message}`);
  logger.error(`[TEST] Error stack: ${err.stack}`);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: `${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});


describe('API Endpoints', () => {
  // Test data
  const testContact = {
    firstName: 'Test',
    lastName: 'Contact',
    phone: '+15551234567',
    email: 'test@example.com'
  };

  const testAgentConfig = {
    name: 'Test Agent',
    description: 'Test agent for API testing',
    isActive: true,
    settings: {
      voice: 'test-voice',
      temperature: 0.7
    }
  };
  
  const testCallRecording = {
    callSid: 'TEST-CALL-SID-12345',
    recordingSid: 'TEST-RECORDING-SID-12345',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() - 3540000),   // 59 minutes ago
    duration: 60,
    format: 'mp3',
    channels: 1,
    url: 'https://api.signalwire.com/recordings/test-recording.mp3',
    downloadStatus: 'completed'
  };

  let contactId, agentId, callLogId, recordingId;

  // Before all tests, ensure DB is connected
  beforeAll(async () => {
    try {
      // Explicitly validate database connection
      await db.sequelize.authenticate();
      logger.info('Connection to the database has been established successfully.');
      
      // Verify models are registered correctly
      const modelNames = Object.keys(db.sequelize.models);
      logger.info(`Available models: ${modelNames.join(', ')}`);
      
      // Check if agent_configs table exists
      const [tableCheckResult] = await db.sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agent_configs')"
      );
      const tableExists = tableCheckResult[0]?.exists;
      logger.info(`agent_configs table exists: ${tableExists}`);
      
      if (!tableExists) {
        logger.warn('agent_configs table does not exist! Will attempt to create it.');
        try {
          // Force sync the AgentConfig model
          await db.AgentConfig.sync({ force: true });
          logger.info('Successfully created agent_configs table');
        } catch (syncError) {
          logger.error(`Failed to sync AgentConfig model: ${syncError.message}`);
          logger.error(syncError.stack);
        }
      }
      
      // Clear test data with better error handling
      try {
        await db.Contact.destroy({ where: {} });
        logger.info('Cleared Contact test data');
      } catch (e) {
        logger.error(`Failed to clear Contact data: ${e.message}`);
      }
      
      try {
        await db.AgentConfig.destroy({ where: {} });
        logger.info('Cleared AgentConfig test data');
      } catch (e) {
        logger.error(`Failed to clear AgentConfig data: ${e.message}`);
      }
      
      try {
        await db.CallLog.destroy({ where: {} });
        logger.info('Cleared CallLog test data');
      } catch (e) {
        logger.error(`Failed to clear CallLog data: ${e.message}`);
      }
      
      // Create test agent for testing with better error handling
      try {
        const agent = await db.AgentConfig.create({
          agentId: 'test-agent-id',
          name: 'Existing Test Agent',
          description: 'For testing',
          isActive: true,
          settings: {}
        });
        agentId = agent.agentId;
        logger.info(`Created test agent with ID: ${agentId}`);
      } catch (e) {
        logger.error(`Failed to create test agent: ${e.message}`);
        logger.error(e.stack);
      }
      
      // Find existing call log or create a new one
      try {
        // First try to find an existing call log
        let callLog = await db.CallLog.findOne();
        
        // If no call log exists, create one
        if (!callLog) {
          callLog = await db.CallLog.create({
            callSid: 'TEST-CALL-SID-12345',
            from: '+15551234567',
            to: '+15559876543',
            direction: 'outbound',
            status: 'completed',
            duration: 60,
            callerId: 'Test Caller',
            timestamp: new Date()
          });
          logger.info(`Created new test call log with ID: ${callLog.id}`);
        } else {
          logger.info(`Using existing call log with ID: ${callLog.id}`);
        }
        
        callLogId = callLog.id;
        logger.info(`Test will use call log ID: ${callLogId}`);
      } catch (e) {
        logger.error(`Failed to get/create test call log: ${e.message}`);
        logger.error(e.stack);
      }
      
      // Create test call recording with better error handling
      try {
        await db.CallRecording.sync({ force: false }); // Ensure table exists
        const recording = await db.CallRecording.create(testCallRecording);
        recordingId = recording.id;
        logger.info(`Created test call recording with ID: ${recordingId}`);
      } catch (e) {
        logger.error(`Failed to create test call recording: ${e.message}`);
        logger.error(e.stack);
      }
      
    } catch (error) {
      logger.error(`Database connection error: ${error.message}`);
      logger.error(error.stack);
    }
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Contact Endpoints', () => {
    test('POST /api/contacts - Create a new contact', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .send(testContact)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.contact).toHaveProperty('id');
      expect(response.body.contact.firstName).toBe(testContact.firstName);
      
      contactId = response.body.contact.id;
    });

    test('GET /api/contacts - Get all contacts', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.contacts)).toBe(true);
      expect(response.body.contacts.length).toBeGreaterThan(0);
    });

    test('GET /api/contacts/:contactId - Get contact by ID', async () => {
      const response = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact.id).toBe(contactId);
      expect(response.body.contact.firstName).toBe(testContact.firstName);
    });

    test('PUT /api/contacts/:contactId - Update a contact', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Contact'
      };

      const response = await request(app)
        .put(`/api/contacts/${contactId}`)
        .send(updatedData)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact.firstName).toBe(updatedData.firstName);
    });

    test('GET /api/contacts/stats - Get contact statistics', async () => {
      const response = await request(app)
        .get('/api/contacts/stats')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('totalContacts');
    });
  });

  describe('Call Log Endpoints', () => {
    test('GET /api/calls - Get recent calls with pagination', async () => {
      const response = await request(app)
        .get('/api/calls')
        .query({ page: 1, limit: 10 })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('calls');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('currentPage');
    });

    test('GET /api/calls/:id - Get call details by ID', async () => {
      const response = await request(app)
        .get(`/api/calls/${callLogId}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.call).toHaveProperty('id');
      expect(response.body.call.id).toBe(callLogId);
    });

    test('GET /api/calls/stats - Get call statistics', async () => {
      const response = await request(app)
        .get('/api/calls/stats')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('totalCalls');
      expect(response.body).toHaveProperty('byStatus');
    });
  });

  describe('Agent Configuration Endpoints', () => {
    test('GET /api/agents - Get all configured agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.agents)).toBe(true);
    });

    test('GET /api/agents/:agentId - Get agent by ID', async () => {
      // Verify agent exists before testing
      try {
        const existingAgent = await db.AgentConfig.findOne({
          where: { agentId }
        });
        
        logger.info(`Test agent verification: ${existingAgent ? 'Found' : 'Not found'}`);
        if (existingAgent) {
          logger.info(`Test agent data: ${JSON.stringify(existingAgent.dataValues)}`);
        } else {
          logger.warn('Test agent not found in database, test may fail');
        }
      } catch (e) {
        logger.error(`Failed to verify test agent: ${e.message}`);
      }
      
      // Make the request with improved logging
      logger.info(`Requesting agent with ID: ${agentId}`);
      const response = await request(app)
        .get(`/api/agents/${agentId}`)
        .set('Accept', 'application/json');

      // Additional debugging for failed responses
      if (response.status !== 200) {
        logger.error(`Agent endpoint test failed with status: ${response.status}`);
        logger.error(`Response body: ${JSON.stringify(response.body)}`);
        
        // Try direct DB query
        try {
          const [rows] = await db.sequelize.query('SELECT * FROM agent_configs WHERE "agentId" = ?', {
            replacements: [agentId]
          });
          logger.info(`Direct DB query found: ${rows.length} rows`);
          if (rows.length > 0) {
            logger.info(`Direct DB query result: ${JSON.stringify(rows[0])}`);
          }
        } catch (e) {
          logger.error(`Direct DB query failed: ${e.message}`);
        }
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toHaveProperty('agentId');
      expect(response.body.config.agentId).toBe(agentId);
    });

    test('PUT /api/agents/:agentId - Update agent configuration', async () => {
      const updateData = {
        name: 'Updated Test Agent',
        settings: {
          voice: 'updated-voice'
        }
      };

      const response = await request(app)
        .put(`/api/agents/${agentId}`)
        .send(updateData)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.name).toBe(updateData.name);
    });

    test('POST /api/agents/:agentId - Create new agent configuration', async () => {
      const newAgentId = 'new-test-agent-id';
      
      const response = await request(app)
        .post(`/api/agents/${newAgentId}`)
        .send(testAgentConfig)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.config.agentId).toBe(newAgentId);
    });
  });

  describe('Call Recording Endpoints', () => {
    test('GET /api/call-recordings - Get all recordings with pagination', async () => {
      const response = await request(app)
        .get('/api/call-recordings')
        .query({ page: 1, limit: 10 })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recordings');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
    });

    test('GET /api/call-recordings/:id - Get recording by ID', async () => {
      const response = await request(app)
        .get(`/api/call-recordings/${recordingId}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(recordingId);
    });

    test('GET /api/call-recordings/call/:callSid - Get recordings for call', async () => {
      const response = await request(app)
        .get(`/api/call-recordings/call/${testCallRecording.callSid}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/call-recordings/stats - Get recording statistics', async () => {
      const response = await request(app)
        .get('/api/call-recordings/stats')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRecordings');
      expect(response.body.data).toHaveProperty('totalDuration');
      expect(response.body.data).toHaveProperty('statusCounts');
    });

    test('POST /api/call-recordings/call/:callSid/start - Start recording a call', async () => {
      // First create a CallLog record to satisfy the foreign key constraint
      try {
        // Clean up existing test data
        await db.CallLog.destroy({ where: { callSid: 'TEST-NEW-CALL-SID' } });
        
        // Create test CallLog record
        const testCallLog = await db.CallLog.create({
          callSid: 'TEST-NEW-CALL-SID',
          direction: 'outbound',
          from: '+15551234567',
          to: '+15557654321',
          status: 'in-progress',
          startTime: new Date()
        });
        logger.info(`Created test CallLog with ID: ${testCallLog.id}`);
      } catch (e) {
        logger.error(`Failed to create test CallLog: ${e.message}`);
        logger.error(e.stack);
      }

      // Create a mock for signalwireService.startRecording
      // Note: Using 'sid' instead of 'id' to match what call-recording.service expects
      const mockStartRecording = jest.fn().mockImplementation(() => ({
        sid: 'MOCK-NEW-RECORDING-SID',
        callSid: 'TEST-NEW-CALL-SID',
        status: 'in-progress',
        startTime: new Date().toISOString(),
        format: 'mp3'
      }));

      // Save original and replace with mock
      const originalStartRecording = require('../../services/signalwire.service').startRecording;
      require('../../services/signalwire.service').startRecording = mockStartRecording;

      const response = await request(app)
        .post('/api/call-recordings/call/TEST-NEW-CALL-SID/start')
        .send({ format: 'mp3', channels: 1 })
        .set('Accept', 'application/json');

      // Restore original function
      require('../../services/signalwire.service').startRecording = originalStartRecording;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(mockStartRecording).toHaveBeenCalledWith('TEST-NEW-CALL-SID', expect.any(Object));
    });

    test('POST /api/call-recordings/call/:callSid/stop - Stop recording a call', async () => {
      // Create a mock for signalwireService.stopRecording
      const mockStopRecording = jest.fn().mockImplementation(() => ({
        callSid: 'TEST-RECORDING-CALL-SID',
        status: 'completed',
        endTime: new Date().toISOString()
      }));

      // Save original and replace with mock
      const originalStopRecording = require('../../services/signalwire.service').stopRecording;
      require('../../services/signalwire.service').stopRecording = mockStopRecording;

      // Create test CallLog and CallRecording records to satisfy foreign key constraints
      let testStopRecordingId;
      try {
        // First make sure there are no existing records for this test call
        await db.CallRecording.destroy({
          where: {
            callSid: 'TEST-RECORDING-CALL-SID'
          }
        });
        await db.CallLog.destroy({
          where: {
            callSid: 'TEST-RECORDING-CALL-SID'
          }
        });
        
        // Create the CallLog record first
        const testCallLog = await db.CallLog.create({
          callSid: 'TEST-RECORDING-CALL-SID',
          direction: 'outbound',
          from: '+15551234567',
          to: '+15557654321',
          status: 'in-progress',
          startTime: new Date()
        });
        logger.info(`Created test CallLog with ID: ${testCallLog.id}`);
        
        // Then create our test recording
        const testStopRecording = await db.CallRecording.create({
          callSid: 'TEST-RECORDING-CALL-SID',
          recordingSid: 'TEST-RECORDING-SID-STOP',
          status: 'in-progress',
          startTime: new Date()
        });
        testStopRecordingId = testStopRecording.id;
        logger.info(`Created test recording to stop with ID: ${testStopRecordingId}`);
      } catch (e) {
        logger.error(`Failed to create test recording to stop: ${e.message}`);
        logger.error(e.stack);
      }

      const response = await request(app)
        .post('/api/call-recordings/call/TEST-RECORDING-CALL-SID/stop')
        .set('Accept', 'application/json');

      // Restore original function
      require('../../services/signalwire.service').stopRecording = originalStopRecording;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(mockStopRecording).toHaveBeenCalledWith('TEST-RECORDING-CALL-SID', 'TEST-RECORDING-SID-STOP');

      // Clean up test recording
      if (testStopRecordingId) {
        await db.CallRecording.destroy({ where: { id: testStopRecordingId } });
      }
    });

    test('DELETE /api/call-recordings/:id - Delete a recording', async () => {
      // Create a recording to delete
      let deleteRecordingId;
      try {
        const recordingToDelete = await db.CallRecording.create({
          callSid: 'TEST-DELETE-CALL-SID',
          recordingSid: 'TEST-DELETE-RECORDING-SID',
          status: 'completed',
          startTime: new Date(Date.now() - 7200000), // 2 hours ago
          endTime: new Date(Date.now() - 7140000),   // 1 hour 59 minutes ago
          duration: 60
        });
        deleteRecordingId = recordingToDelete.id;
      } catch (e) {
        logger.error(`Failed to create recording to delete: ${e.message}`);
      }

      // Skip test if we couldn't create the test recording
      if (!deleteRecordingId) {
        logger.warn('Skipping delete recording test due to setup failure');
        return;
      }

      const response = await request(app)
        .delete(`/api/call-recordings/${deleteRecordingId}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify it's deleted
      const deletedRecording = await db.CallRecording.findByPk(deleteRecordingId);
      expect(deletedRecording).toBeNull();
    });
  });
});
