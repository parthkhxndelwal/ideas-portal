import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { generateOTP } from "@/lib/auth"
import { sendResendOTPEmail } from "@/lib/email"
import { validateEmailWithTLD } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailValidation = validateEmailWithTLD(email)
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error || "Invalid email format" }, { status: 400 })
    }

    console.log("Resend OTP request for email:", email)

    const existingVerification = await Database.findEmailVerification(email)
    if (!existingVerification) {
      return NextResponse.json({ error: "No pending verification found" }, { status: 404 })
    }

    const now = new Date()
    const lastSent = existingVerification.createdAt
    const timeDiff = now.getTime() - lastSent.getTime()
    const minutesDiff = Math.floor(timeDiff / (1000 * 60))

    if (minutesDiff < 1) {
      return NextResponse.json({ error: "Please wait at least 1 minute before requesting a new OTP" }, { status: 429 })
    }

    const newOtp = generateOTP()
    await Database.updateEmailVerification(email, newOtp)

    try {
      await sendResendOTPEmail(email, newOtp)
    } catch (emailError) {
      console.error("Failed to send resend OTP email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    console.log("Resend OTP sent successfully")
    return NextResponse.json({ message: "OTP resent successfully" })
  } catch (error) {
    console.error("Resend OTP error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
