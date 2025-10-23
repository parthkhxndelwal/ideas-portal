import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { generateJWT } from "@/lib/auth"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, location, appVersion } = body

    // Validate required fields
    if (!name || !location || !appVersion) {
      return NextResponse.json(
        { error: "Missing required fields: name, location, appVersion" },
        { status: 400 }
      )
    }

    // Generate unique device ID
    const deviceId = `DEVICE_${crypto.randomBytes(16).toString("hex")}`
    
    // Generate secure token using JWT
    const token = generateJWT(deviceId, `${deviceId}@scanner`, "scanner")

    // Create device record
    const device = await Database.createScannerDevice({
      deviceId,
      name,
      location,
      appVersion,
      token,
      isActive: true,
    })

    // Configuration parameters
    const config = {
      deviceId,
      token,
      syncIntervalSeconds: 300, // 5 minutes
      maxBatchSize: 100,
    }

    return NextResponse.json(config, { status: 200 })
  } catch (error) {
    console.error("Error registering device:", error)
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    )
  }
}
