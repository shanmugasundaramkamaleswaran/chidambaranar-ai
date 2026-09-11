const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { getAbimanyuResponse } = require('../services/aiService');
const { analyzeSentiment, isGibberish } = require('../services/nlpService');
const { getAudioBase64 } = require('../services/voiceService');
const translationService = require('../services/translationService');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

/**
 * Send a chat message and get AI response.
 */
router.post('/', optionalAuthMiddleware, async (req, res) => {
  const { message, language } = req.body;
  if (!message) return res.status(400).json({ detail: 'Message is required' });

  // Check for gibberish
  if (isGibberish(message)) {
    return res.json({
      status: 'error',
      reply: "My friend, your words carry no weight in the realm of Dharma. Please speak with clear intent so that I may guide you.",
      mood: 'confused'
    });
  }

  try {
    let history = [];
    // Analyze sentiment of user message
    const userSentiment = analyzeSentiment(message);

    // Save user message and fetch history if authenticated
    if (req.user) {
      await ChatMessage.create({
        user_id: req.user.id,
        content: message,
        is_ai: false,
        sentiment: userSentiment
      });

      const recentMsgs = await ChatMessage.findAll({
        where: { user_id: req.user.id },
        order: [['timestamp', 'DESC']],
        limit: 10
      });

      history = recentMsgs.reverse().map(msg => ({
        role: msg.is_ai ? 'assistant' : 'user',
        content: msg.content
      }));
    }

    // Get AI response
    const { responseText, emotion } = await getAbimanyuResponse(message, history, language);
    
    // Save AI response if authenticated
    if (req.user) {
      await ChatMessage.create({
        user_id: req.user.id,
        content: responseText,
        is_ai: true,
        emotion: emotion,
        sentiment: 'neutral' // AI responses are usually neutral/positive but stable
      });
    }

    // Generate audio (optional)
    const audioB64 = await getAudioBase64(responseText);

    res.json({
      reply: responseText,
      sentiment: userSentiment,
      audio: audioB64,
      mood: emotion
    });
  } catch (e) {
    console.error('Chat Error:', e);
    res.json({
      reply: "I'm experiencing some technical difficulties. Please try again later.",
      sentiment: 'neutral',
      audio: null,
      mood: 'neutral'
    });
  }
});

/**
 * Get analytics for the mental health tracker.
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    // Fetch last 30 messages to see trends
    const messages = await ChatMessage.findAll({
      where: { 
        user_id: req.user.id,
        is_ai: true,
        emotion: { [require('sequelize').Op.ne]: null }
      },
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    const emotionMap = {
      bravery: { mood: 9, strength: 10, stress: 1 },
      determination: { mood: 8, strength: 9, stress: 2 },
      sacrifice: { mood: 7, strength: 8, stress: 3 },
      patience: { mood: 7, strength: 7, stress: 2 },
      confusion: { mood: 4, strength: 4, stress: 6 },
      fear: { mood: 3, strength: 3, stress: 8 },
      anger: { mood: 2, strength: 5, stress: 9 },
      grief: { mood: 2, strength: 2, stress: 7 },
      weakness: { mood: 1, strength: 1, stress: 5 },
      neutral: { mood: 5, strength: 5, stress: 5 }
    };

    const analytics = messages.reverse().map(msg => {
      const date = new Date(msg.timestamp);
      const metrics = emotionMap[msg.emotion] || emotionMap.neutral;
      
      return {
        date: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: date.toLocaleDateString(),
        ...metrics
      };
    });

    // If no data, provide a baseline
    if (analytics.length === 0) {
      analytics.push({
        date: 'Starting Point',
        mood: 5,
        strength: 5,
        stress: 5
      });
    }

    res.json(analytics);
  } catch (e) {
    console.error('Analytics Error:', e);
    res.status(500).json({ detail: 'Failed to fetch analytics' });
  }
});

/**
 * Get chat history for authenticated user.
 */
router.get('/history', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  try {
    const messages = await ChatMessage.findAll({
      where: { user_id: req.user.id },
      order: [['timestamp', 'DESC']],
      limit: limit
    });

    res.json(messages.reverse().map(msg => ({
      id: msg.id,
      content: msg.content,
      is_ai: msg.is_ai,
      timestamp: msg.timestamp
    })));
  } catch (e) {
    console.error('History Error:', e);
    res.status(500).json({ detail: 'Failed to fetch history' });
  }
});

/**
 * Clear chat history for authenticated user.
 */
router.delete('/history', authMiddleware, async (req, res) => {
  try {
    await ChatMessage.destroy({ where: { user_id: req.user.id } });
    res.json({ message: 'Chat history cleared' });
  } catch (e) {
    console.error('Clear History Error:', e);
    res.status(500).json({ detail: 'Failed to clear history' });
  }
});

module.exports = router;
