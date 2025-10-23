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

    const registrations = await Database.getAllRegistrationData()

    // Convert to CSV format
    if (registrations.length === 0) {
      return new NextResponse("No registration data available", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=registrations.csv",
        },
      })
    }

    // Define fixed headers in specific order
    const headers = [
      "email",
      "role",
      "isEmailVerified",
      "rollNumber",
      "name",
      "courseAndSemester",
      "year",
      "registrationStatus",
      "paymentStatus",
      "transactionId",
      "createdAt",
      "updatedAt"
    ]

    const csvData = registrations
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
        "Content-Disposition": "attachment; filename=registrations.csv",
      },
    })
  } catch (error) {
    console.error("Export registrations API error:", error)
    return NextResponse.json({ error: "Failed to export registrations" }, { status: 500 })
  }
}
