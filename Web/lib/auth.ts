import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { Database } from "./database"
import { JWTPayload, verifyJWT } from "./jwt-utils"

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateJWT(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, process.env.NEXTAUTH_SECRET!, { expiresIn: "7d" })
}

export { verifyJWT, verifyToken } from "./jwt-utils"

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateResetToken() {
  return jwt.sign({ type: "password-reset", timestamp: Date.now() }, process.env.NEXTAUTH_SECRET!, { expiresIn: "1h" })
}

export function generateTransactionId() {
  return "TXN" + Date.now() + Math.floor(Math.random() * 1000)
}

export async function authenticateUser(email: string, password: string) {
  const user = await Database.findUserByEmail(email)
  if (!user) return null

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) return null

  return user
}
