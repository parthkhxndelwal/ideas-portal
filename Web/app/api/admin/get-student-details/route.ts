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

    const { rollNumber } = await request.json()

    if (!rollNumber) {
      return NextResponse.json({ error: "Roll number is required" }, { status: 400 })
    }

    const studentDetails = await Database.findRollNumberData(rollNumber)
    if (!studentDetails) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ details: studentDetails })
  } catch (error) {
    console.error("Get student details error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
