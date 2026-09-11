const { getAbimanyuResponse } = require('./services/aiService');

async function testUnifiedRAG() {
  try {
    console.log('--- Testing Unified RAG (Gita + FF) ---');
    
    const queries = [
      "I am afraid of my enemies.",
      "How to serve my country?",
      "I feel tired of fighting."
    ];

    for (const query of queries) {
      console.log(`\nUser: ${query}`);
      const result = await getAbimanyuResponse(query, [], 'english');
      console.log('Abimanyu Response Preview:');
      console.log(result.responseText.substring(0, 500) + '...');
      console.log('-----------------------------------');
    }

  } catch (e) {
    console.error('Test failed:', e);
  }
}

testUnifiedRAG();
