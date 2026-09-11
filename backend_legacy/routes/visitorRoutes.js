const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');

/**
 * POST /visitors/increment
 * Records the visitor's IP and increments the count.
 * Returns the current total unique visitor count.
 */
router.post('/increment', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket?.remoteAddress ||
            'unknown';

        const [visitor, created] = await Visitor.findOrCreate({
            where: { ip },
            defaults: { visit_count: 1, last_visited: new Date() }
        });

        if (!created) {
            await visitor.update({
                visit_count: visitor.visit_count + 1,
                last_visited: new Date()
            });
        }

        const totalCount = await Visitor.count();
        res.json({ count: totalCount });
    } catch (e) {
        console.error('Visitor Increment Error:', e);
        res.status(500).json({ detail: 'Failed to increment visitor count' });
    }
});

/**
 * GET /visitors/count
 * Returns the current total unique visitor count.
 */
router.get('/count', async (req, res) => {
    try {
        const totalCount = await Visitor.count();
        res.json({ count: totalCount });
    } catch (e) {
        console.error('Visitor Count Error:', e);
        res.status(500).json({ detail: 'Failed to get visitor count' });
    }
});

module.exports = router;
