/**
 * Main API routes for 11Wire
 */

const express = require('express');
const router = express.Router();

// Import route modules
const callRoutes = require('./call.routes');
const callQueueRoutes = require('./call-queue.routes');
const callRecordingRoutes = require('./call-recording.routes');
const contactRoutes = require('./contact.routes');
const webhookRoutes = require('./webhook.routes');
const agentRoutes = require('./agent.routes');
const authRoutes = require('./auth.routes');
const campaignRoutes = require('./campaign.routes');
const queueSchedulerRoutes = require('./queue-scheduler.routes');
const transferRoutes = require('./transfer.routes');
const conversationRoutes = require('./conversation.routes');
const healthRoutes = require('./health.routes');

// API health check
router.get('/', (req, res) => {
  res.json({ message: '11Wire API is running' });
});

// Mount routes
router.use('/calls', callRoutes);
router.use('/call-queue', callQueueRoutes);
router.use('/call-recordings', callRecordingRoutes);
router.use('/contacts', contactRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/agents', agentRoutes);
router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/queue-scheduler', queueSchedulerRoutes);
router.use('/transfer', transferRoutes);
router.use('/conversations', conversationRoutes);
router.use('/health', healthRoutes);

module.exports = router;
