import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { hashPassword, generateOTP } from "@/lib/auth"
import { sendOTPEmail } from "@/lib/email"
import { validateEmailWithTLD } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    console.log("Signup request received")
    const { email, password, rollNumber } = await request.json()

    if (!email || !password || !rollNumber) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const emailValidation = validateEmailWithTLD(email)
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error || "Invalid email format" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    console.log("Checking existing user for email:", email)
    const existingUser = await Database.findUserByEmail(email)
    if (existingUser) {
      console.log("User already exists")
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    console.log("Checking blacklist for roll number:", rollNumber)
    const isBlacklisted = await Database.isRollNumberBlacklisted(rollNumber)
    if (isBlacklisted) {
      console.log("Roll number is blacklisted")
      return NextResponse.json({ error: "Server Timed Out." }, { status: 400 })
    }

    console.log("Creating user account")
    const hashedPassword = await hashPassword(password)
    const otp = generateOTP()

    await Database.createEmailVerification(email, otp)
    console.log("Email verification created, sending OTP")

    try {
      await sendOTPEmail(email, otp)
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    const userData = {
      email,
      password: hashedPassword,
      role: "participant" as const,
      isEmailVerified: false,
      rollNumber,
      registrationStatus: "pending" as const,
      paymentStatus: "pending" as const,
    }

    await Database.createUser(userData)
    console.log("User created successfully")

    return NextResponse.json({ message: "OTP sent successfully" })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
