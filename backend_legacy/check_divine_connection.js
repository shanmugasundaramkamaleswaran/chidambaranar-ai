const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

async function checkConnections() {
  console.log('--- DIVINE CONNECTION DIAGNOSTIC ---');

  // 1. Check Hugging Face
  const hfKey = process.env.HF_API_KEY;
  if (hfKey) {
    console.log('\n[1/3] Testing Hugging Face (Gemma 2B)...');
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/google/gemma-2-2b-it/v1/chat/completions',
        { model: 'google/gemma-2-2b-it', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 10 },
        { headers: { Authorization: `Bearer ${hfKey}` }, timeout: 5000 }
      );
      console.log('✅ HF SUCCESS:', response.data.choices[0].message.content);
    } catch (e) {
      console.log('❌ HF FAILED:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
  } else {
    console.log('\n[1/3] HF Key Missing');
  }

  // 2. Check Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log('\n[2/3] Testing Gemini (1.5 Flash)...');
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hi");
      console.log('✅ GEMINI SUCCESS:', (await result.response).text());
    } catch (e) {
      console.log('❌ GEMINI FAILED:', e.message);
    }
  } else {
    console.log('\n[2/3] Gemini Key Missing');
  }

  // 3. Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.includes('your_')) {
    console.log('\n[3/3] Testing OpenAI (GPT-4o-mini)...');
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      });
      console.log('✅ OPENAI SUCCESS:', resp.choices[0].message.content);
    } catch (e) {
      console.log('❌ OPENAI FAILED:', e.message);
    }
  } else {
    console.log('\n[3/3] OpenAI Key Missing/Placeholder');
  }
}

checkConnections();
