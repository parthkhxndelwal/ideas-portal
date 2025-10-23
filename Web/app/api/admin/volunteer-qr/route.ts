import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { sendVolunteerQR } from "@/lib/email"
import { encryptVolunteerQRData } from "@/lib/crypto"

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

    const { rollNumber, personalEmail } = await request.json()

    if (!rollNumber) {
      return NextResponse.json({ error: "Roll number is required" }, { status: 400 })
    }

    // Generate encoded QR data
    const encryptedQrData = encryptVolunteerQRData(rollNumber)
    const universityEmail = `${rollNumber}@krmu.edu.in`

    await sendVolunteerQR(universityEmail, rollNumber, encryptedQrData)

    if (personalEmail) {
      await sendVolunteerQR(personalEmail, rollNumber, encryptedQrData)
    }

    return NextResponse.json({ message: "Volunteer QR sent successfully" })
  } catch (error) {
    console.error("Volunteer QR error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
