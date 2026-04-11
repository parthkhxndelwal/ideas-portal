import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isFromUniversity = searchParams.get("isFromUniversity") === "true"
    const year = searchParams.get("year") || undefined
    const courseAndSemester = searchParams.get("course") || undefined

    const userInfo = isFromUniversity ? { isFromUniversity: true, year, courseAndSemester } : undefined
    const activeSubEvents = await Database.getActiveSubEvents(userInfo)
    return NextResponse.json(activeSubEvents)
  } catch (error) {
    console.error("Error fetching active subevents:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}