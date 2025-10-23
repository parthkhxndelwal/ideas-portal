import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { generateRegistrationPDF } from "@/lib/pdf-generator"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rollNumberParam = searchParams.get("rollNumber")
    
    let user

    // Check if accessing via roll number (from email link)
    if (rollNumberParam) {
      user = await Database.findUserByRollNumber(rollNumberParam)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      
      // Ensure user has confirmed registration status AND completed payment
      if (user.registrationStatus !== "confirmed") {
        return NextResponse.json({ error: "Registration not confirmed" }, { status: 400 })
      }
      
      // Ensure payment is completed before generating QR code
      if (user.paymentStatus !== "completed") {
        return NextResponse.json({ error: "Payment not completed. QR code cannot be generated until payment is confirmed." }, { status: 400 })
      }
    } else {
      // Check for JWT authentication (for logged-in users)
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)
      if (!decoded) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }

      user = await Database.findUserById(decoded.userId)
      if (!user || user.registrationStatus !== "confirmed") {
        return NextResponse.json({ error: "Registration not confirmed" }, { status: 400 })
      }
      
      // Ensure payment is completed before generating QR code
      if (user.paymentStatus !== "completed") {
        return NextResponse.json({ error: "Payment not completed. QR code cannot be generated until payment is confirmed." }, { status: 400 })
      }
    }

    const pdfBuffer = await generateRegistrationPDF(user)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="registration-document.pdf"',
      },
    })
  } catch (error) {
    console.error("Registration document generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
