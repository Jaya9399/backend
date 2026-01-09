const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const mongo = require('../utils/mongoClient'); // must expose getDb() or .db
const mailer = require('../utils/mailer'); // expects sendMail(opts) -> { success, info?, error?, dbRecordId? }

// parse JSON bodies for routes in this router
router.use(express.json({ limit: '6mb' }));

function buildSpeakerAckEmail({ name = '', ticket_code = '' } = {}) {
  const subject = 'RailTrans Expo — Speaker Registration Confirmed';

  const text = `Hello ${name || 'Speaker'},

Thank you for registering as a Speaker at RailTrans Expo.

Your registration code is: ${ticket_code}

Our team will reach out with session details soon.

Regards,
RailTrans Expo Team
support@railtransexpo.com
`;

  const html = `
<p>Hello ${name || 'Speaker'},</p>
<p>Thank you for registering as a <strong>Speaker</strong> at <strong>RailTrans Expo</strong>.</p>
<p><strong>Your registration code:</strong> ${ticket_code}</p>
<p>Our team will contact you shortly with session details.</p>
<p>Regards,<br/>
<strong>RailTrans Expo Team</strong><br/>
<a href="mailto:support@railtransexpo.com">support@railtransexpo.com</a>
</p>`;

  return {
    subject,
    text,
    html,
    from: process.env.MAIL_FROM || 'RailTrans Expo <support@railtransexpo.com>',
  };
}

/* ---------- helpers ---------- */
async function obtainDb() {
  if (!mongo) return null;
  if (typeof mongo.getDb === 'function') return await mongo.getDb();
  if (mongo.db) return mongo.db;
  return null;
}

function isEmailLike(v) {
  return typeof v === 'string' && /\S+@\S+\.\S+/.test(v);
}

function toIsoMysqlLike(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) return val;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return null;
  }
}

function docToOutput(doc) {
  if (!doc) return null;
  const out = { ...doc };
  if (out._id) {
    out.id = String(out._id);
    delete out._id;
  } else {
    out.id = null;
  }
  return out;
}

function generateTicketCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

/* ---------- Routes ---------- */

/**
 * POST /api/speakers
 * Create new speaker and respond immediately. Send confirmation email in background.
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

    // Build document (keep minimal top-level fields)
    const doc = {
      name: payload.name || payload.fullName || '',
      email: (payload.email || '').toString().trim(),
      mobile: payload.mobile || payload.phone || '',
      designation: payload.designation || '',
      company: payload.company || '',
      // normalize ticket_category for analytics consistency
      ticket_category: 'speaker',
      slots: Array.isArray(payload.slots) ? payload.slots : [],
      category: payload.category || '',
      txId: payload.txId || payload.txid || null,
      other_details: payload.other_details || payload.otherDetails || '',
      created_at: new Date(),
      registered_at: payload.registered_at ? new Date(payload.registered_at) : new Date(),
      // preserve admin flag if present; store admin_created_at as Date when applicable
      added_by_admin: !!payload.added_by_admin,
      admin_created_at: payload.added_by_admin ? new Date(payload.admin_created_at || Date.now()) : undefined,
    };

    // ticket_code: allow incoming, else generate
    doc.ticket_code = payload.ticket_code || payload.ticketCode || generateTicketCode();

    // Insert document
    col = db.collection('speakers');
    r = await col.insertOne(doc);
    const insertedId = r.insertedId ? String(r.insertedId) : null;

    // ensure ticket_code persisted
    if (doc.ticket_code && r && r.insertedId) {
      try { await col.updateOne({ _id: r.insertedId }, { $set: { ticket_code: doc.ticket_code } }); } catch (e) { /* ignore */ }
    }

    // prepare response object
    const savedDoc = await col.findOne({ _id: r.insertedId });
    const output = docToOutput(savedDoc);

    // respond immediately (do NOT include mail internals)
    res.json({
      success: true,
      insertedId,
      ticket_code: doc.ticket_code,
      saved: output,
    });

    // background: attempt to send confirmation email (fire-and-forget)
    (async () => {
      try {
        if (!isEmailLike(doc.email)) return;
        const mail = buildSpeakerAckEmail({
          name: doc.name || '',
          ticket_code: doc.ticket_code || '',
        });
        await mailer.sendMail({
          to: doc.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          from: mail.from,
        });
        console.log('[speakers] ack mail sent to', doc.email);
      } catch (e) {
        console.error('[speakers] ack mail failed:', e && (e.message || e));
        try {
          // mark email failure on the record for ops/debug
          if (r && r.insertedId) {
            await col.updateOne(
              { _id: r.insertedId },
              { $set: { email_failed: true, email_failed_at: new Date() } }
            );
          }
        } catch (upErr) {
          // ignore update errors
        }
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
 * Resend confirmation email for speaker using simple builder.
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

    const mail = buildSpeakerAckEmail({
      name: doc.name || '',
      ticket_code: doc.ticket_code || '',
    });

    try {
      await mailer.sendMail({
        to: doc.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        from: mail.from,
      });
      return res.json({ success: true });
    } catch (e) {
      console.error('[speakers] resend failed:', e && (e.message || e));
      try {
        await col.updateOne(
          { _id: oid },
          { $set: { email_failed: true, email_failed_at: new Date() } }
        );
      } catch {}
      return res.status(500).json({ success: false, error: 'Failed to resend email' });
    }
  } catch (err) {
    console.error('POST /api/speakers/:id/resend-email error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to resend email' });
  }
});

