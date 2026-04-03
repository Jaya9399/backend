async function storeOtpToken(db, role, email, token, expiresInMs = 5 * 60 * 1000) {
    const collection = db.collection('otp_verifications');
    const key = `${role}::${email.toLowerCase()}`;
    
    // Delete old tokens
    await collection.deleteMany({ key });
    
    // Insert new token
    await collection.insertOne({
      key,
      token,
      role,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + expiresInMs),
      createdAt: new Date()
    });
    
    return true;
  }
  
  async function verifyOtpToken(db, role, email, token) {
    const collection = db.collection('otp_verifications');
    const key = `${role}::${email.toLowerCase()}`;
    
    const record = await collection.findOne({ key, token });
    
    if (!record) return false;
    if (record.expiresAt < new Date()) {
      await collection.deleteMany({ key });
      return false;
    }
    
    // Single-use: delete after verification
    await collection.deleteMany({ key });
    return true;
  }
  
  module.exports = { storeOtpToken, verifyOtpToken };