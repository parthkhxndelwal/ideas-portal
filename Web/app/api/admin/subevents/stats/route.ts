import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Database } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET() {
  try {
    // Verify admin authentication
    const headersList = await headers()
    const authHeader = headersList.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = verifyToken(token)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get subevent statistics
    const stats = await Database.getSubEventStatistics()

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching subevent stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}