import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await Database.findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // For non-university users, return empty details or existing user details
    if (!user.isFromUniversity) {
      return NextResponse.json({
        details: {
          name: user.name || "",
          rollNumber: user.rollNumber || "",
          courseAndSemester: user.courseAndSemester || "",
          year: user.year || "",
        },
        isFromUniversity: false,
        requiresManualEntry: true,
      })
    }

    // For university users, fetch from roll number database
    if (!user.rollNumber) {
      return NextResponse.json({ error: "Roll number not found" }, { status: 404 })
    }

    const rollNumberData = await Database.findRollNumberData(user.rollNumber)
    if (!rollNumberData) {
      return NextResponse.json({ error: "Roll number data not found" }, { status: 404 })
    }

    return NextResponse.json({
      details: {
        name: rollNumberData.name,
        rollNumber: rollNumberData.rollnumber,
        courseAndSemester: rollNumberData.courseAndSemester,
        year: rollNumberData.year,
      },
      isFromUniversity: true,
      requiresManualEntry: false,
    })
  } catch (error) {
    console.error("Details fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
