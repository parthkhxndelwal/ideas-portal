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
    const decryptedResult = decryptVolunteerQRData(qrData)

    if (!decryptedResult.isValid || !decryptedResult.rollNumber) {
      return NextResponse.json({ 
        error: "Invalid QR code", 
        valid: false 
      }, { status: 400 })
    }

    const { rollNumber, qrType, transactionId } = decryptedResult

    let volunteerInfo: {
      name: string
      rollNumber: string
      courseAndSemester: string
      year: string
    } | null = null

    if (qrType === "participant") {
      const user = await Database.findUserByRollNumber(rollNumber)
      if (!user) {
        return NextResponse.json({
          error: "Participant not found",
          valid: false,
          rollNumber,
        }, { status: 404 })
      }

      volunteerInfo = {
        name: user.name ?? "Not provided",
        rollNumber: user.rollNumber ?? rollNumber,
        courseAndSemester: user.courseAndSemester ?? "Not provided",
        year: user.year ?? "Not provided",
      }
    } else {
      // Default to volunteer data lookup
      const rollNumberData = await Database.findRollNumberData(rollNumber)
      if (!rollNumberData) {
        return NextResponse.json({ 
          error: "Roll number not found in database", 
          valid: false,
          rollNumber,
        }, { status: 404 })
      }

      volunteerInfo = {
        name: rollNumberData.name,
        rollNumber: rollNumberData.rollnumber,
        courseAndSemester: rollNumberData.courseAndSemester,
        year: rollNumberData.year,
      }
    }

    return NextResponse.json({
      valid: true,
      rollNumber,
      qrType,
      transactionId,
      volunteerInfo,
      message: "Valid QR code"
    })

  } catch (error) {
    console.error("QR verification error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      valid: false 
    }, { status: 500 })
  }
}