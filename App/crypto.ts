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
 * Decodes QR data specifically for IDEAS 3.0
 * @param encodedData - The encoded QR data
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
    const decrypted = decrypt(encodedData)

    // Validate the format
    if (decrypted.startsWith('volunteer_ideas3.0_')) {
      const rollNumber = decrypted.replace('volunteer_ideas3.0_', '')
      return {
        originalData: decrypted,
        rollNumber: rollNumber,
        transactionId: null,
        qrType: "volunteer",
        isValid: true
      }
    } else if (decrypted.startsWith('participant_ideas3.0_')) {
      // New standardized format: participant_ideas3.0_${transactionId}
      // Transaction ID is now the only identifier (rollNumber is fetched from database)
      const transactionId = decrypted.replace('participant_ideas3.0_', '')

      return {
        originalData: decrypted,
        rollNumber: null, // Roll number is no longer in QR code
        transactionId,
        qrType: "participant",
        isValid: Boolean(transactionId)
      }
    } else {
      return {
        originalData: decrypted,
        rollNumber: null,
        transactionId: null,
        qrType: "unknown",
        isValid: false
      }
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