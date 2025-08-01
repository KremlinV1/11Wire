/**
 * 11Wire - AI Dialer Server
 * Main server entry point
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const db = require('./models');
const { runSeeders } = require('./utils/seeders');
const websocketServer = require('./services/websocket-server.service');
const scheduledJobs = require('./services/scheduled-jobs.service');

// Initialize express app
const app = express();

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Temporary handler for ElevenLabs webhooks sent to root path
const elevenLabsWebhookController = require('./controllers/elevenlabs-webhook.controller');
app.post('/', (req, res, next) => {
  logger.info(`Received webhook to root path - forwarding to ElevenLabs webhook controller`);
  logger.info(`Headers: ${JSON.stringify(req.headers)}`);
  logger.info(`Body: ${JSON.stringify(req.body)}`);
  
  // Forward request to the proper controller
  elevenLabsWebhookController(req, res, next);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Initialize database and start server
const PORT = config.port || 3000;

// Function to start the server after database initialization
const startServer = () => {
  // Create HTTP server
  const server = http.createServer(app);
  
  // Initialize WebSocket server for audio streaming
  websocketServer.initializeWebSocketServer(server);
  
  // Initialize scheduled jobs for maintenance tasks
  scheduledJobs.initScheduledJobs();
  
  // Start the server
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`WebSocket server initialized for audio streaming on /stream`);
  });
};

// Connect to database and sync models
db.testConnection()
  .then(connected => {
    if (connected) {
      logger.info('Database connected successfully');
      
      // Sync models with database (in development mode, you might want to use { force: true })
      const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
      
      return db.sequelize.sync(syncOptions);
    } else {
      throw new Error('Database connection failed');
    }
  })
  .then(() => {
    logger.info('Database models synchronized');
    return runSeeders();
  })
  .then(() => {
    startServer();
  })
  .catch(err => {
    logger.error(`Database initialization error: ${err.message}`);
    logger.info('Starting server without database connection...');
    startServer();
  });

// Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Graceful shutdown
  scheduledJobs.stopScheduledJobs();
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scheduledJobs.stopScheduledJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  scheduledJobs.stopScheduledJobs();
  process.exit(0);
});

module.exports = app; // For testing
