/**
 * User Model
 * 
 * Defines the schema for user accounts in the system
 */

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name is required' }
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Last name is required' }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Please enter a valid email address' },
        notEmpty: { msg: 'Email address is required' }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [8, 100], msg: 'Password must be at least 8 characters' }
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'user'),
      defaultValue: 'user'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'active'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true // Automatically add createdAt and updatedAt timestamps
  });
  
  // Define associations
  User.associate = function(models) {
    // Define any associations here
    // For example:
    // User.hasMany(models.SomeModel, { foreignKey: 'userId', as: 'someModels' });
  };
  
  // Instance methods
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password; // Don't expose password in JSON responses
    return values;
  };
  
  return User;
};
