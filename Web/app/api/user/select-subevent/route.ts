import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { subEventId } = await request.json()

    if (!subEventId) {
      return NextResponse.json(
        { message: "Subevent ID is required" },
        { status: 400 }
      )
    }

    // Verify the subevent exists and is active
    const activeSubEvents = await Database.getActiveSubEvents()
    const selectedSubEvent = activeSubEvents.find(se => se.id === subEventId)

    if (!selectedSubEvent) {
      return NextResponse.json(
        { message: "Invalid or inactive subevent selected" },
        { status: 400 }
      )
    }

    // Check if subevent has reached max capacity
    if (selectedSubEvent.maxParticipants) {
      const participantCount = await Database.getSubEventParticipantCount(subEventId)
      if (participantCount >= selectedSubEvent.maxParticipants) {
        return NextResponse.json(
          { message: "This subevent has reached maximum capacity" },
          { status: 400 }
        )
      }
    }

    // Update user's selected subevent
    await Database.updateUser(decoded.userId, {
      selectedSubEvent: subEventId,
      registrationStatus: "subevent_selected",
    })

    return NextResponse.json({
      message: "Subevent selected successfully"
    })
  } catch (error) {
    console.error("Error selecting subevent:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}