/**
 * Conversation Routes
 * API endpoints for accessing and manipulating conversation data
 */

const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');

/**
 * @route GET /api/conversations
 * @desc Get all conversations with filtering and pagination
 * @access Private
 */
router.get('/', conversationController.getConversations);

/**
 * @route GET /api/conversations/:id
 * @desc Get conversation by ID
 * @access Private
 */
router.get('/:id', conversationController.getConversationById);

/**
 * @route PUT /api/conversations/:id/metadata
 * @desc Update conversation metadata
 * @access Private
 */
router.put('/:id/metadata', conversationController.updateConversationMetadata);

/**
 * @route GET /api/conversations/stats
 * @desc Get conversation statistics
 * @access Private
 */
router.get('/stats', conversationController.getConversationStats);

module.exports = router;
