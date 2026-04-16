import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { validateScannerApiKey } from "@/lib/server/scanner-auth"
import { withCors } from "@/lib/server/cors"

export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    // Validate API key
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || !await validateScannerApiKey(apiKey)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      )
    }

    // Fetch all registrations with fee paid = true (eligible for scanning)
    const registrations = await prisma.registration.findMany({
      where: {
        feePaid: true, // Only include paid registrations
      },
      select: {
        id: true,
        referenceId: true,
        name: true,
        email: true,
        rollNumber: true,
        course: true,
        year: true,
        isKrmu: true,
        isFresher: true,
        scanned: true,
        scannedAt: true,
        scannedBy: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Map to mobile app format
    const users = registrations.map((reg) => ({
      id: reg.id,
      transactionId: reg.referenceId, // Using referenceId as transactionId for compatibility
      name: reg.name,
      email: reg.email,
      rollNumber: reg.rollNumber,
      courseAndSemester: `${reg.course} - Year ${reg.year}`,
      year: reg.year,
      isKrmu: reg.isKrmu,
      isFresher: reg.isFresher,
      scanned: reg.scanned,
      scannedAt: reg.scannedAt,
      scannedBy: reg.scannedBy,
    }))

    return NextResponse.json({
      success: true,
      users,
      lastUpdated: new Date().toISOString(),
      totalCount: users.length,
    })
  })
}
