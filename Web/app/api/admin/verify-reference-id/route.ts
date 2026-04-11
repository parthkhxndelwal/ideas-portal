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

    const user = await Database.findUserById(decoded.userId)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { referenceId } = await request.json()
    if (!referenceId) {
      return NextResponse.json({ error: "Reference ID required" }, { status: 400 })
    }

    const result = await Database.verifyReferenceId(referenceId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Verification failed" }, { status: 400 })
    }

    // Send confirmation email to the user
    if (result.userId) {
      try {
        const userToEmail = await Database.findUserById(result.userId)
        if (userToEmail && userToEmail.email && userToEmail.name && userToEmail.rollNumber) {
          const config = await Database.getEventConfig()
          
          let subeventName: string | undefined
          let venue: string | undefined
          let qrCodeBuffer: Buffer | undefined
          
          if (userToEmail.selectedSubEvent) {
            const subevent = await Database.getSubEventById(userToEmail.selectedSubEvent)
            if (subevent) {
              subeventName = subevent.name
              venue = subevent.venue
              
              const QRCode = await import("qrcode")
              const qrData = JSON.stringify({
                rollNumber: userToEmail.rollNumber,
                name: userToEmail.name,
                subevent: subevent.name,
                venue: subevent.venue,
                timestamp: new Date().toISOString(),
              })
              
              qrCodeBuffer = await QRCode.toBuffer(qrData, {
                type: 'png',
                width: 300,
                margin: 2,
              })
            }
          }

          const refId = await Database.getReferenceIdForUser(result.userId)
          
          await sendPaymentConfirmationEmail(
            userToEmail.email,
            userToEmail.name,
            refId?.referenceId || "N/A",
            userToEmail.rollNumber,
            config.paymentAmount,
            subeventName,
            venue,
            qrCodeBuffer
          )
          console.log("Confirmation email sent to:", userToEmail.email)
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError)
      }
    }

    return NextResponse.json({ 
      message: "Reference ID verified successfully",
      userId: result.userId
    })
  } catch (error) {
    console.error("Reference ID verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || undefined

    const refIds = await Database.getAllReferenceIds(status || undefined)
    const stats = await Database.getReferenceIdStats()

    return NextResponse.json({
      referenceIds: refIds,
      stats
    })
  } catch (error) {
    console.error("Error fetching reference IDs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}