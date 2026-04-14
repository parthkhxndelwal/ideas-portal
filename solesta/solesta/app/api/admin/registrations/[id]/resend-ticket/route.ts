import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"
import { sendUpdateEmailNotification } from "@/lib/server/admin-email"
import { config } from "@/lib/server/config"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()

    const { id } = await params
    const body = await request.json()
    const { newEmail } = body

    const registration = await prisma.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    // Get existing link to check if it's been used
    const existingLink = await prisma.registrationLink.findFirst({
      where: { registrationId: id },
      orderBy: { createdAt: "desc" },
    })

    if (existingLink?.isUsed) {
      return NextResponse.json(
        { error: "Cannot resend ticket. Previous link has been used." },
        { status: 400 }
      )
    }

    // Revoke old link
    if (existingLink) {
      await prisma.registrationLink.update({
        where: { id: existingLink.id },
        data: { isUsed: true, usedAt: new Date() },
      })
    }

    // Create new link
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    const newLink = await prisma.registrationLink.create({
      data: {
        registrationId: id,
        token,
        expiresAt,
        email: newEmail || registration.email,
      },
    })

    // Update registration email if changed
    if (newEmail && newEmail !== registration.email) {
      await prisma.registration.update({
        where: { id },
        data: { email: newEmail },
      })
    }

    // Create ticket download link
    const ticketLink = `${config.ticketAppUrl}/ticket/ref/${newLink.token}`

    // Send email notification
    const emailSent = await sendUpdateEmailNotification(
      registration.email,
      newEmail || registration.email,
      registration.name,
      registration.referenceId,
      ticketLink
    )

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        registration: {
          ...registration,
          email: newEmail || registration.email,
        },
        link: newLink.token,
        expiresAt: newLink.expiresAt,
      },
    })
  } catch (error) {
    console.error("Resend ticket error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
