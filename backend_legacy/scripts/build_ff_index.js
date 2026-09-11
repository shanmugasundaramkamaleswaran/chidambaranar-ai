const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INPUT_FILE = path.join(__dirname, '..', 'freedom_fighters.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'ff_vector_db.json');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function buildIndex() {
    console.log('--- Starting Freedom Fighters Indexing ---');
    
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found: ${INPUT_FILE}`);
        return;
    }

    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    
    // Split by multiple newlines (at least 2) to get individual biographies
    const entries = content.split(/\n\s*\n\s*\n/).map(e => e.trim()).filter(e => e.length > 20);

    const chunks = entries.map((text, index) => {
        // Extract the name (first few words or handle common formats)
        const firstLine = text.split('\n')[0].trim();
        const idName = firstLine.split('(')[0].split('was')[0].trim();
        return {
            id: idName || `FF-${index + 1}`,
            text: text
        };
    });

    console.log(`Extracted ${chunks.length} biographies. Generating embeddings...`);

    const finalDb = [];
    const batchSize = 10; // Smaller batches for safety

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`);
        
        try {
            const results = await Promise.all(batch.map(async (chunk) => {
                const res = await embedModel.embedContent(chunk.text);
                return {
                    id: chunk.id,
                    text: chunk.text,
                    embedding: res.embedding.values,
                    type: 'freedom_fighter'
                };
            }));
            
            finalDb.push(...results);
            
            // Periodically save
            fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalDb, null, 2));
            
            // Respect rate limits (Gemini Free tier is quite strict)
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (e) {
            console.error(`Error in batch ${i}:`, e.message);
            // If rate limited, wait longer
            if (e.message.includes('429')) {
                console.log('Rate limit hit. Waiting 60 seconds...');
                await new Promise(resolve => setTimeout(resolve, 60000));
                i -= batchSize; // Retry this batch
            }
        }
    }

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalDb, null, 2));
    console.log(`--- Indexing Complete. Saved ${finalDb.length} items to ${OUTPUT_FILE} ---`);
}

buildIndex();
