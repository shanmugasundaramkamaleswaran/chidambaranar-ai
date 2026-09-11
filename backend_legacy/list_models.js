const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Missing GEMINI_API_KEY');
    return;
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
        console.log('Available models:');
        data.models.forEach(m => console.log(m.name));
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error fetching models:', e);
  }
}

listModels();
