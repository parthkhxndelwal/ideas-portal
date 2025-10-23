import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || typeof decoded === "string" || decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const payments = await Database.getAllPaymentData()

    // Convert to CSV format
    if (payments.length === 0) {
      return new NextResponse("No payment data available", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=payments.csv",
        },
      })
    }

    // Define fixed headers in specific order
    const headers = [
      "userId",
      "amount",
      "status",
      "transactionId",
      "razorpayOrderId",
      "razorpayPaymentId",
      "razorpaySignature",
      "paymentMethod",
      "paymentCaptured",
      "errorCode",
      "errorDescription",
      "createdAt",
      "updatedAt"
    ]

    const csvData = payments
      .map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row]
            if (value instanceof Date) {
              return value.toISOString()
            }
            const stringValue = String(value || "")
            return stringValue.includes(",") ? `"${stringValue}"` : stringValue
          })
          .join(","),
      )
      .join("\n")

    const csv = `${headers.join(",")}\n${csvData}`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=payments.csv",
      },
    })
  } catch (error) {
    console.error("Export payments API error:", error)
    return NextResponse.json({ error: "Failed to export payments" }, { status: 500 })
  }
}
