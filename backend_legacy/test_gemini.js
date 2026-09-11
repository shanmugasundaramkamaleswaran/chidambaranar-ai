const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiDirectly() {
  console.log('Testing Gemini API Directly...');
  const key = process.env.GEMINI_API_KEY;
  console.log('Key:', key ? key.substring(0, 10) + '...' : 'MISSING');
  
  if (!key) return;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
    const result = await model.generateContent("Hello Abimanyu.");
    const response = await result.response;
    console.log('--- SUCCESS ---');
    console.log(response.text());
  } catch (e) {
    console.error('--- GEMINI ERROR ---');
    console.error(JSON.stringify(e, null, 2));
    if (e.message) console.error('Message:', e.message);
  }
}

testGeminiDirectly();