/**
 * GET /api/speakers
 * Get all speakers (limit 1000)
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
 * POST /api/speakers/:id/confirm
 * Defensive confirm endpoint - does not overwrite ticket_code unless force=true
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'Missing speaker id' });

    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    let oid;
    try { oid = new ObjectId(id); } catch { return res.status(400).json({ success: false, error: 'invalid id' }); }

    const col = db.collection('speakers');
    const existing = await col.findOne({ _id: oid });
    if (!existing) return res.status(404).json({ success: false, error: 'Speaker not found' });

    const payload = { ...(req.body || {}) };
    const force = !!payload.force;
    delete payload.force;

    // whitelist of fields allowed to update
    const whitelist = new Set(['ticket_code', 'ticket_category', 'txId', 'email', 'name', 'company', 'mobile', 'designation', 'slots', 'other_details']);

    const updateData = {};
    for (const k of Object.keys(payload || {})) {
      if (!whitelist.has(k)) continue;
      updateData[k] = payload[k];
    }

    // defensive ticket_code handling
    if ('ticket_code' in updateData) {
      const incoming = updateData.ticket_code ? String(updateData.ticket_code).trim() : '';
      const existingCode = existing.ticket_code ? String(existing.ticket_code).trim() : '';
      if (!incoming) {
        delete updateData.ticket_code;
      } else if (existingCode && !force && incoming !== existingCode) {
        // keep existing unless force true
        delete updateData.ticket_code;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, updated: docToOutput(existing), note: 'No changes applied (ticket_code protected)' });
    }

    // normalize slots
    if (updateData.slots && typeof updateData.slots === 'string') {
      try { updateData.slots = JSON.parse(updateData.slots); } catch { /* leave as-is */ }
    }

    updateData.updated_at = new Date();

    await col.updateOne({ _id: oid }, { $set: updateData });

    const after = await col.findOne({ _id: oid });
    return res.json({ success: true, updated: docToOutput(after) });
  } catch (err) {
    console.error('POST /api/speakers/:id/confirm (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to update speaker' });
  }
});

/**
 * PUT /api/speakers/:id
 * General update
 */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let oid;
    try { oid = new ObjectId(id); } catch { return res.status(400).json({ success: false, error: 'invalid id' }); }

    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    const payload = { ...(req.body || {}) };
    delete payload.id;
    delete payload.title;

    // Allowed fields - mirror DB columns you had previously
    const allowed = new Set(['name','email','mobile','designation','company','company_type','other_details','purpose','ticket_category','ticket_label','ticket_price','ticket_gst','ticket_total','slots','category','txId','ticket_code','registered_at','created_at']);

    const updateData = {};
    for (const k of Object.keys(payload)) {
      if (!allowed.has(k)) continue;
      updateData[k] = payload[k];
    }

    if ('registered_at' in updateData) {
      const v = toIsoMysqlLike(updateData.registered_at);
      if (v) updateData.registered_at = new Date(v.replace(' ', 'T'));
      else delete updateData.registered_at;
    }
    if ('created_at' in updateData) {
      const v = toIsoMysqlLike(updateData.created_at);
      if (v) updateData.created_at = new Date(v.replace(' ', 'T'));
      else delete updateData.created_at;
    }

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update.' });

    updateData.updated_at = new Date();

    // normalize slots if string
    if (updateData.slots && typeof updateData.slots === 'string') {
      try { updateData.slots = JSON.parse(updateData.slots); } catch { /* ignore */ }
    }

    const col = db.collection('speakers');
    await col.updateOne({ _id: oid }, { $set: updateData });

    return res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/speakers/:id (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to update speaker', details: err && err.message });
  }
});

/**
 * DELETE /api/speakers/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let oid;
    try { oid = new ObjectId(id); } catch { return res.status(400).json({ success: false, error: 'invalid id' }); }

    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: 'database not available' });

    const col = db.collection('speakers');
    await col.deleteOne({ _id: oid });
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/speakers/:id (mongo) error:', err && (err.stack || err));
    return res.status(500).json({ success: false, error: 'Failed to delete speaker' });
  }
});

module.exports = router;