import crypto from "crypto"

const QR_ENCRYPTION_KEY =
  process.env.QR_ENCRYPTION_KEY || "SOLESTA26SECRETKEY2026XXXX"
const ALGORITHM = "aes-256-cbc"

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = QR_ENCRYPTION_KEY
    crypto.pbkdf2(code, salt, 100000, 32, "sha256", (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey.toString("hex"))
    })
  })
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  const codeHash = await hashCode(code)
  return crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hash))
}

export function generateReferenceId(existing: string[]): string {
  const uuid = crypto.randomUUID().replace(/-/g, "").toUpperCase()
  const short = uuid.slice(0, 5)
  const id = `SOL26-${short}`

  if (existing.includes(id)) {
    return generateReferenceId(existing)
  }
  return id
}

export function isReferenceIdUnique(existing: string[]): () => string {
  return () => generateReferenceId(existing)
}

export function encryptQR(data: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(QR_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

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
  } catch {
    return encryptedData
  }
}
