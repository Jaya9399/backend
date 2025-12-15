const { MongoClient } = require("mongodb");

let _client = null;
let _db = null;

async function connect(uri, dbName, opts = {}) {
  if (_client && _db) return { client: _client, db: _db };

  if (!uri) throw new Error("Mongo URI is required");
  if (!dbName) throw new Error("Mongo DB name is required");

  const defaultOpts = {
    // Modern driver automatically uses new parser and topology
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    appName: "RailTransExpoApp",
    ...opts,
  };

  _client = new MongoClient(uri, defaultOpts);

  try {
    await _client.connect();
    _db = _client.db(dbName);
    console.log(`✅ Connected to MongoDB: ${uri}, DB: ${dbName}`);
    return { client: _client, db: _db };
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
}

function getDb() {
  if (!_db)
    throw new Error("MongoDB not connected. Call connect(uri, dbName) first.");
  return _db;
}

function getCollection(name) {
  return getDb().collection(name);
}

function isConnected() {
  return !!(_client && _client.topology && _client.topology.isConnected && _client.topology.isConnected());
}

async function getNextSequence(sequenceName) {
  if (!sequenceName) throw new Error("sequenceName is required");
  const col = getCollection("counters");
  const r = await col.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return r.value.seq;
}

async function resetSequence(sequenceName, value) {
  if (!sequenceName) throw new Error("sequenceName is required");
  const col = getCollection("counters");
  await col.updateOne(
    { _id: sequenceName },
    { $set: { seq: Number(value) } },
    { upsert: true }
  );
  return { ok: true, sequence: sequenceName, seq: Number(value) };
}

async function close() {
  try {
    if (_client) await _client.close(true);
  } finally {
    _client = null;
    _db = null;
  }
}

module.exports = {
  connect,
  getDb,
  getCollection,
  getNextSequence,
  resetSequence,
  isConnected,
  close,
};
