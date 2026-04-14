/**
 * QR Code generation and encryption using the same logic as the bot
 */

import crypto from "crypto"
import QRCode from "qrcode"
import config from "../config.js"

const ALGORITHM = "aes-256-cbc"

/**
 * Encrypt QR data using AES-256-CBC (same as bot)
 * Format: iv_hex:encrypted_hex
 */
export function encryptQR(data) {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(config.qrEncryptionKey.padEnd(32, "0").slice(0, 32))
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

/**
 * Decrypt QR data (for verification purposes)
 */
export function decryptQR(encryptedData) {
  try {
    const parts = encryptedData.split(":")
    if (parts.length !== 2) return encryptedData

    const iv = Buffer.from(parts[0], "hex")
    const key = Buffer.from(config.qrEncryptionKey.padEnd(32, "0").slice(0, 32))
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    let decrypted = decipher.update(parts[1], "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (e) {
    console.error("Decryption failed:", e.message)
    return encryptedData
  }
}

/**
 * Generate QR code from encrypted data
 * Returns base64 DataURL (PNG image)
 */
export async function generateQRCode(encryptedData) {
  try {
    const qrDataUrl = await QRCode.toDataURL(encryptedData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
    return qrDataUrl
  } catch (error) {
    console.error("QR code generation failed:", error)
    throw new Error(`Failed to generate QR code: ${error.message}`)
  }
}

/**
 * Generate and return QR code for a registration
 * Format: referenceId:rollNumber:referenceId (encrypted)
 */
export async function generateQRForRegistration(referenceId, rollNumber) {
  try {
    if (!referenceId) {
      throw new Error("Reference ID is required")
    }

    // Create raw data in same format as bot
    const rawData = `${referenceId}:${rollNumber || ""}:${referenceId}`

    // Encrypt the data
    const encryptedData = encryptQR(rawData)

    // Generate QR code PNG (base64 DataURL)
    const qrDataUrl = await generateQRCode(encryptedData)

    return {
      qrCode: qrDataUrl,
      encryptedData: encryptedData,
      rawData: rawData,
    }
  } catch (error) {
    console.error("QR generation error:", error)
    throw error
  }
}

export default {
  encryptQR,
  decryptQR,
  generateQRCode,
  generateQRForRegistration,
}
