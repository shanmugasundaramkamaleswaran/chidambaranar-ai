const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_ai: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emotion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sentiment: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chat_messages',
  underscored: true,
  timestamps: false // We use the custom 'timestamp' field
});

User.hasMany(ChatMessage, { foreignKey: 'user_id', as: 'messages' });
ChatMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = ChatMessage;
