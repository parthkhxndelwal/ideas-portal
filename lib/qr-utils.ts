/**
 * QR Code Generator Utility
 * 
 * Generates QR code payloads for participants
 * These payloads should be used in the QR codes displayed to participants
 */

import crypto from 'crypto'

export interface QRCodePayload {
  rollNumber: string
  name: string
  qrType: 'participant' | 'volunteer'
  transactionId?: string
  timestamp: string
  signature: string // HMAC signature for validation
}

/**
 * Generate a QR code payload for a participant
 */
export function generateQRPayload(
  rollNumber: string,
  name: string,
  qrType: 'participant' | 'volunteer',
  transactionId?: string
): string {
  const timestamp = new Date().toISOString()
  
  // Create signature to prevent QR code forgery
  const dataToSign = `${rollNumber}|${name}|${qrType}|${transactionId || ''}|${timestamp}`
  const signature = crypto
    .createHmac('sha256', process.env.QR_SECRET || process.env.NEXTAUTH_SECRET!)
    .update(dataToSign)
    .digest('hex')

  const payload: QRCodePayload = {
    rollNumber,
    name,
    qrType,
    transactionId,
    timestamp,
    signature,
  }

  return JSON.stringify(payload)
}

/**
 * Verify a QR code payload signature
 */
export function verifyQRPayload(payloadString: string): QRCodePayload | null {
  try {
    const payload: QRCodePayload = JSON.parse(payloadString)
    
    // Recreate signature
    const dataToSign = `${payload.rollNumber}|${payload.name}|${payload.qrType}|${payload.transactionId || ''}|${payload.timestamp}`
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QR_SECRET || process.env.NEXTAUTH_SECRET!)
      .update(dataToSign)
      .digest('hex')

    // Verify signature
    if (payload.signature !== expectedSignature) {
      console.log('QR payload signature verification failed')
      return null
    }

    return payload
  } catch (error) {
    console.error('Error verifying QR payload:', error)
    return null
  }
}

/**
 * Generate a simple QR payload without signature (for basic validation)
 * Use this only if you don't need cryptographic verification
 */
export function generateSimpleQRPayload(
  rollNumber: string,
  name: string,
  qrType: 'participant' | 'volunteer',
  transactionId?: string
): string {
  return JSON.stringify({
    rollNumber,
    name,
    qrType,
    transactionId,
  })
}

/**
 * Parse a simple QR payload
 */
export function parseSimpleQRPayload(payloadString: string): {
  rollNumber: string
  name: string
  qrType: 'participant' | 'volunteer'
  transactionId?: string
} | null {
  try {
    return JSON.parse(payloadString)
  } catch (error) {
    console.error('Error parsing QR payload:', error)
    return null
  }
}
