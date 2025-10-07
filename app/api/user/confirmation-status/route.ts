import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
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
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has a roll number and if it exists in the roll number database
    let rollNumberExists = false
    if (user.rollNumber) {
      // For admin users, don't require roll number validation
      if (user.role === "admin") {
        rollNumberExists = true
      } else {
        const rollNumberData = await Database.findRollNumberData(user.rollNumber)
        rollNumberExists = !!rollNumberData
      }
    }

    return NextResponse.json({
      hasConfirmedDetails: user.registrationStatus === "details_confirmed" || user.registrationStatus === "confirmed",
      hasRollNumber: !!user.rollNumber,
      rollNumberExists,
      email: user.email,
      needsDetailsConfirmation: user.role === "admin" ? false : (!user.rollNumber || !rollNumberExists || (user.registrationStatus === "pending")),
      registrationStatus: user.registrationStatus,
      paymentStatus: user.paymentStatus,
      role: user.role
    })
  } catch (error) {
    console.error("Confirmation status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}