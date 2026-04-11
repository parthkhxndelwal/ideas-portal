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

    const { referenceId } = await request.json()
    if (!referenceId) {
      return NextResponse.json({ error: "Reference ID required" }, { status: 400 })
    }

    const result = await Database.expireReferenceId(referenceId)
    if (!result) {
      return NextResponse.json({ error: "Reference ID not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Reference ID expired successfully" })
  } catch (error) {
    console.error("Error expiring reference ID:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}