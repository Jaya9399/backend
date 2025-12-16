/**
 * utils/registrations.js
 *
 * Revised behavior:
 * - Removed the centralized 'registrants' concept.
 * - Documents are stored in role-specific collections:
 *    visitors   -> "visitors" collection (role: "visitor")
 *    exhibitors -> "exhibitors" collection (role: "exhibitor")
 *    partners   -> "partners" collection (role: "partner")
 *    speakers   -> "speakers" collection (role: "speaker")
 *    awardees   -> "awardees" collection (role: "awardee")
 * - Unknown/other collection names are used as-is (normalized to lower-case).
 * - Idempotent upsert is performed per-collection when an email is present (filter: { email }).
 * - Each collection gets best-effort unique sparse indexes on `ticket_code` and `email`.
 * - Ticket code collisions are retried (TICK-<6 alnum>).
 *
 * Usage:
 *   const { saveRegistration, ensureIndexes } = require('./utils/registrations');
 *   await saveRegistration('visitors', form, { allowedFields, db });
 *   await ensureIndexes(db); // optional at startup (creates indexes for known role collections)
 */

const mongo = require('./mongoClient');
const { safeFieldName } = require('./mongoSchemaSync'); // reuse normalization if available

async function obtainDb() {
  if (!mongo) throw new Error('mongoClient not available');
  if (typeof mongo.getDb === 'function') {
    const maybe = mongo.getDb();
    // support both sync and Promise-returning getDb
    if (maybe && typeof maybe.then === 'function') return await maybe;
    return maybe;
  }
  if (mongo.db) return mongo.db;
  throw new Error('mongoClient has no getDb/db');
}

function singularizeRole(collName = '') {
  if (!collName) return null;
  const s = String(collName).trim().toLowerCase();
  if (!s) return null;
  if (s.endsWith('s')) return s.slice(0, -1);
  return s;
}

function normalizeCollectionName(name = '') {
  // Normalize to lower-case, trim, remove unsafe chars; prefer plural form for collections.
  if (!name) return null;
  let s = String(name).trim().toLowerCase();
  s = s.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_');
  if (!s) return s;
  // ensure plural form (simple rule: add 's' if not ending with 's')
  if (!s.endsWith('s')) s = `${s}s`;
  return s;
}

function mapTargetCollection(collectionName) {
  const knownRoles = new Set(['visitor', 'exhibitor', 'partner', 'speaker', 'awardee']);
  if (!collectionName) {
    // default to visitors
    return { target: 'visitors', role: 'visitor' };
  }
  const raw = String(collectionName).trim().toLowerCase();
  if (!raw) return { target: 'visitors', role: 'visitor' };

  // Accept singular or plural input
  const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;
  if (knownRoles.has(singular)) {
    const target = `${singular}s`; // plural collection
    return { target, role: singular };
  }

  // For other names, normalize and use as collection
  const target = normalizeCollectionName(raw) || raw;
  return { target, role: null };
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
    await col.createIndex(
      { ticket_code: 1 },
      { unique: true, sparse: true, name: 'unique_ticket_code', background: true }
    );
  } catch (err) {
    // best-effort: log, don't throw
    console.warn(`[registrations] ensureTicketCodeUniqueIndex failed for ${collectionName}:`, err && (err.message || err));
  }
}

async function ensureEmailUniqueIndex(db, collectionName = 'visitors') {
  try {
    const col = db.collection(collectionName);
    await col.createIndex(
      { email: 1 },
      { unique: true, sparse: true, name: 'unique_email_sparse', background: true }
    );
  } catch (err) {
    console.warn(`[registrations] ensureEmailUniqueIndex failed for ${collectionName}:`, err && (err.message || err));
  }
}

/* ---------------- core: saveRegistration ---------------- */
/**
 * saveRegistration(collectionName, form, options)
 * - collectionName: logical collection (visitors, exhibitors, partners, speakers, awardees, or any other)
 * - form: object with submitted fields
 * - options:
 *      { allowedFields: array } optional admin fields to whitelist (names expected un-normalized)
 *      { db }    optional Mongo Db instance (if caller has one)
 *
 * Behavior:
 * - Stores documents in the collection mapped from collectionName.
 * - If role recognized, `doc.role` will be set (singular).
 * - If email present, do idempotent upsert on { email } (per-collection).
 * - New documents get ticket_code generated (TICK-xxxxxx) and createdAt/updatedAt set.
 *
 * Returns: { insertedId, doc, existed }
 */
