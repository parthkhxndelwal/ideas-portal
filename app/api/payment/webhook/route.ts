import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyWebhookSignature } from "@/lib/razorpay"
import { sendPaymentConfirmationEmail } from "@/lib/email"

/**
 * Razorpay Webhook Handler
 * 
 * This endpoint receives webhook events from Razorpay.
 * It's the most secure way to confirm payments as it's server-to-server.
 * 
 * Configure this URL in your Razorpay Dashboard:
 * Settings > Webhooks > Add Webhook URL
 * URL: https://yourdomain.com/api/payment/webhook
 * Events to listen: payment.captured, payment.failed, order.paid
 */
export async function POST(request: NextRequest) {
  try {
    // Get the webhook signature from headers
    const signature = request.headers.get("x-razorpay-signature")
    if (!signature) {
      return NextResponse.json({ 
        error: "No signature provided" 
      }, { status: 400 })
    }

    // Get the raw body as text for signature verification
    const body = await request.text()
    
    // Verify the webhook signature
    const isValid = verifyWebhookSignature(
      body,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET!
    )

    if (!isValid) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ 
        error: "Invalid signature" 
      }, { status: 400 })
    }

    // Parse the webhook payload
    const event = JSON.parse(body)
    console.log("Webhook event received:", event.event)

    // Handle different webhook events
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity)
        break
      
      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity)
        break
      
      case "order.paid":
        await handleOrderPaid(event.payload.order.entity, event.payload.payment.entity)
        break
      
      default:
        console.log("Unhandled webhook event:", event.event)
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ 
      error: "Webhook processing failed" 
    }, { status: 500 })
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    console.log("Processing payment.captured for:", payment.id)
    
    const transaction = await Database.findTransactionByRazorpayOrderId(payment.order_id)
    if (!transaction) {
      console.error("Transaction not found for order:", payment.order_id)
      return
    }

    // Update transaction
    await Database.updateTransactionByRazorpayOrderId(payment.order_id, {
      status: "completed",
      razorpayPaymentId: payment.id,
      paymentMethod: payment.method,
      paymentCaptured: true,
    })

    // Update user
    await Database.updateUser(transaction.userId, {
      registrationStatus: "confirmed",
      paymentStatus: "completed",
      transactionId: transaction.transactionId,
    })

    // Send confirmation email
    const user = await Database.findUserById(transaction.userId)
    if (user && user.email && user.name && user.rollNumber) {
      const config = await Database.getEventConfig()
      await sendPaymentConfirmationEmail(
        user.email,
        user.name,
        transaction.transactionId,
        user.rollNumber,
        config.paymentAmount
      )
      console.log("Payment confirmation email sent to:", user.email)
    }
  } catch (error) {
    console.error("Error handling payment.captured:", error)
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    console.log("Processing payment.failed for:", payment.id)
    
    const transaction = await Database.findTransactionByRazorpayOrderId(payment.order_id)
    if (!transaction) {
      console.error("Transaction not found for order:", payment.order_id)
      return
    }

    // Update transaction with failure details
    await Database.updateTransactionByRazorpayOrderId(payment.order_id, {
      status: "failed",
      razorpayPaymentId: payment.id,
      errorCode: payment.error_code,
      errorDescription: payment.error_description,
    })

    console.log("Payment marked as failed:", transaction.transactionId)
  } catch (error) {
    console.error("Error handling payment.failed:", error)
  }
}

async function handleOrderPaid(order: any, payment: any) {
  try {
    console.log("Processing order.paid for:", order.id)
    
    const transaction = await Database.findTransactionByRazorpayOrderId(order.id)
    if (!transaction) {
      console.error("Transaction not found for order:", order.id)
      return
    }

    // Double-check if not already completed
    if (transaction.status === "completed") {
      console.log("Transaction already completed:", transaction.transactionId)
      return
    }

    // Update transaction
    await Database.updateTransactionByRazorpayOrderId(order.id, {
      status: "completed",
      razorpayPaymentId: payment.id,
      paymentMethod: payment.method,
      paymentCaptured: true,
    })

    // Update user
    await Database.updateUser(transaction.userId, {
      registrationStatus: "confirmed",
      paymentStatus: "completed",
      transactionId: transaction.transactionId,
    })

    // Send confirmation email
    const user = await Database.findUserById(transaction.userId)
    if (user && user.email && user.name && user.rollNumber) {
      const config = await Database.getEventConfig()
      await sendPaymentConfirmationEmail(
        user.email,
        user.name,
        transaction.transactionId,
        user.rollNumber,
        config.paymentAmount
      )
      console.log("Payment confirmation email sent to:", user.email)
    }
  } catch (error) {
    console.error("Error handling order.paid:", error)
  }
}
