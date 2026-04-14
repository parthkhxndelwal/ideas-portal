import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const skip = parseInt(searchParams.get("skip") || "0", 10)

    // Build where clause using Prisma syntax
    const where: any = {}

    if (query.trim()) {
      where.OR = [
        { rollNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ]
    }

    const students = await prisma.student.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    })

    const total = await prisma.student.count({ where })

    return NextResponse.json({
      success: true,
      data: students,
      pagination: { total, limit, skip },
    })
  } catch (error) {
    console.error("Get students error:", error)
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
    const { rollNumber, name, courseAndSemester, year, email } = body

    if (!rollNumber || !name) {
      return NextResponse.json(
        { error: "Roll number and name are required" },
        { status: 400 }
      )
    }

    // Check if student already exists
    const existing = await prisma.student.findFirst({
      where: { rollNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Student with this roll number already exists" },
        { status: 409 }
      )
    }

    const student = await prisma.student.create({
      data: {
        rollNumber,
        name,
        courseAndSemester: courseAndSemester || "",
        year: year || "",
        email: email || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: student,
    })
  } catch (error) {
    console.error("Create student error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
