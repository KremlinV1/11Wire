/**
 * Call Recording Routes
 * API routes for managing call recordings
 */

const express = require('express');
const router = express.Router();
const callRecordingController = require('../controllers/call-recording.controller');

// Get recording statistics
router.get(
  '/stats',
  callRecordingController.getRecordingStats
);

// List recordings (with filtering)
router.get(
  '/',
  callRecordingController.listRecordings
);

// Get a specific recording by ID
router.get(
  '/:id',
  callRecordingController.getRecording
);

// Get all recordings for a call
router.get(
  '/call/:callSid',
  callRecordingController.getRecordingsForCall
);

// Start recording a call
router.post(
  '/call/:callSid/start',
  callRecordingController.startRecording
);

// Stop recording a call
router.post(
  '/call/:callSid/stop',
  callRecordingController.stopRecording
);

// Delete a recording
router.delete(
  '/:id',
  callRecordingController.deleteRecording
);

// Handle recording webhook from SignalWire (no auth for webhooks)
router.post(
  '/webhook',
  callRecordingController.handleRecordingWebhook
);

module.exports = router;
