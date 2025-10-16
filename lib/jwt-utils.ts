import jwt from "jsonwebtoken"

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!) as JWTPayload
  } catch {
    return null
  }
}

export const verifyToken = verifyJWT