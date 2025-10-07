import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { generateResetToken } from "@/lib/auth"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    console.log("Password reset request for email:", email)

    const user = await Database.findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent" })
    }

    const resetToken = generateResetToken()
    await Database.createPasswordReset(email, resetToken)

    try {
      await sendPasswordResetEmail(email, resetToken)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
    }

    console.log("Password reset email sent successfully")
    return NextResponse.json({ message: "If an account exists, a reset link has been sent" })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
