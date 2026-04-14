import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { PrismaClient } from "@prisma/client"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from bot's directory or current directory
const botEnvPath = path.join(__dirname, "../../solesta_bot/.env")
const localEnvPath = path.join(__dirname, ".env")

dotenv.config({ path: botEnvPath })
dotenv.config({ path: localEnvPath })

export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL || "",

  // Encryption
  qrEncryptionKey:
    process.env.QR_ENCRYPTION_KEY || "SOLESTA26SECRETKEY2026XXXX",

  // Email/SMTP
  smtpHost: process.env.SMTP_HOST || "smtp.office365.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "krmuevents@krmangalam.edu.in",
  smtpPass: process.env.SMTP_PASS || "",

  // Fees
  feeKrmu: parseInt(process.env.FEE_KRMU || "500", 10),
  feeExternal: parseInt(process.env.FEE_EXTERNAL || "700", 10),

  // Test email
  testEmailAddress: process.env.TEST_EMAIL_ADDRESS || "2301350013@krmu.edu.in",

  // Script settings
  approvalScriptDir: path.join(__dirname),
  logsDir: path.join(__dirname, "logs"),
  dataDir: path.join(__dirname, "data"),

  // Fuzzy matching threshold (Levenshtein distance)
  fuzzyMatchThreshold: 2,

  // Test timeout (ms)
  testEmailTimeout: 30000,
}

// Initialize Prisma Client
export const prisma = new PrismaClient({
  errorFormat: "pretty",
})

export function validateConfig() {
  const missing = []

  if (!config.databaseUrl) missing.push("DATABASE_URL")
  if (!config.smtpUser) missing.push("SMTP_USER")
  if (!config.smtpPass) missing.push("SMTP_PASS")

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }
}

export default config
