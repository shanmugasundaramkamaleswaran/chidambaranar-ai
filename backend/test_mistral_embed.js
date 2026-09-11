const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function testMistralEmbed() {
    const key = process.env.MISTRAL_API_KEY;
    console.log('Testing Mistral Embeddings...');
    try {
        const response = await axios.post(
            'https://api.mistral.ai/v1/embeddings',
            {
                model: 'mistral-embed',
                input: ['Hello world', 'Dharma is duty']
            },
            {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('--- SUCCESS ---');
        console.log('Embedding dimension:', response.data.data[0].embedding.length);
        console.log('Sample data:', response.data.data[0].embedding.slice(0, 5));
    } catch (e) {
        console.error('--- MISTRAL EMBED ERROR ---');
        if (e.response) {
            console.error(e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

testMistralEmbed();
