import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { deviceId, deviceName } = await request.json()

    // Validate required fields
    if (!deviceId || !deviceName) {
      const response = NextResponse.json({
        error: "Device ID and name are required",
        success: false
      }, { status: 400 })

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return response
    }

    // Check if device already exists
    const existingDevice = await Database.findScannerDevice(deviceId)
    if (existingDevice) {
      // Update device name if changed
      if (existingDevice.name !== deviceName) {
        await Database.updateScannerDevice(deviceId, { name: deviceName })
      }

      const response = NextResponse.json({
        success: true,
        message: "Device already registered",
        device: existingDevice
      })

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return response
    }

    // Create new device
    const deviceData = {
      deviceId,
      name: deviceName,
      location: "Mobile Scanner", // Default location
      appVersion: "1.0.0", // Could be passed from client
      token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate a token
      isActive: true,
    }

    const createdDevice = await Database.createScannerDevice(deviceData)

    const response = NextResponse.json({
      success: true,
      message: "Device registered successfully",
      device: {
        deviceId: createdDevice.deviceId,
        name: createdDevice.name,
        isActive: createdDevice.isActive,
        token: createdDevice.token,
      }
    })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error("Device registration error:", error)
    const response = NextResponse.json({
      error: "Internal server error",
      success: false
    }, { status: 500 })

    // Add CORS headers for error responses too
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}