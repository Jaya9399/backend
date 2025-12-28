/**
 * utils/registrations.js
 *
 * Role-specific upserts and ticket generation + email helpers.
 *
 * NOTE: this file provides helpers. You still need to wire an Express route
 * to call generateTicketForId/sendTicketEmail (example route file provided).
 */

const mongo = require('./mongoClient'); // your existing mongo client
const { safeFieldName } = require('./mongoSchemaSync') || {}; // reuse normalization if present
const { ObjectId } = require('mongodb');

async function obtainDb() {
  if (!mongo) throw new Error('mongoClient not available');
  if (typeof mongo.getDb === 'function') {
    const maybe = mongo.getDb();
    if (maybe && typeof maybe.then === 'function') return await maybe;
    return maybe;
  }
  if (mongo.db) return mongo.db;
  throw new Error('mongoClient has no getDb/db');
}

function normalizeCollectionName(name = '') {
  if (!name) return null;
  let s = String(name).trim().toLowerCase();
  s = s.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_');
  if (!s.endsWith('s')) s = `${s}s`;
  return s;
}

function mapTargetCollection(collectionName) {
  const knownRoles = new Set(['visitor', 'exhibitor', 'partner', 'speaker', 'awardee']);
  if (!collectionName) return { target: 'visitors', role: 'visitor' };
  const raw = String(collectionName).trim().toLowerCase();
  if (!raw) return { target: 'visitors', role: 'visitor' };
  const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;
  if (knownRoles.has(singular)) {
    return { target: `${singular}s`, role: singular };
  }
  return { target: normalizeCollectionName(raw) || raw, role: null };
}

/* ---------------- utilities ---------------- */

function generateTicketCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TICK-${code}`;
}

async function ensureTicketCodeUniqueIndex(db, collectionName = 'visitors') {
  try {
    const col = db.collection(collectionName);
    await col.createIndex({ ticket_code: 1 }, { unique: true, sparse: true, name: 'unique_ticket_code', background: true });
  } catch (err) {
    console.warn(`[registrations] ensureTicketCodeUniqueIndex failed for ${collectionName}:`, err && (err.message || err));
  }
}
async function ensureEmailUniqueIndex(db, collectionName = 'visitors') {
  try {
    const col = db.collection(collectionName);
    await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'unique_email_sparse', background: true });
  } catch (err) {
    console.warn(`[registrations] ensureEmailUniqueIndex failed for ${collectionName}:`, err && (err.message || err));
  }
}

function normalizeTicketCodeValue(val) {
  if (val === undefined || val === null) return null;
  return String(val).trim();
}

function isDigitsOnly(s) {
  return typeof s === 'string' && /^\d+$/.test(s);
}

/* ---------------- core: saveRegistration (unchanged except returns doc) ---------------- */

async function saveRegistration(collectionName, form = {}, options = {}) {
  if (!collectionName) throw new Error('collectionName required');
  const db = options.db || await obtainDb();
  if (!db) throw new Error('db not available');

  const { target: targetCollectionName, role } = mapTargetCollection(collectionName);

  if (process.env.DEBUG_REGISTRATIONS === 'true') {
    console.log(`[registrations] saveRegistration: requested='${collectionName}' -> target='${targetCollectionName}' role='${role}'`);
  }

  const allowedFields = Array.isArray(options.allowedFields) ? options.allowedFields : null;
  const mapped = {};
  const raw = form || {};
  let whitelist = null;
  if (Array.isArray(allowedFields)) {
    whitelist = new Set(allowedFields.map(f => (f && f.name ? safeFieldName(f.name) : null)).filter(Boolean));
  }

  for (const [k, v] of Object.entries(raw)) {
    if (k === '_rawForm') continue;
    const safe = (typeof safeFieldName === 'function')
      ? safeFieldName(k)
      : String(k).trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!safe) continue;
    if (whitelist && !whitelist.has(safe)) continue;
    mapped[safe] = v === undefined ? null : v;
  }

  if (raw._rawForm && typeof raw._rawForm === 'object') {
    for (const [k, v] of Object.entries(raw._rawForm || {})) {
      const safe = (typeof safeFieldName === 'function') ? safeFieldName(k) : String(k).trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (!safe) continue;
      if (mapped[safe] === undefined) {
        if (whitelist && !whitelist.has(safe)) continue;
        mapped[safe] = v === undefined ? null : v;
      }
    }
  }

  const now = new Date();
  const baseDoc = { ...mapped, _rawForm: raw, updatedAt: now, createdAt: now };

  if (role) baseDoc.role = role;

  // If client provided ticket_code in the form, normalize it to string
  if (baseDoc.ticket_code !== undefined && baseDoc.ticket_code !== null) {
    baseDoc.ticket_code = normalizeTicketCodeValue(baseDoc.ticket_code);
    if (isDigitsOnly(baseDoc.ticket_code)) baseDoc.ticket_code_num = Number(baseDoc.ticket_code);
  }

  const col = db.collection(targetCollectionName);

  await ensureTicketCodeUniqueIndex(db, targetCollectionName);
  if (baseDoc.email) await ensureEmailUniqueIndex(db, targetCollectionName);

  // normalize email
  let emailNorm = null;
  const emailCandidates = ['email', 'email_address', 'emailAddress', 'contactEmail'];
  for (const k of emailCandidates) {
    if (baseDoc[k] && typeof baseDoc[k] === 'string') {
      emailNorm = baseDoc[k].trim().toLowerCase();
      baseDoc.email = emailNorm;
      break;
    }
  }

  // Upsert by email within the target collection if email present
  if (emailNorm) {
    const filter = { email: emailNorm };
    const setOnInsertDoc = { ...baseDoc };
    // Ensure ticket_code normalized on setOnInsert
    if (setOnInsertDoc.ticket_code !== undefined && setOnInsertDoc.ticket_code !== null) {
      setOnInsertDoc.ticket_code = normalizeTicketCodeValue(setOnInsertDoc.ticket_code);
      if (isDigitsOnly(setOnInsertDoc.ticket_code)) setOnInsertDoc.ticket_code_num = Number(setOnInsertDoc.ticket_code);
    } else {
      setOnInsertDoc.ticket_code = normalizeTicketCodeValue(generateTicketCode());
      if (isDigitsOnly(setOnInsertDoc.ticket_code)) setOnInsertDoc.ticket_code_num = Number(setOnInsertDoc.ticket_code);
    }

    const update = { $setOnInsert: setOnInsertDoc, $set: { updatedAt: now } };

    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!setOnInsertDoc.ticket_code) setOnInsertDoc.ticket_code = normalizeTicketCodeValue(generateTicketCode());
      try {
        const opts = { upsert: true, returnDocument: 'after' };
        const result = await col.findOneAndUpdate(filter, update, opts);
        const finalDoc = result && result.value ? result.value : null;
        const insertedId = finalDoc && finalDoc._id ? String(finalDoc._id) : null;
        const existed = finalDoc && finalDoc.createdAt && finalDoc.createdAt < now;
        if (process.env.DEBUG_REGISTRATIONS === 'true') {
          console.log(`[registrations] upsert result -> collection=${targetCollectionName} id=${insertedId} ticket_code=${finalDoc && finalDoc.ticket_code}`);
        }
        return { insertedId, doc: finalDoc, existed: !!existed };
      } catch (err) {
        const isDup = err && (err.code === 11000 || (err.errmsg && err.errmsg.indexOf('E11000') !== -1));
        if (isDup && attempt < maxAttempts) {
          setOnInsertDoc.ticket_code = normalizeTicketCodeValue(generateTicketCode());
          if (isDigitsOnly(setOnInsertDoc.ticket_code)) setOnInsertDoc.ticket_code_num = Number(setOnInsertDoc.ticket_code);
          continue;
        }
        if (isDup) {
          try {
            const existing = await col.findOne(filter);
            if (existing) {
              if (process.env.DEBUG_REGISTRATIONS === 'true') {
                console.log(`[registrations] duplicate collision -> returning existing id=${existing._id} ticket_code=${existing.ticket_code}`);
              }
              return { insertedId: existing && existing._id ? String(existing._id) : null, doc: existing, existed: true };
            }
          } catch (e2) {}
        }
        throw err;
      }
    }
    throw new Error('Failed to upsert registration after multiple attempts');
  }

  // No email => insert
  const maxAttemptsNoEmail = 6;
  for (let attempt = 1; attempt <= maxAttemptsNoEmail; attempt++) {
    if (!baseDoc.ticket_code) baseDoc.ticket_code = normalizeTicketCodeValue(generateTicketCode());
    if (isDigitsOnly(baseDoc.ticket_code)) baseDoc.ticket_code_num = Number(baseDoc.ticket_code);
    try {
      const r = await col.insertOne(baseDoc);
      const stored = await col.findOne({ _id: r.insertedId });
      const insertedId = r && r.insertedId ? String(r.insertedId) : null;
      if (process.env.DEBUG_REGISTRATIONS === 'true') {
        console.log(`[registrations] inserted -> collection=${targetCollectionName} id=${insertedId} ticket_code=${stored && stored.ticket_code}`);
      }
      return { insertedId, doc: stored || baseDoc, existed: false };
    } catch (err) {
      const isDup = err && (err.code === 11000 || (err.errmsg && err.errmsg.indexOf('E11000') !== -1));
      if (isDup && attempt < maxAttemptsNoEmail) {
        baseDoc.ticket_code = normalizeTicketCodeValue(generateTicketCode());
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to save registration after attempts');
}

/* ---------------- ticket generation and email helpers ---------------- */

/**
 * Ensure a ticket_code exists for a document and persist it.
 * Returns the updated document (or null if not found).
 *
 * - collectionName can be 'visitors' or other plural collection name.
 */
async function generateTicketForId(collectionName, id, options = {}) {
  const db = options.db || await obtainDb();
  if (!db) throw new Error('db not available');
  const coll = db.collection(collectionName);
  let oid;
  try {
    oid = typeof id === 'string' && ObjectId.isValid(id) ? ObjectId(id) : id;
  } catch (e) {
    oid = id;
  }
  const doc = await coll.findOne({ _id: oid });
  if (!doc) return null;

  if (doc.ticket_code) {
    // already has a ticket
    return doc;
  }

  // try to set a unique ticket_code with retries
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ticket = normalizeTicketCodeValue(generateTicketCode());
    try {
      const updateRes = await coll.findOneAndUpdate(
        { _id: doc._id, $or: [{ ticket_code: { $exists: false } }, { ticket_code: null }] },
        { $set: { ticket_code: ticket, ticket_code_generated_at: new Date() } },
        { returnDocument: 'after' }
      );
      if (updateRes && updateRes.value) {
        return updateRes.value;
      }
      // If no value returned, document already had ticket_code set by another process - read it
      const fresh = await coll.findOne({ _id: doc._id });
      if (fresh) return fresh;
    } catch (err) {
      const isDup = err && (err.code === 11000 || (err.errmsg && err.errmsg.indexOf('E11000') !== -1));
      if (isDup && attempt < maxAttempts) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate unique ticket code');
}

/**
 * Send ticket email (requires a mailer implementation).
 * mailer must expose sendMail({ to, subject, html, text })
 *
 * Returns mailer result or throws.
 */
async function sendTicketEmail(doc, options = {}) {
  const mailer = options.mailer || null;
  if (!doc) throw new Error('document required');
  if (!doc.email) throw new Error('no email to send to');

  const ticket = doc.ticket_code || '';
  const subject = options.subject || 'Your event ticket';
  const html = options.html || `<p>Hi ${doc.name || ''},</p><p>Your ticket code is <strong>${ticket}</strong></p>`;
  const text = options.text || `Hello ${doc.name || ''}\nYour ticket code is: ${ticket}`;

  if (!mailer || typeof mailer.sendMail !== 'function') {
    // No mailer wired — log and return a noop result for now
    console.warn('[registrations] sendTicketEmail: no mailer configured, skipping send. Payload:', { to: doc.email, subject, ticket });
    return { ok: false, skipped: true };
  }

  // mailer.sendMail should return a promise
  const result = await mailer.sendMail({ to: doc.email, subject, html, text });
  return result;
}

/* ---------------- ensure indexes utility ---------------- */

async function ensureIndexes(dbArg) {
  const db = dbArg || await obtainDb();
  try {
    const knownCollections = ['visitors', 'exhibitors', 'partners', 'speakers', 'awardees'];
    for (const coll of knownCollections) {
      await ensureTicketCodeUniqueIndex(db, coll);
      await ensureEmailUniqueIndex(db, coll);
    }
  } catch (e) {
    console.warn('ensureIndexes error', e && e.message);
  }
}

module.exports = {
  saveRegistration,
  mapTargetCollection,
  ensureEmailUniqueIndex,
  ensureTicketCodeUniqueIndex,
  generateTicketCode,
  ensureIndexes,
  generateTicketForId,
  sendTicketEmail,
};