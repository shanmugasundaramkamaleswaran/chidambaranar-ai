const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INPUT_FILE = path.join(__dirname, '..', 'data', 'extracted', 'bhagavad_gita_text.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'gita_vector_db.json');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function buildIndex() {
    console.log('--- Starting Gita Indexing ---');
    
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found: ${INPUT_FILE}`);
        return;
    }

    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');

    const chunks = [];
    let currentChunk = [];
    let lastMarker = "Intro";

    const markerRegex = /\((\d+)\.(\d+)\)/;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Filter out noise
        if (line.match(/^Chapter \d+ \d+$/)) continue;
        if (line.match(/^The Bhagavad Gita$/)) continue;
        if (line.match(/^\d+$/)) continue; // Page numbers
        if (line.includes('jkhh')) continue; // Common noise in this file

        const match = line.match(markerRegex);
        if (match) {
            const id = `${match[1]}.${match[2]}`;
            // Save previous chunk
            if (currentChunk.length > 0) {
                chunks.push({
                    id: lastMarker,
                    text: currentChunk.join(' ')
                });
            }
            currentChunk = [];
            lastMarker = id;
        } else {
            currentChunk.push(line);
        }
    }

    // Add last chunk
    if (currentChunk.length > 0) {
        chunks.push({
            id: lastMarker,
            text: currentChunk.join(' ')
        });
    }

    console.log(`Extracted ${chunks.length} chunks. Generating embeddings...`);

    const finalDb = [];
    const batchSize = 20; // Gemini allows batch embedding

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}...`);
        
        let success = false;
        let retries = 3;

        while (!success && retries > 0) {
            try {
                const embeddingPromises = batch.map(chunk => 
                    embedModel.embedContent(chunk.text).then(res => ({
                        id: chunk.id,
                        text: chunk.text,
                        embedding: res.embedding.values
                    }))
                );
                
                const results = await Promise.all(embeddingPromises);
                finalDb.push(...results);
                
                // Save progress
                fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalDb, null, 2));
                
                success = true;
                
                // Delay between batches to respect 100 RPM limit
                // Each batch has batchSize (20) requests. 
                // 100 / 20 = 5 batches per minute = 12 seconds per batch.
                await new Promise(resolve => setTimeout(resolve, 15000));
            } catch (e) {
                console.error(`Error in batch ${i}:`, e.message);
                if (e.message.includes('Quota exceeded') || e.message.includes('429')) {
                    console.log('Rate limit hit. Waiting 60 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 65000));
                    retries--;
                } else {
                    retries = 0; // Don't retry other errors
                }
            }
        }
    }

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalDb, null, 2));
    console.log(`--- Indexing Complete. Saved to ${OUTPUT_FILE} ---`);
}

buildIndex();
