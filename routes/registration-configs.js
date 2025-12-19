const express = require('express');
const router = express.Router();
const mongoClient = require('../utils/mongoClient'); // your existing client helper

async function obtainDb() {
  if (!mongoClient) throw new Error('mongoClient not available');
  if (typeof mongoClient.getDb === 'function') return await mongoClient.getDb();
  if (mongoClient.db) return mongoClient.db;
  throw new Error('mongoClient has no getDb/db');
}

function normalizePageToPlural(page) {
  if (!page) return null;
  const s = String(page).trim().toLowerCase();
  const singular = s.endsWith('s') ? s.slice(0, -1) : s;
  const map = { visitor: 'visitors', exhibitor: 'exhibitors', speaker: 'speakers', partner: 'partners', awardee: 'awardees' };
  return map[singular] || `${singular}s`;
}

router.get('/', async (req, res) => {
  try {
    const db = await obtainDb();
    const col = db.collection('registration_configs'); // adjust if your collection name differs
    const docs = await col.find({}).toArray();
    // normalize shape
    const out = (docs || []).map(d => ({
      id: d._id ? String(d._id) : null,
      page: d.page || (d.config && d.config.page) || null,
      config: d.config || {},
      createdAt: d.createdAt || d.created_at || null,
      updatedAt: d.updatedAt || d.updated_at || null,
    }));
    return res.json({ success: true, configs: out });
  } catch (err) {
    console.error('[registration-configs] GET / error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'server error' });
  }
});

router.get('/:page', async (req, res) => {
  try {
    const page = String(req.params.page || '').trim().toLowerCase();
    if (!page) return res.status(400).json({ success: false, error: 'missing page' });
    const db = await obtainDb();
    const col = db.collection('registration_configs');
    const doc = await col.findOne({ page });
    if (!doc) return res.status(404).json({ success: false, error: 'not found' });
    return res.json({ success: true, config: doc.config || {}, page: doc.page || page });
  } catch (err) {
    console.error('[registration-configs] GET /:page error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'server error' });
  }
});

module.exports = router;