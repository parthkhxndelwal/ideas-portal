import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"
import { withCors } from "@/lib/server/cors"

export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    await requireAdminSession()

    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get("filter") // "all", "scanned", "not-scanned"
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const skip = parseInt(searchParams.get("skip") || "0", 10)

    // Build where clause
    const where: any = {
      feePaid: true, // Only show paid registrations (eligible for scanning)
    }

    if (filter === "scanned") {
      where.scanned = true
    } else if (filter === "not-scanned") {
      where.scanned = false
    }

    // Get registrations with scan status
    const registrations = await prisma.registration.findMany({
      where,
      select: {
        id: true,
        referenceId: true,
        name: true,
        email: true,
        rollNumber: true,
        scanned: true,
        scannedAt: true,
        scannedBy: true,
      },
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    })

    // Get counts
    const totalPaid = await prisma.registration.count({
      where: { feePaid: true },
    })

    const totalScanned = await prisma.registration.count({
      where: { feePaid: true, scanned: true },
    })

    const totalNotScanned = totalPaid - totalScanned

    return NextResponse.json({
      success: true,
      data: registrations,
      stats: {
        totalPaid,
        totalScanned,
        totalNotScanned,
        scanPercentage: totalPaid > 0 ? ((totalScanned / totalPaid) * 100).toFixed(2) : 0,
      },
      pagination: {
        total: filter === "scanned" ? totalScanned : filter === "not-scanned" ? totalNotScanned : totalPaid,
        limit,
        skip,
      },
    })
  })
}
