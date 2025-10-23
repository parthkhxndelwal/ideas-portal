import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { authenticateScannerDevice } from "../../middleware"

interface BatchEntry {
  _id: string // Client-generated scan ID for idempotency
  rollNumber: string
  name: string
  qrType: "participant" | "volunteer"
  transactionId?: string
  entryDate: string // ISO date string
  entryTimestamp: string // ISO datetime string
  scannedBy: string
  createdAt: string // ISO datetime string
}

interface BatchResult {
  entryId: string
  status: "accepted" | "conflict" | "rejected"
  reason?: string
  appliedAt?: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate device
    const device = await authenticateScannerDevice(request)
    
    if (!device) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or inactive device token" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId, entries } = body

    // Validate request
    if (!deviceId || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Invalid request: deviceId and entries array required" },
        { status: 400 }
      )
    }

    // Verify device ID matches authenticated device
    if (deviceId !== device.deviceId) {
      return NextResponse.json(
        { error: "Device ID mismatch" },
        { status: 403 }
      )
    }

    // Validate batch size
    if (entries.length > 100) {
      return NextResponse.json(
        { error: "Batch size exceeds maximum of 100 entries" },
        { status: 400 }
      )
    }

    const results: BatchResult[] = []
    const processedAt = new Date()

    // Process each entry
    for (const entry of entries) {
      try {
        // Validate entry structure
        if (!entry._id || !entry.rollNumber || !entry.name || !entry.qrType || !entry.entryDate || !entry.entryTimestamp || !entry.scannedBy) {
          results.push({
            entryId: entry._id || "unknown",
            status: "rejected",
            reason: "Missing required fields",
          })
          continue
        }

        // Parse dates
        const entryDate = new Date(entry.entryDate)
        const entryTimestamp = new Date(entry.entryTimestamp)
        entryDate.setHours(0, 0, 0, 0)

        // Check for existing scan record (idempotency)
        const existingScan = await Database.findScanRecord(entry._id)
        
        if (existingScan) {
          // Return existing result
          results.push({
            entryId: entry._id,
            status: existingScan.status as "accepted" | "conflict" | "rejected",
            reason: existingScan.reason,
            appliedAt: existingScan.appliedAt?.toISOString(),
          })
          continue
        }

        // Check for existing scan record (prevent multiple scans per QR per day)
        const existingScanRecord = await Database.findScanRecordByRollNumberAndDate(
          entry.rollNumber,
          entryDate
        )

        if (existingScanRecord) {
          // Reject: QR already scanned today
          await Database.createScanRecord({
            scanId: entry._id,
            deviceId,
            rollNumber: entry.rollNumber,
            name: entry.name,
            qrType: entry.qrType,
            transactionId: entry.transactionId,
            entryDate,
            entryTimestamp,
            scannedBy: entry.scannedBy,
            status: "rejected",
            reason: "QR already scanned today",
          })

          results.push({
            entryId: entry._id,
            status: "rejected",
            reason: "QR already scanned today",
          })
          continue
        }

        // Verify user exists and is confirmed
        const user = await Database.findUserByRollNumber(entry.rollNumber)
        
        if (!user) {
          await Database.createScanRecord({
            scanId: entry._id,
            deviceId,
            rollNumber: entry.rollNumber,
            name: entry.name,
            qrType: entry.qrType,
            transactionId: entry.transactionId,
            entryDate,
            entryTimestamp,
            scannedBy: entry.scannedBy,
            status: "rejected",
            reason: "User not found in system",
          })

          results.push({
            entryId: entry._id,
            status: "rejected",
            reason: "User not found in system",
          })
          continue
        }

        if (user.registrationStatus !== "confirmed" || user.paymentStatus !== "completed") {
          await Database.createScanRecord({
            scanId: entry._id,
            deviceId,
            rollNumber: entry.rollNumber,
            name: entry.name,
            qrType: entry.qrType,
            transactionId: entry.transactionId,
            entryDate,
            entryTimestamp,
            scannedBy: entry.scannedBy,
            status: "rejected",
            reason: "Registration not completed or payment pending",
          })

          results.push({
            entryId: entry._id,
            status: "rejected",
            reason: "Registration not completed or payment pending",
          })
          continue
        }

        // Check blacklist
        const isBlacklisted = await Database.isRollNumberBlacklisted(entry.rollNumber)
        
        if (isBlacklisted) {
          await Database.createScanRecord({
            scanId: entry._id,
            deviceId,
            rollNumber: entry.rollNumber,
            name: entry.name,
            qrType: entry.qrType,
            transactionId: entry.transactionId,
            entryDate,
            entryTimestamp,
            scannedBy: entry.scannedBy,
            status: "rejected",
            reason: "Roll number is blacklisted",
          })

          results.push({
            entryId: entry._id,
            status: "rejected",
            reason: "Roll number is blacklisted",
          })
          continue
        }

        // Accept and record entry
        await Database.recordEntry({
          rollNumber: entry.rollNumber,
          name: entry.name,
          qrType: entry.qrType,
          transactionId: entry.transactionId,
          entryDate,
          entryTimestamp,
          scannedBy: entry.scannedBy,
        })

        // Create scan record
        await Database.createScanRecord({
          scanId: entry._id,
          deviceId,
          rollNumber: entry.rollNumber,
          name: entry.name,
          qrType: entry.qrType,
          transactionId: entry.transactionId,
          entryDate,
          entryTimestamp,
          scannedBy: entry.scannedBy,
          status: "accepted",
          appliedAt: processedAt,
        })

        results.push({
          entryId: entry._id,
          status: "accepted",
          appliedAt: processedAt.toISOString(),
        })
      } catch (error) {
        console.error("Error processing entry:", entry._id, error)
        results.push({
          entryId: entry._id || "unknown",
          status: "rejected",
          reason: "Internal processing error",
        })
      }
    }

    return NextResponse.json({
      processedAt: processedAt.toISOString(),
      results,
    }, { status: 200 })
  } catch (error) {
    console.error("Error processing batch scans:", error)
    return NextResponse.json(
      { error: "Failed to process batch scans" },
      { status: 500 }
    )
  }
}
