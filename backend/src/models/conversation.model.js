/**
 * Conversation Model
 * Stores conversation transcripts from ElevenLabs AI agent calls
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    call_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unique call identifier from ElevenLabs'
    },
    agent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ElevenLabs agent identifier'
    },
    campaign_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Associated campaign identifier'
    },
    messages: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Full conversation transcript in JSON format'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'AI-generated summary of the conversation'
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of the call in seconds'
    },
    call_success: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
      comment: 'Whether the call was successful'
    },
    callRecordingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'call_recordings', // Matches the table name defined in call-recording.model.js
        key: 'id'
      },
      comment: 'Foreign key to the CallRecording model'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata about the conversation'
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    indexes: [
      {
        name: 'idx_conversations_call_id',
        fields: ['call_id']
      },
      {
        name: 'idx_conversations_campaign_id',
        fields: ['campaign_id']
      }
    ]
  });

  Conversation.associate = (models) => {
    // Define associations if needed
    if (models.Campaign) {
      Conversation.belongsTo(models.Campaign, {
        foreignKey: 'campaign_id',
        targetKey: 'id',
        as: 'campaign'
      });
    }
  };

  return Conversation;
};
