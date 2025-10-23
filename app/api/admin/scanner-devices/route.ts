import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyJWT } from "@/lib/jwt-utils"

// Verify admin authentication
async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = verifyJWT(token)

  if (!payload || payload.role !== "admin") {
    return null
  }

  // Verify user exists
  const user = await Database.findUserById(payload.userId)
  
  if (!user || user.role !== "admin") {
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    // Get all scanner devices
    const db = await Database["getDb"]()
    const devices = await db.collection("scannerDevices")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Get statistics for each device
    const devicesWithStats = await Promise.all(
      devices.map(async (device: any) => {
        const stats = await Database.getScanStatistics(device.deviceId)
        
        return {
          _id: device._id.toString(),
          deviceId: device.deviceId,
          name: device.name,
          location: device.location,
          appVersion: device.appVersion,
          isActive: device.isActive,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
          statistics: stats,
        }
      })
    )

    // Get overall statistics
    const overallStats = await Database.getScanStatistics()

    return NextResponse.json({
      devices: devicesWithStats,
      overallStatistics: overallStats,
    }, { status: 200 })
  } catch (error) {
    console.error("Error fetching scanner devices:", error)
    return NextResponse.json(
      { error: "Failed to fetch scanner devices" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId, isActive } = body

    if (!deviceId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: deviceId, isActive" },
        { status: 400 }
      )
    }

    // Update device status
    const updated = await Database.updateScannerDevice(deviceId, { isActive })

    if (!updated) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: `Device ${isActive ? 'activated' : 'deactivated'} successfully`,
      deviceId,
      isActive,
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating scanner device:", error)
    return NextResponse.json(
      { error: "Failed to update scanner device" },
      { status: 500 }
    )
  }
}
