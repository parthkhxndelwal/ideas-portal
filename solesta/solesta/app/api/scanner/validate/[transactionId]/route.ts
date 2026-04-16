import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { validateScannerApiKey } from "@/lib/server/scanner-auth"
import { withCors } from "@/lib/server/cors"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  return withCors(request, async () => {
    // Validate API key
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || !await validateScannerApiKey(apiKey)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      )
    }

    try {
      const { transactionId } = await params

      if (!transactionId) {
        return NextResponse.json(
          { error: "Missing transactionId parameter" },
          { status: 400 }
        )
      }

      // Find registration by referenceId (transactionId)
      const registration = await prisma.registration.findUnique({
        where: { referenceId: transactionId },
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
          feePaid: true,
          scanned: true,
          scannedAt: true,
          scannedBy: true,
        },
      })

      if (!registration) {
        return NextResponse.json(
          { 
            success: false,
            error: "Registration not found" 
          },
          { status: 404 }
        )
      }

      // Check if fee is paid (only paid registrations are eligible)
      if (!registration.feePaid) {
        return NextResponse.json(
          {
            success: false,
            error: "Registration fee not paid",
          },
          { status: 403 }
        )
      }

      // Return registration details for validation
      const mobileUser = {
        id: registration.id,
        transactionId: registration.referenceId,
        name: registration.name,
        email: registration.email,
        rollNumber: registration.rollNumber,
        courseAndSemester: `${registration.course} - Year ${registration.year}`,
        year: registration.year,
        isKrmu: registration.isKrmu,
        isFresher: registration.isFresher,
        scanned: registration.scanned,
        scannedAt: registration.scannedAt?.toISOString(),
        scannedBy: registration.scannedBy,
      };

      return NextResponse.json({
        success: true,
        data: mobileUser,
      })
    } catch (error) {
      console.error("Validation error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  })
}
