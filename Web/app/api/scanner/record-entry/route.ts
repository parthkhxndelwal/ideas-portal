import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { decryptVolunteerQRData } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  try {
    const {
      transactionId,
      rollNumber,
      name,
      qrType,
      deviceId,
      deviceName,
    } = await request.json()

    // Validate required fields
    if (!transactionId || !rollNumber || !qrType || !deviceId || !deviceName) {
      const response = NextResponse.json({
        error: "Missing required fields",
        success: false
      }, { status: 400 })

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return response
    }

    // Verify device exists and is active
    const device = await Database.findScannerDevice(deviceId)
    if (!device || !device.isActive) {
      const response = NextResponse.json({
        error: "Invalid or inactive device",
        success: false
      }, { status: 403 })

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return response
    }

    // Check if this transaction has already been scanned today
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    // Calculate entry day string for atomic operations
    const entryDay = today.toISOString().split('T')[0] // YYYY-MM-DD format

    // Use atomic upsert to prevent race conditions
    const db = await Database["getDb"]()
    const now = new Date()
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // First, try to find if this transaction was already scanned today
    const existingScan = await db.collection("scanRecords").findOne({
      transactionId,
      entryDay,
    })

    if (existingScan) {
      // Transaction already scanned today - return conflict information
      const response = NextResponse.json({
        success: true,
        alreadyScanned: true,
        scannedBy: existingScan.scannedBy,
        scannedAt: existingScan.entryTimestamp?.toISOString(),
        data: existingScan,
        message: "Entry already recorded"
      })

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return response
    }

    // Transaction not scanned today - create new record
    const scanRecord = {
      scanId,
      deviceId,
      rollNumber,
      name: name || 'Unknown',
      qrType,
      transactionId,
      entryDate: now,
      entryTimestamp: now,
      scannedBy: deviceName,
      status: 'completed',
      reason: 'Entry recorded via mobile scanner',
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
      entryDay,
    }

    const insertResult = await db.collection("scanRecords").insertOne(scanRecord)

    const response = NextResponse.json({
      success: true,
      alreadyScanned: false,
      scannedBy: deviceName,
      scannedAt: now.toISOString(),
      data: { ...scanRecord, _id: insertResult.insertedId },
      message: "Entry recorded successfully"
    })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error("Entry recording error:", error)
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