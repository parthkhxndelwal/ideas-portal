import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"
import { config } from "@/lib/server/config"
import { sendTicketLinkEmail } from "@/lib/server/admin-email"

function generateReferenceId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "SOL26-"
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const paymentFilter = searchParams.get("payment") // "all", "paid", "unpaid"
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const skip = parseInt(searchParams.get("skip") || "0", 10)

    // Build where clause using Prisma syntax
    const where: any = {}

    if (query.trim()) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { rollNumber: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { referenceId: { contains: query, mode: "insensitive" } },
      ]
    }

    if (paymentFilter === "paid") {
      where.feePaid = true
    } else if (paymentFilter === "unpaid") {
      where.feePaid = false
    }

    // Fetch ALL registrations regardless of source
    const registrations = await prisma.registration.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    })

    // Get counts for each filter category
    const searchWhere = query.trim() ? where : {}
    const totalCount = await prisma.registration.count({ where: searchWhere })
    const paidCount = await prisma.registration.count({
      where: { ...searchWhere, feePaid: true },
    })
    const unpaidCount = await prisma.registration.count({
      where: { ...searchWhere, feePaid: false },
    })

    return NextResponse.json({
      success: true,
      data: registrations,
      pagination: { total: totalCount, limit, skip },
      counts: {
        all: totalCount,
        paid: paidCount,
        unpaid: unpaidCount,
      },
    })
  } catch (error) {
    console.error("Get registrations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession()

    const body = await request.json()
    const {
      name,
      email,
      rollNumber,
      college,
      course,
      year,
      isKrmu,
      paymentMode,
    } = body

    if (!name || !email || !rollNumber) {
      return NextResponse.json(
        { error: "Name, email, and roll number are required" },
        { status: 400 }
      )
    }

    // Check if registration already exists for this roll number
    const existing = await prisma.registration.findFirst({
      where: { rollNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Registration already exists for this roll number" },
        { status: 409 }
      )
    }

    // Generate reference ID
    let referenceId = generateReferenceId()
    let counter = 0
    while (
      await prisma.registration.findUnique({
        where: { referenceId },
      })
    ) {
      if (counter++ > 10) {
        throw new Error("Failed to generate unique reference ID")
      }
      referenceId = generateReferenceId()
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        externalAppId: `admin_${uuidv4()}`,
        isVerified: true,
        verifiedAt: new Date(),
        isKrmu,
      },
    })

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        referenceId,
        userId: user.id,
        name,
        email,
        rollNumber,
        college: college || "",
        course: course || "",
        year: year || "",
        isKrmu,
        isFresher: false,
        feeAmount: 500,
        feePaid: paymentMode === "verified",
        paymentDate: paymentMode === "verified" ? new Date() : null,
      },
      include: {
        user: true,
      },
    })

    // Send ticket email if payment is verified
    let emailSent = false
    let ticketLink = null

    if (paymentMode === "verified") {
      try {
        // Create registration link
        const token = uuidv4()
        const expiresAt = new Date(Date.now() + 150 * 60 * 60 * 1000) // 150 hours

        await prisma.registrationLink.create({
          data: {
            registrationId: registration.id,
            token,
            expiresAt,
            email,
          },
        })

        // Create ticket download link
        ticketLink = `${config.ticketAppUrl}/ticket/ref/${token}`

        // Send email
        emailSent = await sendTicketLinkEmail(
          email,
          name,
          referenceId,
          ticketLink
        )

        // Update registration to mark QR as sent
        if (emailSent) {
          await prisma.registration.update({
            where: { id: registration.id },
            data: { qrSentEmail: true },
          })
        }
      } catch (emailError) {
        console.error("Failed to send ticket email:", emailError)
        // Don't fail the registration if email fails
      }
    }

    return NextResponse.json({
      success: true,
      data: registration,
      emailSent,
      ticketLink,
    })
  } catch (error) {
    console.error("Create registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
