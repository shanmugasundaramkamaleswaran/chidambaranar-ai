const { getAbimanyuResponse } = require('./services/aiService');

async function test() {
  try {
    console.log('Testing native Tamil generation...');
    const result = await getAbimanyuResponse('I feel confused about my duty.', [], 'tamil');
    console.log('Result:', result.responseText);
    console.log('Emotion:', result.emotion);
  } catch (e) {
    console.error('Test failed:', e);
  }
}

test();
