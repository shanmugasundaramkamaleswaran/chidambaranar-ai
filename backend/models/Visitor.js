const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Visitor = sequelize.define('Visitor', {
    ip: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    visit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    last_visited: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'visitors',
    timestamps: false
});

module.exports = Visitor;
