import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { authenticateScannerDevice } from "../middleware"

export async function GET(request: NextRequest) {
  try {
    // Authenticate device
    const device = await authenticateScannerDevice(request)
    
    if (!device) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or inactive device token" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sinceParam = searchParams.get("since")

    if (!sinceParam) {
      return NextResponse.json(
        { error: "Missing required parameter: since" },
        { status: 400 }
      )
    }

    const since = new Date(sinceParam)

    // Validate date
    if (isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for 'since' parameter" },
        { status: 400 }
      )
    }

    // Get entry updates from other devices
    const entryUpdates = await Database.getEntryUpdates(since, device.deviceId)

    // Transform updates to lightweight format
    const transformedUpdates = entryUpdates.map((entry: any) => ({
      rollNumber: entry.rollNumber,
      lastSeen: entry.entryTimestamp.toISOString(),
      sourceDeviceId: entry.scannedBy,
    }))

    const lastSyncAt = new Date().toISOString()

    return NextResponse.json({
      lastSyncAt,
      entryUpdates: transformedUpdates,
    }, { status: 200 })
  } catch (error) {
    console.error("Error fetching updates:", error)
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    )
  }
}
