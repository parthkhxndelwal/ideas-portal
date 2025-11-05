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

    return NextResponse.json({
      userInfo: {
        email: user.email,
        rollNumber: user.rollNumber || null,
        name: user.name || null,
        registrationStatus: user.registrationStatus,
        isFromUniversity: user.isFromUniversity ?? true,
      },
    })
  } catch (error) {
    console.error("User info fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}