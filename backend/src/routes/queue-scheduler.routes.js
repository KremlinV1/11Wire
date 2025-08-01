/**
 * Queue Scheduler Routes
 * API routes for call queue scheduler management
 */

const express = require('express');
const router = express.Router();
const queueSchedulerController = require('../controllers/queue-scheduler.controller');

// Get status of all active schedulers
router.get(
  '/status',
  queueSchedulerController.getSchedulerStatuses
);

// Start global scheduler
router.post(
  '/global/start',
  queueSchedulerController.startGlobalScheduler
);

// Stop global scheduler
router.post(
  '/global/stop',
  queueSchedulerController.stopGlobalScheduler
);

// Process global queue manually
router.post(
  '/global/process',
  queueSchedulerController.processGlobalQueue
);

// Start campaign scheduler
router.post(
  '/campaign/:campaignId/start',
  queueSchedulerController.startCampaignScheduler
);

// Stop campaign scheduler
router.post(
  '/campaign/:campaignId/stop',
  queueSchedulerController.stopCampaignScheduler
);

// Process campaign queue manually
router.post(
  '/campaign/:campaignId/process',
  queueSchedulerController.processQueueForCampaign
);

module.exports = router;
