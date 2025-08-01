/**
 * Database models initialization
 * Sets up Sequelize ORM with configured database
 */

const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Sequelize with database config
const sequelize = new Sequelize({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  ssl: config.db.ssl,
  dialectOptions: config.db.ssl ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error.message}`);
    return false;
  }
};

// Initialize models
const db = {
  sequelize,
  Sequelize,
  testConnection
};

// Import model definitions
db.Campaign = require('./campaign.model')(sequelize, Sequelize);
db.Conversation = require('./conversation.model')(sequelize, Sequelize);
db.CallRecording = require('./call-recording.model')(sequelize, Sequelize);
db.Contact = require('./contact.model')(sequelize, Sequelize);
db.CallLog = require('./calllog.model')(sequelize, Sequelize);
db.AgentConfig = require('./agentconfig.model')(sequelize, Sequelize);
db.CallQueue = require('./call-queue.model')(sequelize, Sequelize);
db.SttRequestMapping = require('./stt-request-mapping.model')(sequelize, Sequelize);

// All associations are defined in the model files via associate() methods
// Don't define associations directly here to avoid conflicts

// Run model associations (included in each model)
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
