/**
 * STT Request Mapping Model
 * Maps ElevenLabs STT request IDs to call IDs for webhook processing
 */

module.exports = (sequelize, DataTypes) => {
  const SttRequestMapping = sequelize.define('SttRequestMapping', {
  // UUID from ElevenLabs STT request
  request_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  
  // Call ID (SID) from SignalWire
  call_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  
  // Additional metadata that might be useful
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  
  // When was this request submitted
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  
  // When was the result received (if any)
  result_received_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  // Status of the request (pending, completed, failed)
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  },
  
  // Any error that might have occurred
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  // Table configuration
  tableName: 'stt_request_mappings',
  timestamps: true,
  indexes: [
    {
      fields: ['call_id']
    },
    {
      fields: ['status']
    }
  ]
});

  return SttRequestMapping;
};
