import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { generateQRForRegistration } from "@/lib/server/qr-generator"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the registration link
    const link = await prisma.registrationLink.findUnique({
      where: { token },
    })

    if (!link) {
      return NextResponse.json(
        { error: "Ticket link not found" },
        { status: 404 }
      )
    }

    // Check if link has expired
    if (link.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Ticket link has expired" },
        { status: 410 }
      )
    }

    // Check if link has been used
    if (link.isUsed) {
      return NextResponse.json(
        { error: "Ticket link has already been used" },
        { status: 410 }
      )
    }

    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: link.registrationId },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    // Generate QR code
    const { qrCode } = await generateQRForRegistration(
      registration.referenceId,
      registration.rollNumber || ""
    )

    // Mark link as used
    await prisma.registrationLink.update({
      where: { id: link.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        registration: {
          referenceId: registration.referenceId,
          name: registration.name,
          email: registration.email,
          rollNumber: registration.rollNumber,
        },
        qrCode,
      },
    })
  } catch (error) {
    console.error("Get ticket error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
