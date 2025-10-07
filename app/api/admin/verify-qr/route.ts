import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { decryptVolunteerQRData } from "@/lib/crypto"

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

    const { qrData } = await request.json()

    if (!qrData) {
      return NextResponse.json({ error: "QR data is required" }, { status: 400 })
    }

    // Decrypt and validate the QR data
    const decryptedResult = await decryptVolunteerQRData(qrData)

    if (!decryptedResult.isValid) {
      return NextResponse.json({ 
        error: "Invalid QR code", 
        valid: false 
      }, { status: 400 })
    }

    // Check if the roll number exists in the database
    const rollNumberData = await Database.findRollNumberData(decryptedResult.rollNumber!)
    if (!rollNumberData) {
      return NextResponse.json({ 
        error: "Roll number not found in database", 
        valid: false,
        rollNumber: decryptedResult.rollNumber
      }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      rollNumber: decryptedResult.rollNumber,
      volunteerInfo: {
        name: rollNumberData.name,
        rollNumber: rollNumberData.rollnumber,
        courseAndSemester: rollNumberData.courseAndSemester,
        year: rollNumberData.year
      },
      message: "Valid volunteer QR code"
    })

  } catch (error) {
    console.error("QR verification error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      valid: false 
    }, { status: 500 })
  }
}