const { getAbimanyuResponse } = require('./services/aiService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyAI() {
  console.log('Verifying AI connection with Mistral integration...');
  try {
    const result = await getAbimanyuResponse('Hello Abimanyu, I seek your guidance on duty and dharma.');
    console.log('--- SUCCESS ---');
    console.log('Emotion:', result.emotion);
    console.log('Response:', result.responseText);
    
    if (result.responseText.includes('connection to the divine realm was interrupted')) {
      console.error('FAIL: Still getting the fallback error message.');
    } else {
      console.log('PASS: AI responded with a valid persona message.');
    }
  } catch (e) {
    console.error('--- ERROR ---');
    console.error(e);
  }
}

verifyAI();
