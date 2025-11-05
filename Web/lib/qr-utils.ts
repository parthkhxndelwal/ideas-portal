/**
 * QR Code Generator Utility
 * 
 * Generates QR code payloads for participants
 * These payloads should be used in the QR codes displayed to participants
 */

import crypto from 'crypto'

export interface QRCodePayload {
  transactionId: string
  name: string
  qrType: 'participant' | 'volunteer'
  timestamp: string
  signature: string // HMAC signature for validation
}

/**
 * Generate a QR code payload for a participant
 * Now based on transaction ID only (roll number removed)
 */
export function generateQRPayload(
  transactionId: string,
  name: string,
  qrType: 'participant' | 'volunteer'
): string {
  const timestamp = new Date().toISOString()
  
  // Create signature to prevent QR code forgery
  const dataToSign = `${transactionId}|${name}|${qrType}|${timestamp}`
  const signature = crypto
    .createHmac('sha256', process.env.QR_SECRET || process.env.NEXTAUTH_SECRET!)
    .update(dataToSign)
    .digest('hex')

  const payload: QRCodePayload = {
    transactionId,
    name,
    qrType,
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
    const dataToSign = `${payload.transactionId}|${payload.name}|${payload.qrType}|${payload.timestamp}`
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
 * Now based on transaction ID only
 */
export function generateSimpleQRPayload(
  transactionId: string,
  name: string,
  qrType: 'participant' | 'volunteer'
): string {
  return JSON.stringify({
    transactionId,
    name,
    qrType,
  })
}

/**
 * Parse a simple QR payload
 */
export function parseSimpleQRPayload(payloadString: string): {
  transactionId: string
  name: string
  qrType: 'participant' | 'volunteer'
} | null {
  try {
    return JSON.parse(payloadString)
  } catch (error) {
    console.error('Error parsing QR payload:', error)
    return null
  }
}
