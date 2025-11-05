import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { sendWelcomeEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, userDetails } = await request.json()

    if (!email || !userDetails) {
      return NextResponse.json({ error: "Email and user details are required" }, { status: 400 })
    }

    const user = await Database.findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validate required fields
    if (!userDetails.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // For non-university users, roll number is still required but other details are optional
    if (!user.isFromUniversity) {
      if (!userDetails.rollNumber) {
        return NextResponse.json({ error: "Roll number is required" }, { status: 400 })
      }
    }

    // Update user with provided details
    await Database.updateUser(user._id.toString(), {
      name: userDetails.name,
      rollNumber: userDetails.rollNumber || user.rollNumber,
      courseAndSemester: userDetails.courseAndSemester || undefined,
      year: userDetails.year || undefined,
      registrationStatus: "details_confirmed",
    })

    try {
      const config = await Database.getEventConfig()
      await sendWelcomeEmail(email, userDetails.name, config.paymentAmount)
      console.log("Welcome email sent to:", email)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
    }

    return NextResponse.json({ message: "Registration completed successfully" })
  } catch (error) {
    console.error("Complete registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
