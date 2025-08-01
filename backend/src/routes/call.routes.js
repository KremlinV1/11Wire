/**
 * Call-related API endpoints
 */

const express = require('express');
const router = express.Router();
const callController = require('../controllers/call.controller');
const amdController = require('../controllers/amd.controller');
const transferController = require('../controllers/call-transfer.controller');

// GET all calls (with pagination and filtering)
router.get('/', callController.getRecentCalls);

// GET call statistics
router.get('/stats', callController.getCallStatistics);

// GET a single call by ID
router.get('/:id', callController.getCallDetails);

// POST to start a new outbound call
router.post('/outbound', callController.initiateCall);

// POST to start a batch of outbound calls for a campaign
router.post('/campaign/:campaignId/process', callController.processCampaignCalls);

// PUT to end an ongoing call
router.put('/:id/end', callController.endCall);

// GET call statistics
router.get('/stats', callController.getCallStatistics);

// GET available voice agents (from ElevenLabs)
router.get('/voice-agents', callController.getVoiceAgents);

// ===== SignalWire Webhook Routes =====

// Main call webhook for inbound calls
router.post('/webhook', callController.handleInboundCall);

// Webhook for gathering user input/speech
router.post('/webhook/gather/:callSid', callController.handleGatherWebhook);

// Webhook for call status updates
router.post('/webhook/status', callController.handleStatusWebhook);

// Webhook for recording status updates
router.post('/webhook/recording', callController.handleRecordingWebhook);

// Webhook for real-time audio streaming
router.post('/webhook/stream', callController.handleStreamWebhook);

// ===== Answering Machine Detection Routes =====

// Enable AMD for an existing call
router.post('/:callSid/amd/enable', amdController.enableAmdForCall);

// AMD webhook handler (automatic human/machine handling)
router.post('/webhook/amd', amdController.handleAmdWebhook);

// Process AMD result
router.post('/webhook/amd/result', amdController.processAmdResult);

// Generate AMD TwiML for a call
router.post('/twiml/amd', amdController.generateAmdTwiML);

// Generate TwiML for leaving a message on answering machine
router.post('/twiml/leave-message', amdController.generateLeaveMessageTwiML);

// Generate TwiML for waiting for beep then leaving a message
router.post('/twiml/wait-for-beep', amdController.generateWaitForBeepTwiML);

// ===== Call Transfer Routes =====

// Initiate a call transfer
router.post('/transfer', transferController.initiateTransfer);

// Get pending transfers
router.get('/transfers', transferController.getPendingTransfers);

// Get status of a specific transfer
router.get('/transfer/:callSid', transferController.getTransferStatus);

// Complete a transfer
router.put('/transfer/:callSid/complete', transferController.completeTransfer);

// Reject a transfer
router.put('/transfer/:callSid/reject', transferController.rejectTransfer);

module.exports = router;
