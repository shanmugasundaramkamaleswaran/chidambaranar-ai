const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL || path.join(__dirname, 'data', 'abimanyu.db'),
  logging: false
});

module.exports = sequelize;
