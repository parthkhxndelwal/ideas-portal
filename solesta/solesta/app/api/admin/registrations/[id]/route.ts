import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()

    const { id } = await params

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        user: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: registration })
  } catch (error) {
    console.error("Get registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession()

    const { id } = await params
    const body = await request.json()

    const registration = await prisma.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    // Prevent paid → unpaid conversion
    if (registration.feePaid && body.feePaid === false) {
      return NextResponse.json(
        {
          error:
            "Cannot change payment status from paid to unpaid. Delete and recreate instead.",
        },
        { status: 400 }
      )
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        name: body.name || registration.name,
        email: body.email || registration.email,
        rollNumber: body.rollNumber || registration.rollNumber,
        college:
          body.college !== undefined ? body.college : registration.college,
        course: body.course || registration.course,
        year: body.year || registration.year,
        feePaid:
          body.feePaid !== undefined
            ? body.feePaid && !registration.feePaid
              ? true
              : registration.feePaid
            : registration.feePaid,
        paymentDate:
          body.feePaid === true && !registration.feePaid
            ? new Date()
            : registration.paymentDate,
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Update registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete registration links first
    await prisma.registrationLink.deleteMany({
      where: { registrationId: id },
    })

    // Delete registration
    await prisma.registration.delete({
      where: { id },
    })

    // Delete associated user
    await prisma.user.delete({
      where: { id: registration.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
