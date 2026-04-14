import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"
import { generateQRForRegistration } from "@/lib/server/qr-generator"
import { sendTicketLinkEmail } from "@/lib/server/admin-email"
import { config } from "@/lib/server/config"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()

    const { id } = await params

    const registration = await prisma.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    if (!registration.feePaid) {
      return NextResponse.json(
        { error: "Cannot send ticket for unpaid registration" },
        { status: 400 }
      )
    }

    // Check if a link already exists and is unused
    const existingLink = await prisma.registrationLink.findFirst({
      where: {
        registrationId: id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    })

    let link = existingLink
    if (!existingLink) {
      // Create new registration link
      const token = uuidv4()
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

      link = await prisma.registrationLink.create({
        data: {
          registrationId: id,
          token,
          expiresAt,
          email: registration.email,
        },
      })
    }

    // Ensure link is not null
    if (!link) {
      return NextResponse.json(
        { error: "Failed to create or retrieve link" },
        { status: 500 }
      )
    }

    // Generate QR code
    const { qrCode } = await generateQRForRegistration(
      registration.referenceId,
      registration.rollNumber || ""
    )

    // Create ticket download link
    const ticketLink = `${config.ticketAppUrl}/ticket/ref/${link.token}`

    // Send email
    const emailSent = await sendTicketLinkEmail(
      registration.email,
      registration.name,
      registration.referenceId,
      ticketLink
    )

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send ticket email" },
        { status: 500 }
      )
    }

    // Update registration
    const updated = await prisma.registration.update({
      where: { id },
      data: {
        qrSentEmail: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        registration: updated,
        link: link.token,
        expiresAt: link.expiresAt,
      },
    })
  } catch (error) {
    console.error("Send ticket error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
