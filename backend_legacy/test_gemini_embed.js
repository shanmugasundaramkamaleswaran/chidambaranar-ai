const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testGeminiEmbed() {
    const key = process.env.GEMINI_API_KEY;
    console.log('Testing Gemini Embeddings...');
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent("Dharma is duty");
        console.log('--- SUCCESS ---');
        console.log('Embedding dimension:', result.embedding.values.length);
        console.log('Sample data:', result.embedding.values.slice(0, 5));
    } catch (e) {
        console.error('--- GEMINI EMBED ERROR ---');
        console.error(e.message);
    }
}

testGeminiEmbed();
