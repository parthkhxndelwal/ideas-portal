import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    console.log("Email verification request received")
    const { email, otp } = await request.json()

    if (!email || !otp) {
      console.log("Missing email or OTP")
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "OTP must be 6 digits" }, { status: 400 })
    }

    console.log("Verifying OTP for email:", email)
    const isValid = await Database.verifyEmailOTP(email, otp)
    if (!isValid) {
      console.log("Invalid or expired OTP for:", email)
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    console.log("OTP verified, updating user email verification status")
    const user = await Database.findUserByEmail(email)
    if (user) {
      await Database.updateUser(user._id.toString(), { isEmailVerified: true })
      console.log("Email verification status updated for:", email)
    }

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
