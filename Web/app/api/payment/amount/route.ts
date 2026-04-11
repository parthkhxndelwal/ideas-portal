import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

// GET: Fetch the current payment amount and config
export async function GET(_request: NextRequest) {
  try {
    const config = await Database.getEventConfig()
    return NextResponse.json({ 
      paymentAmount: config.paymentAmount || 200,
      paymentMode: config.paymentMode || "manual",
      externalPaymentUrl: config.externalPaymentUrl || null,
      krMangalamPaymentUrl: config.krMangalamPaymentUrl || null,
      nonKrMangalamPaymentUrl: config.nonKrMangalamPaymentUrl || null,
      referenceIdPrefix: config.referenceIdPrefix || "EVT-",
      subEventSelectionMandatory: config.subEventSelectionMandatory ?? false
    })
  } catch (error) {
    console.error("Error fetching payment amount:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment amount" },
      { status: 500 }
    )
  }
}

// POST: Update the payment config (admin only)
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

    // Parse and validate the config
    const body = await request.json()
    const { paymentAmount, paymentMode, externalPaymentUrl, krMangalamPaymentUrl, nonKrMangalamPaymentUrl, referenceIdPrefix, subEventSelectionMandatory, subEvents } = body

    // Get current config for subEvents if not provided
    const currentConfig = await Database.getEventConfig()
    const currentSubEvents = subEvents !== undefined ? subEvents : currentConfig.subEvents

    if (typeof paymentAmount === "number" && paymentAmount < 0) {
      return NextResponse.json(
        { error: "Invalid payment amount. Must be a positive number." },
        { status: 400 }
      )
    }

    // Update the config in the database
    await Database.updateEventConfig(
      paymentAmount ?? currentConfig.paymentAmount,
      currentSubEvents,
      user.email,
      paymentMode,
      externalPaymentUrl,
      krMangalamPaymentUrl,
      nonKrMangalamPaymentUrl,
      referenceIdPrefix,
      subEventSelectionMandatory
    )

    return NextResponse.json({
      success: true,
      message: "Payment configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating payment config:", error)
    return NextResponse.json(
      { error: "Failed to update payment config" },
      { status: 500 }
    )
  }
}
