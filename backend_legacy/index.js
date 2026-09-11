const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./database');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const User = require('./models/User');
const Visitor = require('./models/Visitor');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS setup
const allowedOrigins = [
  'https://localhost:8080',
  'https://localhost:8081',
  'https://127.0.0.1:8080',
  'https://127.0.0.1:8081',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'https://abimanyuai.vercel.app',
  'https://abimanyu-ai.vercel.app'
];

if (process.env.VERCEL_FRONTEND_URL) {
  allowedOrigins.push(process.env.VERCEL_FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && !origin.endsWith('.vercel.app')) {
      return callback(null, true); // Being lean for dev, but could restrict more
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body parser with 1MB limit (matches Python backend)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Abimanyu AI Backend (Node.js)');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Demo user creation (for testing, matches main.py)
app.post('/test/create-demo-user', async (req, res) => {
  const { getPasswordHash } = require('./services/authService');
  try {
    const [user, created] = await User.findOrCreate({
      where: { email: 'demo@example.com' },
      defaults: {
        password_hash: await getPasswordHash('demo123'),
        name: 'Demo User'
      }
    });

    res.json({
      success: true,
      message: created ? 'Demo user created successfully' : 'Demo user already exists',
      email: 'demo@example.com',
      password: 'demo123'
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/visitors', visitorRoutes);

// Database Sync and Start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync models without alter first (safe)
    await sequelize.sync({ alter: false });

    // Safely add new columns if they don't exist (raw SQL)
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('chat_messages').catch(() => null);
    if (tableDescription) {
      if (!tableDescription.emotion) {
        await sequelize.query(`ALTER TABLE chat_messages ADD COLUMN emotion TEXT;`);
        console.log('[DB] Added emotion column to chat_messages');
      }
      if (!tableDescription.sentiment) {
        await sequelize.query(`ALTER TABLE chat_messages ADD COLUMN sentiment TEXT;`);
        console.log('[DB] Added sentiment column to chat_messages');
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error('Unable to start server:', e);
  }
}

startServer();
