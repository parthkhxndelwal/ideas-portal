import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, hashPassword } from "@/lib/auth"
import { Database } from "@/lib/database"
import { sendManualRegistrationEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyJWT(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await Database.findUserById(decoded.userId)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { rollNumber, email, password, name, courseAndSemester } = await request.json()

    if (!rollNumber || !email || !password || !name || !courseAndSemester) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const existingUser = await Database.findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const userData = {
      email,
      password: hashedPassword,
      role: "participant" as const,
      isEmailVerified: true,
      rollNumber,
      name,
      courseAndSemester,
      registrationStatus: "pending" as const,
      paymentStatus: "pending" as const,
    }

    await Database.createUser(userData)

    // Send welcome email to the student with their login credentials
    try {
      await sendManualRegistrationEmail(email, name, rollNumber, password)
      console.log(`Manual registration email sent to ${email} with login credentials`)
    } catch (emailError) {
      console.error("Failed to send manual registration email:", emailError)
      // Don't fail the registration if email fails, just log the error
    }

    return NextResponse.json({ message: "Student registered successfully and welcome email sent" })
  } catch (error) {
    console.error("Manual registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
