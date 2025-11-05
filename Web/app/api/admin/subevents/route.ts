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

    const subEvents = await Database.getSubEvents()
    
    // Add participant counts to each subevent
    const subEventsWithCounts = await Promise.all(
      subEvents.map(async (subEvent: any) => {
        const participantCount = await Database.getSubEventParticipantCount(subEvent.id)
        return {
          ...subEvent,
          participantCount,
        }
      })
    )
    
    return NextResponse.json(subEventsWithCounts)
  } catch (error) {
    console.error("Error fetching subevents:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, venue, maxParticipants, isActive, id } = body

    if (!name || !description || !venue || !id) {
      return NextResponse.json(
        { message: "Name, description, venue, and ID are required" },
        { status: 400 }
      )
    }

    // Get current config
    const config = await Database.getEventConfig()

    // Add new subevent
    const newSubEvent = {
      id,
      name,
      description,
      venue,
      maxParticipants: maxParticipants || undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedSubEvents = [...(config.subEvents || []), newSubEvent]

    // Update config
    await Database.updateEventConfig(config.paymentAmount, updatedSubEvents, admin.email)

    return NextResponse.json({
      message: "Subevent created successfully",
      subEvent: newSubEvent
    })
  } catch (error) {
    console.error("Error creating subevent:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { _id, id, name, description, venue, maxParticipants, isActive } = body

    if (!id || !name || !description || !venue) {
      return NextResponse.json(
        { message: "ID, name, description, and venue are required" },
        { status: 400 }
      )
    }

    // Get current config
    const config = await Database.getEventConfig()

    // Find the subevent being updated
    const existingSubEvent = (config.subEvents || []).find((se: any) => se.id === id)
    if (!existingSubEvent) {
      return NextResponse.json(
        { message: "Subevent not found" },
        { status: 404 }
      )
    }

    // Validate maxParticipants against current participant count
    if (maxParticipants !== undefined && maxParticipants !== null) {
      const currentParticipantCount = await Database.getSubEventParticipantCount(id)
      if (currentParticipantCount > maxParticipants) {
        return NextResponse.json(
          { message: `Cannot set max participants to ${maxParticipants}. Current participant count is ${currentParticipantCount}. Max participants must be at least ${currentParticipantCount}.` },
          { status: 400 }
        )
      }
    }

    // Update subevent
    const updatedSubEvents = (config.subEvents || []).map((subEvent: any) =>
      subEvent.id === id
        ? {
            ...subEvent,
            name,
            description,
            venue,
            maxParticipants: maxParticipants || undefined,
            isActive: isActive !== undefined ? isActive : subEvent.isActive,
            updatedAt: new Date(),
          }
        : subEvent
    )

    // Update config
    await Database.updateEventConfig(config.paymentAmount, updatedSubEvents, admin.email)

    return NextResponse.json({
      message: "Subevent updated successfully"
    })
  } catch (error) {
    console.error("Error updating subevent:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { message: "Subevent ID is required" },
        { status: 400 }
      )
    }

    // Get current config
    const config = await Database.getEventConfig()

    // Check if subevent has participants
    const subEvent = (config.subEvents || []).find((se: any) => se.id === id)
    if (!subEvent) {
      return NextResponse.json(
        { message: "Subevent not found" },
        { status: 404 }
      )
    }

    // Check for participants
    const participantCount = await Database.getSubEventParticipantCount(id)

    if (participantCount > 0) {
      return NextResponse.json(
        { message: `Cannot delete subevent with ${participantCount} registered participants` },
        { status: 400 }
      )
    }

    // Remove subevent
    const updatedSubEvents = (config.subEvents || []).filter((se: any) => se.id !== id)

    // Update config
    await Database.updateEventConfig(config.paymentAmount, updatedSubEvents, admin.email)

    return NextResponse.json({
      message: "Subevent deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting subevent:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}