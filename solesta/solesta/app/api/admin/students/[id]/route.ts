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

    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: student })
  } catch (error) {
    console.error("Get student error:", error)
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

    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        name: body.name || student.name,
        courseAndSemester: body.courseAndSemester || student.courseAndSemester,
        year: body.year || student.year,
        email: body.email !== undefined ? body.email : student.email,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Update student error:", error)
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

    // Check if student has any registration by finding registrations with this student's roll number
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const registration = await prisma.registration.findFirst({
      where: {
        rollNumber: student.rollNumber!,
      },
    })

    if (registration) {
      return NextResponse.json(
        { error: "Cannot delete student with existing registration" },
        { status: 409 }
      )
    }

    await prisma.student.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete student error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
