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

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const status = searchParams.get("status")
    const rollNumber = searchParams.get("rollNumber")
    const limitParam = searchParams.get("limit")
    const pageParam = searchParams.get("page")

    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const page = pageParam ? parseInt(pageParam, 10) : 1
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}
    if (deviceId) query.deviceId = deviceId
    if (status) query.status = status
    if (rollNumber) query.rollNumber = rollNumber

    // Get scan records
    const db = await Database["getDb"]()
    const scans = await db.collection("scanRecords")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalCount = await db.collection("scanRecords").countDocuments(query)

    // Transform scans
    const transformedScans = scans.map((scan: any) => ({
      _id: scan._id.toString(),
      scanId: scan.scanId,
      deviceId: scan.deviceId,
      rollNumber: scan.rollNumber,
      name: scan.name,
      qrType: scan.qrType,
      transactionId: scan.transactionId,
      entryDate: scan.entryDate.toISOString().split('T')[0],
      entryTimestamp: scan.entryTimestamp.toISOString(),
      scannedBy: scan.scannedBy,
      status: scan.status,
      reason: scan.reason,
      appliedAt: scan.appliedAt?.toISOString(),
      createdAt: scan.createdAt.toISOString(),
      updatedAt: scan.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      scans: transformedScans,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }, { status: 200 })
  } catch (error) {
    console.error("Error fetching scan records:", error)
    return NextResponse.json(
      { error: "Failed to fetch scan records" },
      { status: 500 }
    )
  }
}
