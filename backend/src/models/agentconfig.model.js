/**
 * AgentConfig Model
 * Stores ElevenLabs voice agent configurations
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentConfig extends Model {
    static associate(models) {
      // Define associations if needed
    }
  }

  AgentConfig.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'ElevenLabs voice agent ID'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Agent configuration settings'
    },
    promptSettings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Agent prompt configuration'
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Webhook URL for agent callbacks'
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
    modelName: 'AgentConfig',
    tableName: 'agent_configs',
    timestamps: true,
    indexes: [
      {
        fields: ['agentId']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return AgentConfig;
};
