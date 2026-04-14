import dotenv from "dotenv"

dotenv.config()

export interface Config {
  databaseUrl: string
  adminTelegramIds: string[]
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  appUrl: string
  ticketAppUrl: string
  paymentLinkInternal: string
  paymentLinkExternal: string
  feeKrmu: number
  feeExternal: number
  otpExpiryMinutes: number
  otpMaxRetries: number
  nodeEnv: string
  enableExternalRegistration: boolean
}

function parseAdminIds(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || "",
  adminTelegramIds: parseAdminIds(process.env.ADMIN_TELEGRAM_IDS),
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  appUrl: process.env.APP_URL || "",
  ticketAppUrl:
    process.env.TICKET_APP_URL || "https://solesta.krmangalam.edu.in",
  paymentLinkInternal:
    process.env.PAYMENT_LINK_INTERNAL || "https://p.ppsl.io/PYTMPS/Ro1Qfk",
  paymentLinkExternal:
    process.env.PAYMENT_LINK_EXTERNAL || "https://p.ppsl.io/PYTMPS/UYrQfk",
  feeKrmu: parseInt(process.env.FEE_KRMU || "500", 10),
  feeExternal: parseInt(process.env.FEE_EXTERNAL || "700", 10),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10),
  otpMaxRetries: parseInt(process.env.OTP_MAX_RETRIES || "3", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  enableExternalRegistration:
    process.env.ENABLE_EXTERNAL_REGISTRATION !== "false",
}

export function validateConfig(): void {
  const missing: string[] = []

  if (!config.databaseUrl) missing.push("DATABASE_URL")
  if (!config.smtpUser) missing.push("SMTP_USER")
  if (!config.smtpPass) missing.push("SMTP_PASS")

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }
}
