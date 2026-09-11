const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testRawAI() {
  console.log('Testing Raw AI Service with Mistral-7B...');
  const hfKey = process.env.HF_API_KEY;
  const hfEndpoint = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions';
  
  try {
    const response = await axios.post(
      hfEndpoint,
      {
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 50,
      },
      {
        headers: { Authorization: `Bearer ${hfKey}` }
      }
    );
    console.log('--- SUCCESS ---');
    console.log(JSON.stringify(response.data.choices[0].message.content));
  } catch (e) {
    console.error('--- ERROR ---');
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', JSON.stringify(e.response.data));
    } else {
      console.error(e.message);
    }
  }
}

testRawAI();
