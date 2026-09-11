const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testHF() {
  const hfKey = process.env.HF_API_KEY;
  const hfEndpoint = 'https://router.huggingface.co/v1/chat/completions';
  
  console.log('Testing Hugging Face...');
  console.log('Key:', hfKey ? hfKey.substring(0, 10) + '...' : 'MISSING');

  try {
    const response = await axios.post(
      hfEndpoint,
      {
        model: 'google/gemma-2-2b-it',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100
      },
      {
        headers: { 
          Authorization: `Bearer ${hfKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('--- SUCCESS ---');
    console.log(response.data.choices[0].message.content);
  } catch (e) {
    console.error('--- HF ERROR ---');
    if (e.response) {
      console.error(e.response.status, e.response.data);
    } else {
      console.error(e.message);
    }
  }
}

testHF();
