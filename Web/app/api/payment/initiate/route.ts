import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, generateTransactionId } from "@/lib/auth"
import { Database } from "@/lib/database"

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
    if (amount !== 200) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const transactionId = generateTransactionId()

    await Database.createTransaction({
      userId: decoded.userId,
      amount,
      status: "pending",
      transactionId,
    })

    return NextResponse.json({ transactionId })
  } catch (error) {
    console.error("Payment initiation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
