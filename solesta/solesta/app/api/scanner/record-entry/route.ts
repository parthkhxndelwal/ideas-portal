import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { validateScannerApiKey } from "@/lib/server/scanner-auth"
import { withCors } from "@/lib/server/cors"
import { decryptQR } from "@/lib/server/qr-generator"

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    // Validate API key
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || !(await validateScannerApiKey(apiKey))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      )
    }

    const body = await request.json()
    let {
      transactionId, // referenceId from the mobile app
      rollNumber,
      name,
      qrType,
      deviceId,
      deviceName,
    } = body

    // Validate required fields
    if (!transactionId || !name || !qrType || !deviceId || !deviceName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: transactionId, name, qrType, deviceId, deviceName",
        },
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
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    // Check if already scanned
    if (registration.scanned) {
      return NextResponse.json({
        success: false,
        message: "This registration has already been scanned",
        alreadyScanned: true,
        scannedAt: registration.scannedAt?.toISOString(),
        scannedBy: registration.scannedBy,
      })
    }

    // Update registration with scan information
    const updatedRegistration = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        scanned: true,
        scannedAt: new Date(),
        scannedBy: deviceId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Entry recorded successfully",
      data: {
        id: updatedRegistration.id,
        referenceId: updatedRegistration.referenceId,
        name: updatedRegistration.name,
        rollNumber: updatedRegistration.rollNumber,
        scannedAt: updatedRegistration.scannedAt?.toISOString(),
        scannedBy: updatedRegistration.scannedBy,
      },
    })
  })
}
