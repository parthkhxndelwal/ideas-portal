import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    console.log("Password reset attempt with token")

    const resetRecord = await Database.findPasswordReset(token)
    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    const now = new Date()
    if (now > resetRecord.expiresAt) {
      await Database.deletePasswordReset(token)
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 })
    }

    const user = await Database.findUserByEmail(resetRecord.email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hashedPassword = await hashPassword(password)
    await Database.updateUserPassword(user._id.toString(), hashedPassword)
    await Database.deletePasswordReset(token)

    console.log("Password reset successful")
    return NextResponse.json({ message: "Password reset successful" })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
