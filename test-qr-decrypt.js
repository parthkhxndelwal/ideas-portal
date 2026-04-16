// Test QR decryption with CryptoJS
const CryptoJS = require('crypto-js');

const AES_ENCRYPTION_KEY = 'SOLESTA26SECRETKEY2026XXXX';

function decryptAES(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid AES encrypted data format');
    }

    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const encryptedHex = parts[1];
    const key = CryptoJS.enc.Utf8.parse(AES_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

    // Parse the hex encrypted data as a WordArray
    const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);

    // Decrypt using AES in CBC mode with PKCS7 padding
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('AES decryption error:', error);
    throw new Error('Failed to decrypt AES data');
  }
}

// Test with sample encrypted data
const testData = "participant_solesta_SOL26-TEST01";
console.log("Original data:", testData);

// Encrypt using Node.js crypto to simulate backend
const crypto = require('crypto');
const ALGORITHM = 'aes-256-cbc';
const iv = crypto.randomBytes(16);
const key = Buffer.from(AES_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

let encrypted = cipher.update(testData, 'utf8', 'hex');
encrypted += cipher.final('hex');

const encryptedData = iv.toString('hex') + ':' + encrypted;
console.log("Encrypted data:", encryptedData);

// Now decrypt with our CryptoJS function
try {
  const decrypted = decryptAES(encryptedData);
  console.log("Decrypted data:", decrypted);
  console.log("Success:", decrypted === testData);
} catch (error) {
  console.error("Decryption failed:", error.message);
}
