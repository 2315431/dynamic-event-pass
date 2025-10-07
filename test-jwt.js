// Test JWT functionality with the generated keys
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Read the keys
const privateKey = fs.readFileSync('./private.pem', 'utf8');
const publicKey = fs.readFileSync('./public.pem', 'utf8');

console.log('🧪 Testing JWT functionality...\n');

try {
  // Test payload
  const payload = {
    ticketId: 'TKT-TEST-001',
    eventName: 'Test Event',
    buyerName: 'Test User',
    buyerEmail: 'test@example.com',
    seatInfo: 'A1',
    category: 'VIP',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    backupPinHash: '$2a$10$test.hash.here',
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 86400000).toISOString(), // 1 day
    issuedAt: new Date().toISOString()
  };

  // Sign JWT
  console.log('1. Signing JWT with RS256...');
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    issuer: 'dep-platform',
    audience: 'dep-validator',
    expiresIn: '1d'
  });
  console.log('✅ JWT signed successfully');
  console.log(`Token length: ${token.length} characters\n`);

  // Verify JWT
  console.log('2. Verifying JWT with public key...');
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'dep-platform',
    audience: 'dep-validator'
  });
  console.log('✅ JWT verified successfully');
  console.log(`Decoded ticket ID: ${decoded.ticketId}\n`);

  // Test with jose library (for browser compatibility)
  console.log('3. Testing with jose library...');
  const { importSPKI, jwtVerify } = await import('jose');
  
  const josePublicKey = await importSPKI(publicKey, 'RS256');
  const { payload: joseDecoded } = await jwtVerify(token, josePublicKey, {
    issuer: 'dep-platform',
    audience: 'dep-validator'
  });
  console.log('✅ JWT verified with jose library');
  console.log(`Jose decoded ticket ID: ${joseDecoded.ticketId}\n`);

  console.log('🎉 All JWT tests passed! The system should work correctly.');

} catch (error) {
  console.error('❌ JWT test failed:', error.message);
  process.exit(1);
}