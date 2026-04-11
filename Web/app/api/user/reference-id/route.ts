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

    // Get the reference ID for this user (generates if not exists)
    const refId = await Database.getReferenceIdForUser(decoded.userId)

    if (!refId) {
      return NextResponse.json({ error: "Failed to generate reference ID" }, { status: 500 })
    }

    // Get event config for external payment URL
    const config = await Database.getEventConfig()
    const externalPaymentUrl = config.externalPaymentUrl

    return NextResponse.json({
      referenceId: refId.referenceId,
      status: refId.status,
      externalPaymentUrl: externalPaymentUrl || null,
    })
  } catch (error) {
    console.error("Error getting reference ID:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}