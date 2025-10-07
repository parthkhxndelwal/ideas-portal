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

    if (!decoded || decoded.role !== "admin") {
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

    const headers = Object.keys(payments[0]).join(",")
    const csvData = payments
      .map((row) =>
        Object.values(row)
          .map((value) => (typeof value === "string" && value.includes(",") ? `"${value}"` : value))
          .join(","),
      )
      .join("\n")

    const csv = `${headers}\n${csvData}`

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
