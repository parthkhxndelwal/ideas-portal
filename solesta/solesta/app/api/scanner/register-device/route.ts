import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { validateScannerApiKey } from "@/lib/server/scanner-auth"
import { withCors } from "@/lib/server/cors"

/**
 * Device registration endpoint for scanner application
 * Allows scanner devices to register themselves and receive a device token
 */
export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    // Validate API key
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || !await validateScannerApiKey(apiKey)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId, deviceName } = body

    // Validate required fields
    if (!deviceId || !deviceName) {
      return NextResponse.json(
        { error: "Missing required fields: deviceId, deviceName" },
        { status: 400 }
      )
    }

    // For now, we'll just return a success response
    // In the future, you might want to:
    // - Store device registration in a Device model
    // - Track device scans
    // - Manage device tokens
    
    return NextResponse.json({
      success: true,
      message: "Device registered successfully",
      device: {
        deviceId,
        deviceName,
        registeredAt: new Date().toISOString(),
      },
    })
  })
}
