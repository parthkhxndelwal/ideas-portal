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

    const { referenceId } = await request.json()
    if (!referenceId) {
      return NextResponse.json({ error: "Reference ID required" }, { status: 400 })
    }

    const result = await Database.markReferenceIdPending(referenceId)
    if (!result) {
      return NextResponse.json({ error: "Reference ID not found or already used" }, { status: 400 })
    }

    // Also update user's registration status to indicate payment pending
    await Database.updateUser(decoded.userId, {
      registrationStatus: "pending",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking reference ID as pending:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}