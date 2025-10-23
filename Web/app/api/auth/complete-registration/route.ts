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

    await Database.updateUser(user._id.toString(), {
      name: userDetails.name,
      courseAndSemester: userDetails.courseAndSemester,
      year: userDetails.year,
      registrationStatus: "details_confirmed",
    })

    try {
      await sendWelcomeEmail(email, userDetails.name)
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
