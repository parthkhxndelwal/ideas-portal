import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { verifyPaymentSignature } from "@/lib/razorpay"
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

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ 
        error: "Missing payment details" 
      }, { status: 400 })
    }

    // Verify the signature to ensure this is a legitimate payment from Razorpay
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValidSignature) {
      return NextResponse.json({ 
        error: "Invalid payment signature" 
      }, { status: 400 })
    }

    // Find the transaction
    const transaction = await Database.findTransactionByRazorpayOrderId(razorpay_order_id)
    if (!transaction) {
      return NextResponse.json({ 
        error: "Transaction not found" 
      }, { status: 404 })
    }

    // Verify the transaction belongs to the user
    if (transaction.userId !== decoded.userId) {
      return NextResponse.json({ 
        error: "Unauthorized transaction access" 
      }, { status: 403 })
    }

    // Update transaction with payment details
    await Database.updateTransactionByRazorpayOrderId(razorpay_order_id, {
      status: "completed",
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentCaptured: true,
    })

    // Update user payment status
    await Database.updateUser(decoded.userId, {
      registrationStatus: "confirmed",
      paymentStatus: "completed",
      transactionId: transaction.transactionId,
    })

    // Send confirmation email
    try {
      const user = await Database.findUserById(decoded.userId)
      if (user && user.email && user.name && user.rollNumber) {
        const config = await Database.getEventConfig()
        
        // Get user's selected subevent information
        let subeventName: string | undefined
        let venue: string | undefined
        let qrCodeBuffer: Buffer | undefined
        
        if (user.selectedSubEvent) {
          const subevent = await Database.getSubEventById(user.selectedSubEvent)
          if (subevent) {
            subeventName = subevent.name
            venue = subevent.venue
            
            // Generate QR code for the user
            const QRCode = await import("qrcode")
            const qrData = JSON.stringify({
              rollNumber: user.rollNumber,
              name: user.name,
              subevent: subevent.name,
              venue: subevent.venue,
              transactionId: transaction.transactionId,
              timestamp: new Date().toISOString(),
            })
            
            qrCodeBuffer = await QRCode.toBuffer(qrData, {
              type: 'png',
              width: 300,
              margin: 2,
            })
          }
        }
        
        await sendPaymentConfirmationEmail(
          user.email, 
          user.name, 
          transaction.transactionId, 
          user.rollNumber,
          config.paymentAmount,
          subeventName,
          venue,
          qrCodeBuffer
        )
        console.log("Payment confirmation email sent to:", user.email)
      }
    } catch (emailError) {
      console.error("Failed to send payment confirmation email:", emailError)
    }

    return NextResponse.json({ 
      message: "Payment verified and completed successfully",
      transactionId: transaction.transactionId
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ 
      error: "Failed to verify payment" 
    }, { status: 500 })
  }
}
