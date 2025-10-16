import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

// GET: Fetch the current payment amount from event config
export async function GET(_request: NextRequest) {
  try {
    const config = await Database.getEventConfig()
    return NextResponse.json({ 
      paymentAmount: config.paymentAmount || 200 
    })
  } catch (error) {
    console.error("Error fetching payment amount:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment amount" },
      { status: 500 }
    )
  }
}

// POST: Update the payment amount (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Parse and validate the new amount
    const body = await request.json()
    const { paymentAmount } = body

    if (typeof paymentAmount !== "number" || paymentAmount < 0) {
      return NextResponse.json(
        { error: "Invalid payment amount. Must be a positive number." },
        { status: 400 }
      )
    }

    // Update the payment amount in the database
    await Database.updateEventConfig(paymentAmount, user.email)

    return NextResponse.json({
      success: true,
      paymentAmount,
      message: "Payment amount updated successfully",
    })
  } catch (error) {
    console.error("Error updating payment amount:", error)
    return NextResponse.json(
      { error: "Failed to update payment amount" },
      { status: 500 }
    )
  }
}
