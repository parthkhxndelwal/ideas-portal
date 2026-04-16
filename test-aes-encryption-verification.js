/**
 * AES-256-CBC Encryption Verification Test
 * 
 * This test verifies that:
 * 1. Backend (solesta/lib/server/qr-generator.ts) can encrypt data using AES-256-CBC
 * 2. App (App/crypto.ts) can decrypt that data using AES-256-CBC
 * 3. Format matches: iv_hex:encrypted_hex
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const QR_ENCRYPTION_KEY = 'SOLESTA26SECRETKEY2026XXXX';

/**
 * Backend encryption function (mirrors solesta/lib/server/qr-generator.ts)
 */
function encryptQR(data) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(QR_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Backend decryption function (mirrors solesta/lib/server/qr-generator.ts)
 */
function decryptQR(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) return encryptedData;

    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(QR_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e);
    return encryptedData;
  }
}

/**
 * Parse decrypted QR data (mirrors App/crypto.ts logic)
 */
function parseQRData(decrypted) {
  if (decrypted.startsWith('volunteer_solesta_')) {
    const rollNumber = decrypted.replace('volunteer_solesta_', '');
    return {
      originalData: decrypted,
      rollNumber: rollNumber,
      transactionId: null,
      qrType: 'volunteer',
      isValid: true
    };
  } else if (decrypted.startsWith('participant_solesta_')) {
    const transactionId = decrypted.replace('participant_solesta_', '');
    return {
      originalData: decrypted,
      rollNumber: null,
      transactionId,
      qrType: 'participant',
      isValid: Boolean(transactionId)
    };
  } else {
    return {
      originalData: decrypted,
      rollNumber: null,
      transactionId: null,
      qrType: 'unknown',
      isValid: false
    };
  }
}

// Test Suite
console.log('='.repeat(60));
console.log('AES-256-CBC Encryption Verification Tests');
console.log('='.repeat(60));

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ Test ${totalTests}: ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// Test 1: Basic encryption/decryption
test('Basic AES encryption and decryption', () => {
  const originalData = 'participant_solesta_SOL26-TEST01';
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  
  if (decrypted !== originalData) {
    throw new Error(`Expected "${originalData}", got "${decrypted}"`);
  }
  if (!encrypted.includes(':')) {
    throw new Error('Encrypted data format should be "iv_hex:encrypted_hex"');
  }
});

// Test 2: Volunteer QR code
test('Volunteer QR code encryption', () => {
  const originalData = 'volunteer_solesta_2024001';
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.qrType !== 'volunteer') {
    throw new Error(`Expected qrType "volunteer", got "${parsed.qrType}"`);
  }
  if (parsed.rollNumber !== '2024001') {
    throw new Error(`Expected rollNumber "2024001", got "${parsed.rollNumber}"`);
  }
  if (!parsed.isValid) {
    throw new Error('QR data should be valid');
  }
});

// Test 3: Participant QR code
test('Participant QR code encryption', () => {
  const originalData = 'participant_solesta_SOL26-ABC123XYZ';
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.qrType !== 'participant') {
    throw new Error(`Expected qrType "participant", got "${parsed.qrType}"`);
  }
  if (parsed.transactionId !== 'SOL26-ABC123XYZ') {
    throw new Error(`Expected transactionId "SOL26-ABC123XYZ", got "${parsed.transactionId}"`);
  }
  if (!parsed.isValid) {
    throw new Error('QR data should be valid');
  }
});

// Test 4: Invalid QR data format
test('Invalid QR data format returns unknown type', () => {
  const originalData = 'invalid_data_format';
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.qrType !== 'unknown') {
    throw new Error(`Expected qrType "unknown", got "${parsed.qrType}"`);
  }
  if (parsed.isValid) {
    throw new Error('Invalid QR data should not be valid');
  }
});

// Test 5: Multiple encryptions produce different results (due to random IV)
test('Multiple encryptions produce different cipher texts', () => {
  const originalData = 'participant_solesta_SOL26-TEST02';
  const encrypted1 = encryptQR(originalData);
  const encrypted2 = encryptQR(originalData);
  
  if (encrypted1 === encrypted2) {
    throw new Error('Two encryptions of same data should produce different results due to random IV');
  }
  
  // But they should decrypt to the same value
  const decrypted1 = decryptQR(encrypted1);
  const decrypted2 = decryptQR(encrypted2);
  
  if (decrypted1 !== decrypted2) {
    throw new Error('Both encrypted values should decrypt to the same original data');
  }
});

// Test 6: Encrypted format is correct (iv_hex:encrypted_hex)
test('Encrypted data format is correct (iv_hex:encrypted_hex)', () => {
  const originalData = 'participant_solesta_SOL26-TEST03';
  const encrypted = encryptQR(originalData);
  
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Encrypted data should have exactly one colon separator');
  }
  
  const [ivHex, encryptedHex] = parts;
  
  // Check IV is 32 hex characters (16 bytes)
  if (!/^[0-9a-f]{32}$/.test(ivHex)) {
    throw new Error(`IV should be 32 hex characters, got: ${ivHex}`);
  }
  
  // Check encrypted part is hex
  if (!/^[0-9a-f]+$/.test(encryptedHex)) {
    throw new Error(`Encrypted part should be hex, got: ${encryptedHex}`);
  }
});

// Test 7: Special characters in transaction ID
test('Special characters in transaction ID', () => {
  const transactionId = 'SOL26-2024!@#$%^';
  const originalData = `participant_solesta_${transactionId}`;
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.transactionId !== transactionId) {
    throw new Error(`Expected transactionId "${transactionId}", got "${parsed.transactionId}"`);
  }
});

// Test 8: Long transaction ID
test('Long transaction ID', () => {
  const transactionId = 'SOL26-VERY-LONG-TRANSACTION-ID-WITH-MANY-CHARACTERS-123456789';
  const originalData = `participant_solesta_${transactionId}`;
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.transactionId !== transactionId) {
    throw new Error(`Transaction ID mismatch: expected length ${transactionId.length}, got ${parsed.transactionId?.length}`);
  }
});

// Test 9: Empty transaction ID
test('Empty transaction ID is invalid', () => {
  const originalData = 'participant_solesta_';
  const encrypted = encryptQR(originalData);
  const decrypted = decryptQR(encrypted);
  const parsed = parseQRData(decrypted);
  
  if (parsed.isValid) {
    throw new Error('Empty transaction ID should not be valid');
  }
});

// Test 10: Case sensitivity
test('Transaction IDs are case-sensitive', () => {
  const data1 = encryptQR('participant_solesta_SOL26-UPPERCASE');
  const data2 = encryptQR('participant_solesta_sol26-lowercase');
  
  const parsed1 = parseQRData(decryptQR(data1));
  const parsed2 = parseQRData(decryptQR(data2));
  
  if (parsed1.transactionId === parsed2.transactionId) {
    throw new Error('Transaction IDs should be case-sensitive');
  }
});

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('='.repeat(60));

if (passedTests === totalTests) {
  console.log('✓ All tests passed! AES encryption is working correctly.');
  process.exit(0);
} else {
  console.log(`✗ ${totalTests - passedTests} test(s) failed.`);
  process.exit(1);
}
