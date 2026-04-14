import crypto from "crypto"
import QRCode from "qrcode"

const ALGORITHM = "aes-256-cbc"
const QR_ENCRYPTION_KEY =
  process.env.QR_ENCRYPTION_KEY || "SOLESTA26SECRETKEY2026XXXX"

/**
 * Encrypt QR data using AES-256-CBC (same as approval_script)
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
 * Generate QR code from encrypted data
 * Returns base64 DataURL (PNG image)
 */
export async function generateQRCode(encryptedData: string): Promise<string> {
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
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Generate and return QR code for a registration
 * Format: referenceId:rollNumber:referenceId (encrypted)
 */
export async function generateQRForRegistration(
  referenceId: string,
  rollNumber: string = ""
): Promise<{
  qrCode: string
  encryptedData: string
  rawData: string
}> {
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
