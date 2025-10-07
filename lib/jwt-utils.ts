import jwt from "jsonwebtoken"

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
  } catch {
    return null
  }
}

export const verifyToken = verifyJWT