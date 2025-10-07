import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyJWT(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await Database.findUserById(decoded.userId)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { rollNumber, studentDetails } = await request.json()

    if (!rollNumber || !studentDetails) {
      return NextResponse.json({ error: "Roll number and student details are required" }, { status: 400 })
    }

    await Database.blacklistRollNumber({
      rollNumber,
      name: studentDetails.name,
      courseAndSemester: studentDetails.courseAndSemester,
      year: studentDetails.year,
    })

    return NextResponse.json({ message: "Student blacklisted successfully" })
  } catch (error) {
    console.error("Blacklist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
