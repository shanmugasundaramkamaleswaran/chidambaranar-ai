const sequelize = require('./database');
const User = require('./models/User');
const ChatMessage = require('./models/ChatMessage');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connected');
    await sequelize.sync();
    console.log('Synced');
  } catch (e) {
    console.error('FULL ERROR:');
    console.error(e);
    process.exit(1);
  }
}

test();
