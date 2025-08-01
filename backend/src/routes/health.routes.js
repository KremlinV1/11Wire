/**
 * Health API Routes
 * Provides system health monitoring endpoints
 */

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Mount all controller routes directly
router.use('/', healthController);

module.exports = router;
