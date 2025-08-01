/**
 * CallLog Model
 * Detailed record of outbound and inbound calls
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CallLog extends Model {
    static associate(models) {
      // Define associations
      CallLog.belongsTo(models.Contact, {
        foreignKey: 'contactId',
        as: 'contact'
      });
      
      CallLog.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        as: 'campaign'
      });
    }
  }

  CallLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    callSid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    campaignId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'campaigns',
        key: 'id'
      }
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING, // queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Call duration in seconds'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    voiceAgentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ElevenLabs voice agent ID used for this call'
    },
    recordingUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transcription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    callData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional call metadata'
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Call performance metrics'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transferStatus: {
      type: DataTypes.ENUM('none', 'requested', 'in-progress', 'completed', 'failed'),
      defaultValue: 'none',
      comment: 'Status of any transfer for this call'
    },
    transferredTo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identifier of agent/endpoint call was transferred to'
    },
    transferredFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identifier of agent/endpoint call was transferred from'
    },
    transferTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the transfer was initiated'
    },
    transferType: {
      type: DataTypes.ENUM('warm', 'cold'),
      allowNull: true,
      comment: 'Type of transfer (warm = announced, cold = direct)'
    },
    transferMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional data related to the transfer'
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
    modelName: 'CallLog',
    tableName: 'call_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['callSid']
      },
      {
        fields: ['contactId']
      },
      {
        fields: ['campaignId']
      },
      {
        fields: ['direction']
      },
      {
        fields: ['status']
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['transferStatus']
      },
      {
        fields: ['transferTime']
      }
    ]
  });

  return CallLog;
};
