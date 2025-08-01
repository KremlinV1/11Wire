/**
 * Call Queue API endpoints
 */

const express = require('express');
const router = express.Router();
const callQueueController = require('../controllers/call-queue.controller');

// Add a call to the queue
router.post('/', callQueueController.addToQueue);

// Get queue items with filtering
router.get('/', callQueueController.getQueueItems);

// Get a single queue item
router.get('/:id', callQueueController.getQueueItem);

// Update queue item priority
router.put('/:id/priority', callQueueController.updatePriority);

// Cancel a queued call
router.put('/:id/cancel', callQueueController.cancelQueuedCall);

// Process the queue (execute calls)
router.post('/process', callQueueController.processQueue);

// Get queue statistics
router.get('/stats', callQueueController.getQueueStats);

module.exports = router;
