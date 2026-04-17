import CryptoJS from 'crypto-js'

// Use QR_GENERATION_KEY from environment, fallback to default
const AES_ENCRYPTION_KEY = process.env.EXPO_PUBLIC_QR_GENERATION_KEY || 'SOLESTA26SECRETKEY2026XXXX'

/**
 * Decrypt AES-256-CBC encrypted data
 * @param encryptedData - The encrypted data in format "iv_hex:encrypted_hex"
 * @returns Decrypted original text
 */
export function decryptAES(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid AES encrypted data format')
    }

    const iv = CryptoJS.enc.Hex.parse(parts[0])
    const encryptedHex = parts[1]
    const key = CryptoJS.enc.Utf8.parse(AES_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))

    // Parse the hex encrypted data as a WordArray
    const encrypted = CryptoJS.enc.Hex.parse(encryptedHex)

    // Decrypt using AES in CBC mode with PKCS7 padding
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    )

    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('AES decryption error:', error)
    throw new Error('Failed to decrypt AES data')
  }
}

/**
 * Decodes text that was encoded with the encrypt function
 * @param encodedData - The encoded string with 3-digit padded values
 * @returns Decoded original text
 */
export function decrypt(encodedData: string): string {
  try {
    // Check if length is divisible by 3
    if (encodedData.length % 3 !== 0) {
      throw new Error('Invalid encoded data format')
    }

    let decoded = ''
    // Process in chunks of 3 digits
    for (let i = 0; i < encodedData.length; i += 3) {
      const chunk = encodedData.substring(i, i + 3)
      const multiplied = parseInt(chunk, 10)
      // Divide by 4 to get original ASCII value
      const asciiValue = multiplied / 4
      decoded += String.fromCharCode(asciiValue)
    }

    return decoded
  } catch (error) {
    console.error('Decoding error:', error)
    throw new Error('Failed to decode data')
  }
}

/**
 * Decodes QR data specifically for Solesta
 * @param encodedData - The encoded QR data (either AES-encrypted or 3-digit ASCII)
 * @returns Object containing the decoded data and identifiers
 */
export function decryptQRData(encodedData: string): {
  originalData: string
  rollNumber: string | null
  transactionId: string | null
  qrType: "volunteer" | "participant" | "unknown"
  isValid: boolean
} {
  try {
    let decrypted: string | null = null

    // First, try AES-256-CBC decryption (new format)
    try {
      decrypted = decryptAES(encodedData)
    } catch (aesError) {
      // If AES fails, try 3-digit ASCII (legacy format)
      try {
        decrypted = decrypt(encodedData)
      } catch (asciiError) {
        console.warn('Both AES and ASCII decryption failed')
        return {
          originalData: '',
          rollNumber: null,
          transactionId: null,
          qrType: "unknown",
          isValid: false
        }
      }
    }

    // Validate the format
    if (decrypted.startsWith('volunteer_solesta_')) {
      const rollNumber = decrypted.replace('volunteer_solesta_', '')
      return {
        originalData: decrypted,
        rollNumber: rollNumber,
        transactionId: null,
        qrType: "volunteer",
        isValid: true
      }
    } else if (decrypted.startsWith('participant_solesta_')) {
      // New standardized format: participant_solesta_${transactionId}
      // Transaction ID is now the only identifier (rollNumber is fetched from database)
      const transactionId = decrypted.replace('participant_solesta_', '')

      return {
        originalData: decrypted,
        rollNumber: null, // Roll number is no longer in QR code
        transactionId,
        qrType: "participant",
        isValid: Boolean(transactionId)
      }
    } else if (decrypted.includes(':')) {
      // Approval script format: referenceId:rollNumber:referenceId
      const parts = decrypted.split(':')
      if (parts.length === 3) {
        const referenceId = parts[0]
        const rollNumber = parts[1]

        return {
          originalData: decrypted,
          rollNumber: rollNumber || null,
          transactionId: referenceId, // Use referenceId as transactionId
          qrType: "participant",
          isValid: Boolean(referenceId)
        }
      }
    }

    return {
      originalData: decrypted,
      rollNumber: null,
      transactionId: null,
      qrType: "unknown",
      isValid: false
    }
  } catch (_error) {
    return {
      originalData: '',
      rollNumber: null,
      transactionId: null,
      qrType: "unknown",
      isValid: false
    }
  }
}