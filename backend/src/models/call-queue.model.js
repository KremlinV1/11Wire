/**
 * CallQueue Model
 * Manages calls waiting to be processed in a queue
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CallQueue extends Model {
    static associate(models) {
      // Define associations
      CallQueue.belongsTo(models.Contact, {
        foreignKey: 'contactId',
        as: 'contact'
      });
      
      CallQueue.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        as: 'campaign'
      });
    }
  }

  CallQueue.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    toNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Destination phone number'
    },
    fromNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Caller ID to use'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5, // 1-10 scale, 10 being highest priority
      comment: 'Priority level (1-10, higher = more important)'
    },
    campaignId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'campaigns',
        key: 'id'
      },
      comment: 'Associated campaign ID'
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contacts',
        key: 'id'
      },
      comment: 'Associated contact ID'
    },
    queuePosition: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Position in queue (recalculated based on priority)'
    },
    entryTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the call was added to the queue'
    },
    scheduledTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the call is scheduled to be processed (if applicable)'
    },
    status: {
      type: DataTypes.ENUM('waiting', 'processing', 'completed', 'failed', 'canceled', 'abandoned'),
      allowNull: false,
      defaultValue: 'waiting',
      comment: 'Current status of the queued call'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of attempts made for this call'
    },
    lastAttemptTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the last attempt was made'
    },
    voiceAgentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Voice agent to use for this call'
    },
    scriptId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Conversation script to use for this call'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional call metadata and parameters'
    },
    callSid: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Call SID after the call is initiated'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'CallQueue',
    tableName: 'call_queues',
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['campaignId']
      },
      {
        fields: ['contactId']
      },
      {
        fields: ['entryTime']
      },
      {
        fields: ['scheduledTime']
      }
    ]
  });

  return CallQueue;
};
