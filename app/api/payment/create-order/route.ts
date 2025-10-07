import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { razorpayInstance } from "@/lib/razorpay"
import crypto from "crypto"

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

    const { amount } = await request.json()

    // Validate amount with configured payment amount
    const config = await Database.getEventConfig()
    if (amount !== config.paymentAmount) {
      return NextResponse.json({ 
        error: "Invalid payment amount. Please refresh and try again." 
      }, { status: 400 })
    }

    const user = await Database.findUserById(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user already has a completed payment
    if (user.paymentStatus === "completed") {
      return NextResponse.json({ 
        error: "Payment already completed" 
      }, { status: 400 })
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

    // Create Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: transactionId,
      notes: {
        userId: decoded.userId,
        userEmail: user.email,
        userName: user.name || "",
        rollNumber: user.rollNumber || "",
      },
    })

    // Store transaction in database
    await Database.createTransaction({
      userId: decoded.userId,
      amount,
      status: "pending",
      transactionId,
      razorpayOrderId: razorpayOrder.id,
    })

    // Return order details to frontend
    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      transactionId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ 
      error: "Failed to create payment order" 
    }, { status: 500 })
  }
}
