import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

// Use a strong encryption key - should be stored in environment variable
const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'EncryptedIDEAS'
const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypts text using AES-256-GCM encryption
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64 encoded)
 */
export async function encrypt(text: string): Promise<string> {
  try {
    // Generate a random initialization vector
    const iv = randomBytes(16)
    
    // Derive key from the secret
    const key = await scryptAsync(ENCRYPTION_KEY, 'salt', 32) as Buffer
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag()
    
    // Combine iv, authTag, and encrypted data
    const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
    
    return result
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypts text that was encrypted with the encrypt function
 * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted original text
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    // Split the encrypted data
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const [ivBase64, authTagBase64, encrypted] = parts
    
    // Convert from base64
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')
    
    // Derive key from the secret
    const key = await scryptAsync(ENCRYPTION_KEY, 'salt', 32) as Buffer
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Encrypts volunteer QR data specifically
 * @param rollNumber - The volunteer's roll number
 * @returns Encrypted QR data string
 */
export async function encryptVolunteerQRData(rollNumber: string): Promise<string> {
  const qrData = `volunteer_ideas3.0_${rollNumber}`
  return await encrypt(qrData)
}

/**
 * Decrypts volunteer QR data specifically
 * @param encryptedData - The encrypted QR data
 * @returns Object containing the decrypted data and roll number
 */
export async function decryptVolunteerQRData(encryptedData: string): Promise<{
  originalData: string
  rollNumber: string | null
  transactionId: string | null
  qrType: "volunteer" | "participant" | "unknown"
  isValid: boolean
}> {
  try {
    const decrypted = await decrypt(encryptedData)
    
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
      const remainder = decrypted.replace('participant_ideas3.0_', '')
      const separatorIndex = remainder.indexOf('_')

      if (separatorIndex === -1) {
        return {
          originalData: decrypted,
          rollNumber: null,
          transactionId: null,
          qrType: "unknown",
          isValid: false
        }
      }

      const rollNumber = remainder.slice(0, separatorIndex)
      const transactionId = remainder.slice(separatorIndex + 1)

      return {
        originalData: decrypted,
        rollNumber,
        transactionId,
        qrType: "participant",
        isValid: Boolean(rollNumber && transactionId)
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