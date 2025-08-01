/**
 * Transfer Routes
 * API routes for call transfer operations
 */

const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');
const { validateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(validateToken);

// POST /api/transfer/initiate - Start a call transfer
router.post('/initiate', transferController.initiateTransfer);

// POST /api/transfer/complete - Complete a transfer
router.post('/complete', transferController.completeTransfer);

// POST /api/transfer/cancel - Cancel a transfer
router.post('/cancel', transferController.cancelTransfer);

// POST /api/transfer/twiml - Generate TwiML for a transfer
router.post('/twiml', transferController.generateTransferTwiML);

// GET /api/transfer/pending - Get list of pending transfers
router.get('/pending', transferController.getPendingTransfers);

// GET /api/transfer/:callSid/history - Get transfer history for a call
router.get('/:callSid/history', transferController.getTransferHistory);

module.exports = router;