async function saveRegistration(collectionName, form = {}, options = {}) {
  if (!collectionName) throw new Error('collectionName required');
  const db = options.db || await obtainDb();
  if (!db) throw new Error('db not available');

  // Map logical collection name to physical collection and role
  const { target: targetCollectionName, role } = mapTargetCollection(collectionName);

  const allowedFields = Array.isArray(options.allowedFields) ? options.allowedFields : null;

  // Map form to normalized doc (reuse safeFieldName if present)
  const mapped = {};
  const raw = form || {};
  // whitelist if provided
  let whitelist = null;
  if (Array.isArray(allowedFields)) {
    whitelist = new Set(allowedFields.map(f => (f && f.name ? safeFieldName(f.name) : null)).filter(Boolean));
  }

  for (const [k, v] of Object.entries(raw)) {
    if (k === '_rawForm') continue;
    const safe = (typeof safeFieldName === 'function') ? safeFieldName(k) : String(k).trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!safe) continue;
    if (whitelist && !whitelist.has(safe)) continue;
    mapped[safe] = v === undefined ? null : v;
  }
  // nested _rawForm merge (prefer top-level)
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

  // Base doc
  const now = new Date();
  const baseDoc = { ...mapped, _rawForm: raw, updatedAt: now, createdAt: now };

  // Attach role if recognized
  if (role) baseDoc.role = role;

  const col = db.collection(targetCollectionName);

  // Ensure indexes for this target (best-effort)
  await ensureTicketCodeUniqueIndex(db, targetCollectionName);
  if (baseDoc.email) await ensureEmailUniqueIndex(db, targetCollectionName);

  // Normalize email if present in common keys
  let emailNorm = null;
  const emailCandidates = ['email', 'email_address', 'emailAddress', 'contactEmail'];
  for (const k of emailCandidates) {
    if (baseDoc[k] && typeof baseDoc[k] === 'string') {
      emailNorm = baseDoc[k].trim().toLowerCase();
      baseDoc.email = emailNorm;
      break;
    }
  }

  // If we have email -> idempotent upsert using (email) for this collection
  if (emailNorm) {
    const filter = { email: emailNorm };
    // Keep $setOnInsert to preserve createdAt, ticket_code, role, etc.
    const setOnInsertDoc = { ...baseDoc };
    // Remove updatedAt from $setOnInsert (we'll set it via $set)
    // (createdAt is kept)
    const update = { $setOnInsert: setOnInsertDoc, $set: { updatedAt: now } };

    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!setOnInsertDoc.ticket_code) setOnInsertDoc.ticket_code = generateTicketCode();
      try {
        const opts = { upsert: true, returnDocument: 'after' };
        const result = await col.findOneAndUpdate(filter, update, opts);
        const finalDoc = result && result.value ? result.value : null;
        const insertedId = finalDoc && finalDoc._id ? String(finalDoc._id) : null;
        const existed = finalDoc && finalDoc.createdAt && finalDoc.createdAt < now;
        return { insertedId, doc: finalDoc, existed: !!existed };
      } catch (err) {
        const isDup = err && (err.code === 11000 || (err.errmsg && err.errmsg.indexOf('E11000') !== -1));
        if (isDup && attempt < maxAttempts) {
          // regenerate ticket_code and retry
          setOnInsertDoc.ticket_code = generateTicketCode();
          continue;
        }
        // If duplicate and we can find existing doc, return it (best-effort)
        if (isDup) {
          try {
            const existing = await col.findOne(filter);
            if (existing) return { insertedId: existing && existing._id ? String(existing._id) : null, doc: existing, existed: true };
          } catch (e2) {}
        }
        throw err;
      }
    }
    throw new Error('Failed to upsert registration after multiple attempts');
  }

  // No email -> insert, guarding against ticket_code collisions
  const maxAttemptsNoEmail = 6;
  for (let attempt = 1; attempt <= maxAttemptsNoEmail; attempt++) {
    if (!baseDoc.ticket_code) baseDoc.ticket_code = generateTicketCode();
    try {
      const r = await col.insertOne(baseDoc);
      const stored = await col.findOne({ _id: r.insertedId });
      const insertedId = r && r.insertedId ? String(r.insertedId) : null;
      return { insertedId, doc: stored || baseDoc, existed: false };
    } catch (err) {
      const isDup = err && (err.code === 11000 || (err.errmsg && err.errmsg.indexOf('E11000') !== -1));
      if (isDup && attempt < maxAttemptsNoEmail) {
        baseDoc.ticket_code = generateTicketCode();
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to save registration after attempts');
}

/**
 * ensureIndexes(db)
 * - convenience helper to create best-effort indexes on known role collections.
 * - call once at app startup if desired.
 */
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
};