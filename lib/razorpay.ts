import Razorpay from "razorpay"
import crypto from "crypto"

// Initialize Razorpay instance
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

/**
 * Verify Razorpay webhook signature
 * This ensures the webhook is genuinely from Razorpay
 */
export function verifyWebhookSignature(
  webhookBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(webhookBody)
      .digest("hex")
    
    return expectedSignature === signature
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return false
  }
}

/**
 * Verify Razorpay payment signature from frontend
 * This verifies the payment response received from Razorpay Checkout
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const body = orderId + "|" + paymentId
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex")
    
    return expectedSignature === signature
  } catch (error) {
    console.error("Payment signature verification failed:", error)
    return false
  }
}
