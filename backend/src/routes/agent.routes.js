/**
 * Agent management API endpoints for ElevenLabs voice agents
 */

const express = require('express');
const router = express.Router();
const agentController = require('../controllers/elevenlabs-agent.controller');

// GET all configured voice agents
router.get('/', agentController.listConfiguredAgents);

// GET all available voice agents from ElevenLabs
router.get('/available', agentController.listVoiceAgents);

// GET a single voice agent by ID
router.get('/:agentId', agentController.getAgentConfig);

// POST to create a new voice agent configuration
router.post('/:agentId', agentController.saveAgentConfig);

// PUT to update voice agent configuration
router.put('/:agentId', agentController.saveAgentConfig);

// DELETE a voice agent configuration
router.delete('/:agentId', agentController.deleteAgentConfig);

// GET agent metrics/performance data
router.get('/:agentId/metrics', agentController.getAgentMetrics);

// POST to assign agent to a campaign
router.post('/:agentId/assign/:campaignId', agentController.assignAgentToCampaign);

module.exports = router;
