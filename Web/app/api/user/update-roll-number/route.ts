import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { email, rollNumber } = await request.json()

    if (!email || !rollNumber) {
      return NextResponse.json({ error: "Email and roll number are required" }, { status: 400 })
    }

    const user = await Database.findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await Database.updateUser(user._id.toString(), { rollNumber })

    return NextResponse.json({ message: "Roll number updated successfully" })
  } catch (error) {
    console.error("Roll number update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
