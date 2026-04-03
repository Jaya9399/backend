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
    
    console.log('[verifyOtpToken] ========== DEBUG ==========');
    console.log('[verifyOtpToken] Role:', role);
    console.log('[verifyOtpToken] Email:', email);
    console.log('[verifyOtpToken] Key:', key);
    console.log('[verifyOtpToken] Token provided:', token);
    
    // First, check if ANY record exists with this key
    const recordByKey = await collection.findOne({ key });
    console.log('[verifyOtpToken] Record found by key only:', recordByKey ? 'YES' : 'NO');
    if (recordByKey) {
      console.log('[verifyOtpToken] Stored token:', recordByKey.token);
      console.log('[verifyOtpToken] Token match:', recordByKey.token === token);
      console.log('[verifyOtpToken] Expires at:', recordByKey.expiresAt);
    }
    
    // Now try to find with both key and token
    const record = await collection.findOne({ key, token });
    console.log('[verifyOtpToken] Record found with both key and token:', record ? 'YES' : 'NO');
    
    if (!record) return false;
    if (record.expiresAt < new Date()) {
      console.log('[verifyOtpToken] Token expired');
      await collection.deleteMany({ key });
      return false;
    }
    
    console.log('[verifyOtpToken] Verification SUCCESS!');
    await collection.deleteMany({ key });
    return true;
  }
  module.exports = { storeOtpToken, verifyOtpToken };