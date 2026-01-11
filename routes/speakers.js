const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const mongo = require('../utils/mongoClient');
const mailer = require('../utils/mailer'); // expects sendMail({...})

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
    // keep original _id present as well for raw usage if caller expects it
  } else {
    out.id = null;
  }
  return out;
}

function generateTicketCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
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

/* Additional endpoints (confirm/delete etc.) can be added similarly if needed */

module.exports = router;