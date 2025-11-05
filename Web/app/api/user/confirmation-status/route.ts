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
    let needsDetailsConfirmation = false

    // Admin users don't need confirmation
    if (user.role === "admin") {
      rollNumberExists = true
      needsDetailsConfirmation = false
    } 
    // Non-university users need to enter details manually
    else if (!user.isFromUniversity) {
      needsDetailsConfirmation = user.registrationStatus === "pending"
      rollNumberExists = true // Not applicable for non-university users
    }
    // University users need roll number validation
    else {
      if (user.rollNumber) {
        const rollNumberData = await Database.findRollNumberData(user.rollNumber)
        rollNumberExists = !!rollNumberData
      }
      needsDetailsConfirmation = !user.rollNumber || !rollNumberExists || user.registrationStatus === "pending"
    }

    return NextResponse.json({
      hasConfirmedDetails: user.registrationStatus === "details_confirmed" || user.registrationStatus === "subevent_selected" || user.registrationStatus === "confirmed",
      hasSelectedSubEvent: user.registrationStatus === "subevent_selected" || user.registrationStatus === "confirmed",
      hasRollNumber: !!user.rollNumber,
      rollNumberExists,
      email: user.email,
      needsDetailsConfirmation,
      needsSubEventSelection: user.registrationStatus === "details_confirmed",
      registrationStatus: user.registrationStatus,
      paymentStatus: user.paymentStatus,
      role: user.role,
      isFromUniversity: user.isFromUniversity
    })
  } catch (error) {
    console.error("Confirmation status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}