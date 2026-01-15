const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const mongo = require('../utils/mongoClient');
const sendTicketEmail = require('../utils/sendTicketEmail'); // centralized mail + badge sender

// parse JSON bodies for routes in this router
router.use(express.json({ limit: '6mb' }));

function generateTicketCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

async function obtainDb() {
  if (!mongo) return null;
  if (typeof mongo.getDb === 'function') return await mongo.getDb();
  if (mongo.db) return mongo.db;
  return null;
}

function isEmailLike(v) {
  return typeof v === 'string' && /\S+@\S+\.\S+/.test(v);
}

function docToOutput(doc) {
  if (!doc) return null;
  const out = { ...doc };
  if (out._id) {
    out.id = String(out._id);
  } else {
    out.id = null;
  }
  return out;
}

/**
 * POST /api/speakers
 * Create new speaker and respond immediately. If added_by_admin === true, skip background email.
 */
router.post('/', async (req, res) => {
  let db;
  let col;
  let r;
  try {
    db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    const payload = { ...(req.body || {}) };

    // normalize slots if provided as JSON string
    if (typeof payload.slots === 'string') {
      try { payload.slots = JSON.parse(payload.slots); } catch { /* keep as string */ }
    }

    const doc = {
      name: payload.name || payload.fullName || '',
      email: (payload.email || '').toString().trim(),
      mobile: payload.mobile || payload.phone || '',
      designation: payload.designation || '',
      company: payload.company || '',
      ticket_category: 'speaker',
      slots: Array.isArray(payload.slots) ? payload.slots : [],
      category: payload.category || '',
      txId: payload.txId || payload.txid || null,
      other_details: payload.other_details || payload.otherDetails || '',
      created_at: new Date(),
      registered_at: payload.registered_at ? new Date(payload.registered_at) : new Date(),
      added_by_admin: !!payload.added_by_admin,
      admin_created_at: payload.added_by_admin ? new Date(payload.admin_created_at || Date.now()) : undefined,
    };

    // ticket_code: allow incoming, else generate
    doc.ticket_code = (payload.ticket_code || payload.ticketCode) ? String(payload.ticket_code || payload.ticketCode) : generateTicketCode();

    col = db.collection('speakers');
    r = await col.insertOne(doc);
    const insertedId = r.insertedId ? String(r.insertedId) : null;

    // ensure ticket_code persisted
    if (doc.ticket_code && r && r.insertedId) {
      try { await col.updateOne({ _id: r.insertedId }, { $set: { ticket_code: doc.ticket_code } }); } catch (e) { /* ignore */ }
    }

    const savedDoc = await col.findOne({ _id: r.insertedId });
    const output = docToOutput(savedDoc);

    // If created by admin, skip background email; return mail: { skipped: true }
    if (doc.added_by_admin) {
      return res.json({
        success: true,
        insertedId,
        ticket_code: doc.ticket_code,
        saved: output,
        mail: { skipped: true },
      });
    }

    // Respond immediately and perform background email
    res.json({
      success: true,
      insertedId,
      ticket_code: doc.ticket_code,
      saved: output,
      mail: { queued: true },
    });

    (async () => {
      try {
        if (!isEmailLike(doc.email)) {
          console.warn('[speakers] saved but no valid email; skipping ack mail');
          return;
        }

        const result = await sendTicketEmail({
          entity: 'speakers',
          record: savedDoc,
          options: { forceSend: false, includeBadge: true },
        });

        if (result && result.success) {
          try {
            await col.updateOne({ _id: r.insertedId }, { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } });
            console.log('[speakers] ack mail sent to', doc.email);
          } catch (upErr) {
            console.warn('[speakers] ack mail sent but failed to update DB flags:', upErr && (upErr.message || upErr));
          }
        } else {
          console.error('[speakers] ack mail failed:', result && result.error ? result.error : result);
          try {
            await col.updateOne({ _id: r.insertedId }, { $set: { email_failed: true, email_failed_at: new Date() } });
          } catch (upErr) { /* ignore */ }
        }
      } catch (e) {
        console.error('[speakers] ack mail background error:', e && (e.stack || e));
        try {
          if (r && r.insertedId) {
            await col.updateOne(
              { _id: r.insertedId },
              { $set: { email_failed: true, email_failed_at: new Date() } }
            );
          }
        } catch (upErr) { /* ignore */ }
      }
    })();

    return;
  } catch (err) {
    console.error('POST /api/speakers (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to create speaker' });
  }
});

/**
 * POST /api/speakers/:id/resend-email
 * Delegate email sending to centralized util and update DB flags accordingly.
 */
router.post('/:id/resend-email', async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ success: false, error: 'invalid id' }); }

    const col = db.collection('speakers');
    const doc = await col.findOne({ _id: oid });
    if (!doc) return res.status(404).json({ success: false, error: 'Speaker not found' });
    if (!isEmailLike(doc.email)) return res.status(400).json({ success: false, error: 'No valid email found for speaker' });

    try {
      const result = await sendTicketEmail({ entity: 'speakers', record: doc, options: { forceSend: true, includeBadge: true } });

      if (result && result.success) {
        await col.updateOne({ _id: oid }, { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } });
        return res.json({ success: true });
      } else {
        await col.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } });
        return res.status(500).json({ success: false, error: result && result.error ? result.error : 'Failed to send email' });
      }
    } catch (e) {
      console.error('[speakers] resend failed:', e && (e.stack || e));
      try { await col.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } }); } catch {}
      return res.status(500).json({ success: false, error: 'Failed to resend email' });
    }
  } catch (err) {
    console.error('POST /api/speakers/:id/resend-email error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to resend email' });
  }
});

/**
 * GET /api/speakers
 */
router.get('/', async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.status(500).json({ error: 'database not available' });

    const col = db.collection('speakers');
    const cursor = col.find({}).sort({ created_at: -1 }).limit(1000);
    const rows = await cursor.toArray();
    return res.json(rows.map(docToOutput));
  } catch (err) {
    console.error('GET /api/speakers (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ error: 'Failed to fetch speakers' });
  }
});

/**
 * GET /api/speakers/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const db = await obtainDb();
    if (!db) return res.status(500).json({ error: 'database not available' });

    let q;
    try {
      q = { _id: new ObjectId(id) };
    } catch {
      return res.status(400).json({ error: 'invalid id' });
    }

    const col = db.collection('speakers');
    const doc = await col.findOne(q);
    return res.json(docToOutput(doc) || {});
  } catch (err) {
    console.error('GET /api/speakers/:id (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ error: 'Failed to fetch speaker' });
  }
});

/**
 * PUT /api/speakers/:id
 * Accepts fields in body (except id/_id), updates and returns saved document.
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    let oid;
    try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ success: false, error: 'invalid id' }); }

    const fields = { ...(req.body || {}) };
    delete fields.id;
    delete fields._id;

    if (Object.keys(fields).length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    // Keep nested objects as-is
    const updateData = { ...fields, updated_at: new Date() };

    const col = db.collection('speakers');
    const r = await col.updateOne({ _id: oid }, { $set: updateData });
    if (!r.matchedCount) return res.status(404).json({ success: false, error: 'Speaker not found' });

    const saved = await col.findOne({ _id: oid });
    const out = docToOutput(saved);
    return res.json({ success: true, saved: out });
  } catch (err) {
    console.error('PUT /api/speakers/:id error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to update speaker' });
  }
});

module.exports = router;
