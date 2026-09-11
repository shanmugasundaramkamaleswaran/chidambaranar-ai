const { getAbimanyuResponse } = require('./services/aiService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testRAG() {
    console.log('--- Testing Abimanyu RAG System ---');
    const query = "What does the Gita say about the soul and death?";
    console.log(`User Query: "${query}"`);
    
    try {
        const { responseText, emotion } = await getAbimanyuResponse(query, []);
        console.log('\n--- ABIMANYU RESPONSE ---');
        console.log('Emotion:', emotion);
        console.log('Response:', responseText);
        console.log('--------------------------');
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testRAG();
