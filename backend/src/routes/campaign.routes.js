/**
 * Campaign Routes
 * Defines API endpoints for campaign management
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const campaignSchedulerController = require('../controllers/campaign-scheduler.controller');

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with optional filtering
 * @access  Private
 */
router.get('/', campaignController.getCampaigns);

/**
 * @route   GET /api/campaigns/stats
 * @desc    Get campaign statistics
 * @access  Private
 */
router.get('/stats', campaignController.getCampaignStats);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private
 */
router.get('/:id', campaignController.getCampaignById);

/**
 * @route   POST /api/campaigns
 * @desc    Create a new campaign
 * @access  Private
 */
router.post('/', campaignController.createCampaign);

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update an existing campaign
 * @access  Private
 */
router.put('/:id', campaignController.updateCampaign);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete a campaign
 * @access  Private
 */
router.delete('/:id', campaignController.deleteCampaign);

/**
 * @route   PATCH /api/campaigns/:id/status
 * @desc    Update campaign status (start, pause, resume, complete)
 * @access  Private
 */
router.patch('/:id/status', campaignController.updateCampaignStatus);

// ===== Campaign Scheduler Routes =====

/**
 * @route   POST /api/campaigns/:campaignId/scheduler/start
 * @desc    Start a campaign scheduler
 * @access  Private
 */
router.post('/:campaignId/scheduler/start', campaignSchedulerController.startCampaign);

/**
 * @route   POST /api/campaigns/:campaignId/scheduler/pause
 * @desc    Pause a campaign scheduler
 * @access  Private
 */
router.post('/:campaignId/scheduler/pause', campaignSchedulerController.pauseCampaign);

/**
 * @route   POST /api/campaigns/:campaignId/scheduler/resume
 * @desc    Resume a campaign scheduler
 * @access  Private
 */
router.post('/:campaignId/scheduler/resume', campaignSchedulerController.resumeCampaign);

/**
 * @route   POST /api/campaigns/:campaignId/scheduler/stop
 * @desc    Stop a campaign scheduler
 * @access  Private
 */
router.post('/:campaignId/scheduler/stop', campaignSchedulerController.stopCampaign);

/**
 * @route   GET /api/campaigns/:campaignId/scheduler/status
 * @desc    Get campaign scheduler status
 * @access  Private
 */
router.get('/:campaignId/scheduler/status', campaignSchedulerController.getCampaignStatus);

/**
 * @route   GET /api/campaigns/scheduler/active
 * @desc    Get all active campaign schedulers
 * @access  Private
 */
router.get('/scheduler/active', campaignSchedulerController.getAllActiveCampaigns);

/**
 * @route   PUT /api/campaigns/:campaignId/scheduler/settings
 * @desc    Update campaign scheduler settings
 * @access  Private
 */
router.put('/:campaignId/scheduler/settings', campaignSchedulerController.updateCampaignSettings);

module.exports = router;
