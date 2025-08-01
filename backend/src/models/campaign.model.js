/**
 * Campaign Model
 * Defines the database schema for campaigns
 */

module.exports = (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => `camp-${Date.now()}`,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed', 'failed', 'in_progress', 'stopped'),
      defaultValue: 'active',
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    contactsId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    voiceAgentId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    scriptId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        callsPerDay: 50,
        retryCount: 2,
        callHoursStart: '09:00',
        callHoursEnd: '17:00'
      }
    },
    stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    }
  }, {
    tableName: 'campaigns',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        name: 'campaigns_status_idx',
        fields: ['status']
      },
      {
        name: 'campaigns_dates_idx',
        fields: ['startDate', 'endDate']
      },
      {
        name: 'campaigns_contacts_idx',
        fields: ['contactsId']
      },
      {
        name: 'campaigns_voice_agent_idx',
        fields: ['voiceAgentId']
      }
    ]
  });

  return Campaign;
};
