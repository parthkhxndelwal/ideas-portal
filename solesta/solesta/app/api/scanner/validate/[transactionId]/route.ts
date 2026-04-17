import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { validateScannerApiKey } from "@/lib/server/scanner-auth"
import { withCors } from "@/lib/server/cors"
import { decryptQR } from "@/lib/server/qr-generator"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  return withCors(request, async () => {
    // Validate API key
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || !(await validateScannerApiKey(apiKey))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      )
    }

    try {
      let { transactionId } = await params

      if (!transactionId) {
        return NextResponse.json(
          { error: "Missing transactionId parameter" },
          { status: 400 }
        )
      }

      // Try to decrypt if the transactionId looks like encrypted data (contains colons)
      if (transactionId.includes(":")) {
        try {
          const decrypted = decryptQR(transactionId)
          // Extract reference ID from decrypted format: "participant_solesta_REF_ID"
          if (decrypted.includes("participant_solesta_")) {
            transactionId = decrypted.replace("participant_solesta_", "")
          } else if (decrypted.includes("volunteer_solesta_")) {
            // For volunteers, we still use the decrypted value but will look up by rollNumber
            transactionId = decrypted.replace("volunteer_solesta_", "")
          } else {
            // Fallback if format is different, use decrypted directly
            transactionId = decrypted
          }
        } catch (decryptErr) {
          console.warn("Failed to decrypt QR data, using as-is:", decryptErr)
          // If decryption fails, continue with original transactionId
        }
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
            error: "Registration not found",
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
      }

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
