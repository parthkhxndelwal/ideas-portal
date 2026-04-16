import crypto from "crypto"
import QRCode from "qrcode"

const ALGORITHM = "aes-256-cbc"
const QR_ENCRYPTION_KEY =
  process.env.QR_ENCRYPTION_KEY || "SOLESTA26SECRETKEY2026XXXX"

/**
 * Encrypt QR data using AES-256-CBC
 * Format: iv_hex:encrypted_hex
 */
export function encryptQR(data: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(QR_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

/**
 * Decrypt QR data (for verification purposes)
 */
export function decryptQR(encryptedData: string): string {
  try {
    const parts = encryptedData.split(":")
    if (parts.length !== 2) return encryptedData

    const iv = Buffer.from(parts[0], "hex")
    const key = Buffer.from(QR_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    let decrypted = decipher.update(parts[1], "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (e) {
    console.error("Decryption failed:", e)
    return encryptedData
  }
}

/**
 * Generate QR code from encoded data
 * Returns base64 DataURL (PNG image)
 */
export async function generateQRCode(encodedData: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(encodedData, {
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
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Generate and return QR code for a registration
 * 
 * Uses AES-256-CBC encryption compatible with the Scanner App (App/crypto.ts)
 * 
 * Format:
 * - For participants: "participant_solesta_${referenceId}" (AES-256-CBC encrypted)
 * - For volunteers: "volunteer_solesta_${rollNumber}" (AES-256-CBC encrypted)
 * - Encrypted format: "iv_hex:encrypted_hex"
 * 
 * Example:
 * - Input: referenceId="SOL26-TEST01"
 * - Raw data: "participant_solesta_SOL26-TEST01"
 * - Encrypted: "a1b2c3d4e5f6g7h8:encrypted_data_in_hex"
 * - QR Code: PNG image of encrypted data
 * 
 * The Scanner App will:
 * 1. Scan the QR code
 * 2. Read the encrypted data (iv_hex:encrypted_hex)
 * 3. Use crypto.ts decryptQRData() with AES decryption to get: "participant_solesta_SOL26-TEST01"
 * 4. Parse to extract transactionId: "SOL26-TEST01"
 * 5. Validate against cached registrations
 */
export async function generateQRForRegistration(
  referenceId: string,
  rollNumber: string = ""
): Promise<{
  qrCode: string
  encodedData: string
  rawData: string
}> {
  try {
    if (!referenceId) {
      throw new Error("Reference ID is required")
    }

    // Create raw data in format expected by app (crypto.ts decryptQRData)
    const rawData = `participant_solesta_${referenceId}`

    // Encrypt using AES-256-CBC (matches App/crypto.ts decryptQRData logic)
    const encodedData = encryptQR(rawData)

    // Generate QR code PNG (base64 DataURL)
    const qrDataUrl = await generateQRCode(encodedData)

    return {
      qrCode: qrDataUrl,
      encodedData: encodedData,
      rawData: rawData,
    }
  } catch (error) {
    console.error("QR generation error:", error)
    throw error
  }
}
