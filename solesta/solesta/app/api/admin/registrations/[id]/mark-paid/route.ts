import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"

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

    if (registration.feePaid) {
      return NextResponse.json(
        { error: "Registration is already marked as paid" },
        { status: 400 }
      )
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        feePaid: true,
        paymentDate: new Date(),
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Mark paid error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
