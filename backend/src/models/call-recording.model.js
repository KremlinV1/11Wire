/**
 * Call Recording Model
 * Stores call recordings from SignalWire calls
 * Integrates with ElevenLabs AI agent conversations
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CallRecording = sequelize.define('CallRecording', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    callSid: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'SignalWire Call SID'
    },
    recordingSid: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'SignalWire Recording SID'
    },
    campaignId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Associated campaign identifier'
    },
    status: {
      type: DataTypes.ENUM('in-progress', 'completed', 'failed'),
      defaultValue: 'in-progress',
      comment: 'Recording status'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When recording started'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When recording ended'
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Duration of recording in seconds'
    },
    format: {
      type: DataTypes.STRING,
      defaultValue: 'mp3',
      comment: 'Audio format (mp3, wav, etc.)'
    },
    channels: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of audio channels (1=mono, 2=dual/stereo)'
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL to the recording on SignalWire'
    },
    localFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to local downloaded file'
    },
    downloadStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending',
      comment: 'Status of download from SignalWire'
    },
    storageType: {
      type: DataTypes.ENUM('local', 's3', 'gcs', 'azure'),
      defaultValue: 'local',
      comment: 'Type of storage where the audio file is stored'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Size of the audio file in bytes'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata about the recording'
    }
  }, {
    tableName: 'call_recordings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'idx_recordings_call_sid',
        fields: ['call_sid']
      },
      {
        name: 'idx_recordings_recording_sid',
        fields: ['recording_sid']
      },
      {
        name: 'idx_recordings_campaign_id',
        fields: ['campaign_id']
      },
      {
        name: 'idx_recordings_status',
        fields: ['status']
      }
    ]
  });

  CallRecording.associate = (models) => {
    // Associate with Campaign if it exists
    if (models.Campaign) {
      CallRecording.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        targetKey: 'id',
        as: 'campaign'
      });
    }
    
    // Associate with CallLog for call details
    if (models.CallLog) {
      CallRecording.belongsTo(models.CallLog, {
        foreignKey: 'callSid',
        targetKey: 'callSid',
        as: 'callLog'
      });
    }
    
    // Maintain association with Conversation if needed
    if (models.Conversation) {
      CallRecording.belongsTo(models.Conversation, {
        foreignKey: 'callSid',
        targetKey: 'call_id',  // Changed from callSid to call_id to match Conversation model
        as: 'conversation',
        constraints: false // Break circular dependency during sync
      });
    }
  };

  return CallRecording;
};
