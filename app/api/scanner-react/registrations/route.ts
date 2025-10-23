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
    const limitParam = searchParams.get("limit")

    const since = sinceParam ? new Date(sinceParam) : undefined
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Validate limit
    if (limit && (limit < 1 || limit > 1000)) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 1000" },
        { status: 400 }
      )
    }

    // Fetch confirmed registrations
    const registrations = await Database.getConfirmedRegistrations(since, limit)

    // Current server time for client sync
    const lastSyncAt = new Date().toISOString()

    // Transform registrations to include only necessary fields
    const transformedRegistrations = registrations.map((reg: any) => ({
      _id: reg._id.toString(),
      email: reg.email,
      role: reg.role,
      isEmailVerified: reg.isEmailVerified,
      rollNumber: reg.rollNumber,
      name: reg.name,
      courseAndSemester: reg.courseAndSemester,
      year: reg.year,
      registrationStatus: reg.registrationStatus,
      transactionId: reg.transactionId,
      paymentStatus: reg.paymentStatus,
      createdAt: reg.createdAt.toISOString(),
      updatedAt: reg.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      lastSyncAt,
      registrations: transformedRegistrations,
    }, { status: 200 })
  } catch (error) {
    console.error("Error fetching registrations:", error)
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    )
  }
}
