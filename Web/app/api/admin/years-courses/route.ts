import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const db = await Database.getDb()
    
    const years = await db.collection("rollNumberData").distinct("year")
    const courses = await db.collection("rollNumberData").distinct("courseAndSemester")

    return NextResponse.json({
      years: years.sort(),
      courses: courses.sort()
    })
  } catch (error) {
    console.error("Error fetching years and courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}