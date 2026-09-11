const { getAbimanyuResponse } = require('./services/aiService');
require('dotenv').config();

async function testAI() {
  console.log('Testing Abimanyu AI Response...');
  try {
    const result = await getAbimanyuResponse('Hello Abimanyu, I need guidance.');
    console.log('--- RESPONSE ---');
    console.log(result.responseText);
    console.log('--- MOOD ---');
    console.log(result.emotion);
  } catch (e) {
    console.error('--- ERROR CAUGHT ---');
    if (e.response) {
      console.error('Response Status:', e.response.status);
      console.error('Response Data:', e.response.data);
    } else {
      console.error(e.message);
    }
  }
}

testAI();
