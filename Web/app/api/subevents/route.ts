import { NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET() {
  try {
    const activeSubEvents = await Database.getActiveSubEvents()
    return NextResponse.json(activeSubEvents)
  } catch (error) {
    console.error("Error fetching active subevents:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}