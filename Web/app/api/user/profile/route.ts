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

    // Get pending transactions for the user
    const pendingTransactions = await Database.findPendingTransactionsByUserId(decoded.userId)

    // Get completed transaction if exists
    let completedTransaction = null
    if (user.transactionId) {
      completedTransaction = await Database.findTransaction(user.transactionId)
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        courseAndSemester: user.courseAndSemester,
        isFromUniversity: user.isFromUniversity ?? true,
        registrationStatus: user.registrationStatus,
        paymentStatus: user.paymentStatus,
        transactionId: user.transactionId,
        paymentAmount: completedTransaction?.amount,
        referenceId: user.referenceId,
      },
      pendingTransactions: pendingTransactions.map(t => ({
        id: t._id.toString(),
        transactionId: t.transactionId,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
      })),
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
