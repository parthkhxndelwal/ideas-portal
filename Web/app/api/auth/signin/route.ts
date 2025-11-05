import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateJWT } from "@/lib/auth"
import { validateEmailWithTLD } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    console.log("Signin request received")
    const { email, password } = await request.json()

    if (!email || !password) {
      console.log("Missing email or password")
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const emailValidation = validateEmailWithTLD(email)
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error || "Invalid email format" }, { status: 400 })
    }

    console.log("Authenticating user:", email)
    const user = await authenticateUser(email, password)
    if (!user) {
      console.log("Authentication failed for:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.role === "participant" && !user.isEmailVerified) {
      console.log("Email not verified for participant:", email)
      return NextResponse.json({ error: "Please verify your email first" }, { status: 401 })
    }

    console.log("Generating JWT for user:", user._id)
    const token = generateJWT(user._id.toString(), user.email, user.role)

    console.log("Signin successful for:", email)
    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        rollNumber: user.rollNumber,
        registrationStatus: user.registrationStatus,
        paymentStatus: user.paymentStatus,
      },
      // Add a flag to indicate if user needs to confirm details
      needsDetailsConfirmation: user.role === "participant" && user.registrationStatus === "pending",
      // Add a flag to indicate if user needs to set password
      needsPasswordChange: user.needsPasswordChange === true,
    })
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
