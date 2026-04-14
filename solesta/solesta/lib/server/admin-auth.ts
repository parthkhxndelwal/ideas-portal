import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
)

const ALGORITHM = "HS256"
const ISSUER = "solesta-admin"

export interface AdminSession {
  adminId: string
  username: string
  iat: number
  exp: number
}

export async function createAdminSession(adminId: string, username: string) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const token = await new SignJWT({
    adminId,
    username,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer(ISSUER)
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    path: "/",
  })

  return token
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value

  if (!token) {
    return null
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as unknown as AdminSession
  } catch (error) {
    console.error("Session verification failed:", error)
    return null
  }
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    throw new Error("Unauthorized: No admin session")
  }
  return session
}
