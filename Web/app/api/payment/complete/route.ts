import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { sendPaymentConfirmationEmail } from "@/lib/email"

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

    const { transactionId, otp } = await request.json()

    if (otp !== "1234") {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    const transaction = await Database.findTransaction(transactionId)
    if (!transaction || transaction.userId !== decoded.userId) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    await Database.updateTransaction(transactionId, "completed")
    await Database.updateUser(decoded.userId, {
      registrationStatus: "confirmed",
      paymentStatus: "completed",
      transactionId,
    })

    try {
      const user = await Database.findUserById(decoded.userId)
      if (user && user.email && user.name && user.rollNumber) {
        await sendPaymentConfirmationEmail(user.email, user.name, transactionId, user.rollNumber)
        console.log("Payment confirmation email sent to:", user.email)
      }
    } catch (emailError) {
      console.error("Failed to send payment confirmation email:", emailError)
    }

    return NextResponse.json({ message: "Payment completed successfully" })
  } catch (error) {
    console.error("Payment completion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
