import { NextRequest } from "next/server"
import { Database } from "@/lib/database"
import { verifyJWT } from "@/lib/jwt-utils"

/**
 * Authentication middleware for scanner devices
 * Validates JWT token and checks device status
 */
export async function authenticateScannerDevice(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = verifyJWT(token)

  if (!payload || payload.role !== "scanner") {
    return null
  }

  // Verify device exists and is active
  const device = await Database.findScannerDeviceByToken(token)
  
  if (!device || !device.isActive) {
    return null
  }

  return device
}

/**
 * Response helper for unauthorized requests
 */
export function unauthorizedResponse() {
  return {
    error: "Unauthorized - Invalid or inactive device token",
    status: 401,
  }
}
