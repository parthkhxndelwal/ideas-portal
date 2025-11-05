import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
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

    // Get roll number from query parameters
    const rollNumber = request.nextUrl.searchParams.get("rollNumber")
    if (!rollNumber) {
      return NextResponse.json({ error: "Roll number is required" }, { status: 400 })
    }

    // Check if roll number exists in the database
    const rollNumberData = await Database.findRollNumberData(rollNumber)

    return NextResponse.json({
      exists: !!rollNumberData,
      rollNumber,
      data: rollNumberData ? {
        name: rollNumberData.name,
        courseAndSemester: rollNumberData.courseAndSemester,
        year: rollNumberData.year
      } : null
    })

  } catch (error) {
    console.error("Error validating roll number:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}