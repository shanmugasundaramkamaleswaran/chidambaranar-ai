const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class VectorService {
    constructor() {
        this.gitaDbPath = path.join(__dirname, '..', 'data', 'gita_vector_db.json');
        this.ffDbPath = path.join(__dirname, '..', 'data', 'ff_vector_db.json');
        this.db = [];
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.embedModel = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        this.loadDb();
    }

    loadDb() {
        this.db = [];
        
        // Load Gita
        if (fs.existsSync(this.gitaDbPath)) {
            try {
                const gitaData = JSON.parse(fs.readFileSync(this.gitaDbPath, 'utf-8'));
                // Ensure type is set if not already
                gitaData.forEach(item => { if (!item.type) item.type = 'gita'; });
                this.db.push(...gitaData);
                console.log(`[VectorDB] Loaded ${gitaData.length} Gita chunks.`);
            } catch (e) {
                console.error('[VectorDB] Error loading Gita DB:', e.message);
            }
        }

        // Load Freedom Fighters
        if (fs.existsSync(this.ffDbPath)) {
            try {
                const ffData = JSON.parse(fs.readFileSync(this.ffDbPath, 'utf-8'));
                ffData.forEach(item => { if (!item.type) item.type = 'freedom_fighter'; });
                this.db.push(...ffData);
                console.log(`[VectorDB] Loaded ${ffData.length} Freedom Fighter biographies.`);
            } catch (e) {
                console.error('[VectorDB] Error loading FF DB:', e.message);
            }
        }

        if (this.db.length === 0) {
            console.warn('[VectorDB] No database files found. Please run the indexers.');
        }
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(query, k = 5, excludeIds = [], temperature = 0.5, type = null) {
        if (this.db.length === 0) {
            this.loadDb();
            if (this.db.length === 0) return null;
        }

        console.log(`[VectorDB] Searching for: "${query}" (temp: ${temperature}, type: ${type || 'all'})`);
        
        try {
            const res = await this.embedModel.embedContent(query);
            const queryEmbedding = res.embedding.values;

            let searchPool = this.db;
            if (type) {
                searchPool = this.db.filter(item => item.type === type);
            }

            if (searchPool.length === 0) return null;

            const scores = searchPool.map(item => ({
                id: item.id,
                text: item.text,
                type: item.type,
                score: this.cosineSimilarity(queryEmbedding, item.embedding)
            }));

            // Filter out excluded IDs
            const filteredScores = scores.filter(s => !excludeIds.includes(s.id));
            
            // Sort by score descending
            filteredScores.sort((a, b) => b.score - a.score);

            // Take top N (say top 10)
            const topN = filteredScores.slice(0, 10);
            
            if (topN.length === 0) return null;

            // Randomized outcome based on temperature
            // Temperature 0: Always pick top 1
            // Temperature 1: More random among top N
            let selectedIndex = 0;
            if (temperature > 0) {
                // Simple randomization: pick from top K based on temperature
                const poolSize = Math.max(1, Math.min(topN.length, Math.ceil(temperature * 10)));
                selectedIndex = Math.floor(Math.random() * poolSize);
            }

            const result = topN[selectedIndex];
            console.log(`[VectorDB] Found relevant ${result.type}: ${result.id} (Score: ${result.score.toFixed(4)})`);
            
            return result;
        } catch (e) {
            console.error('[VectorDB] Search error:', e.message);
            return null;
        }
    }
}

module.exports = new VectorService();
