/**
 * Email sending service
 * Uses nodemailer to send emails via Office365 SMTP
 */

import nodemailer from "nodemailer"
import config from "../config.js"
import { isValidEmail } from "./utils.js"

let transporter = null

/**
 * Initialize email transporter
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })
  }
  return transporter
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection() {
  try {
    const t = getTransporter()
    await t.verify()
    console.log("✓ SMTP connection verified")
    return true
  } catch (error) {
    console.error("✗ SMTP connection failed:", error.message)
    return false
  }
}

/**
 * Send QR ticket email (using bot's template)
 */
export async function sendQREmail(to, name, referenceId, isKrmu, qrCode) {
  try {
    if (!to) {
      throw new Error("Email address is required")
    }

    let email = to
    // Auto-append @krmu.edu.in for KRMU students if not already present
    if (isKrmu && !to.includes("@krmu.edu.in")) {
      email = `${to}@krmu.edu.in`
    }

    // Validate email format before attempting to send
    if (!isValidEmail(email)) {
      throw new Error(`Invalid email format: ${email}`)
    }

    let qrImageHtml = ""
    const attachments = []

    if (qrCode) {
      // Check if it's a data URL (base64) and convert to attachment
      if (qrCode.startsWith("data:image")) {
        // Convert data URL to buffer
        const base64Data = qrCode.replace(/^data:image\/png;base64,/, "")
        const imageBuffer = Buffer.from(base64Data, "base64")

        attachments.push({
          filename: "qr-ticket.png",
          content: imageBuffer,
          cid: "qr-image@solesta26", // Content ID for embedded image
        })

        qrImageHtml = `
          <div style="margin: 20px 0; text-align: center;">
            <p style="margin-bottom: 10px;"><strong>Your QR Ticket:</strong></p>
            <img src="cid:qr-image@solesta26" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #10B981; padding: 10px;" />
          </div>
        `
      } else {
        // It's a URL - use directly
        qrImageHtml = `
          <div style="margin: 20px 0; text-align: center;">
            <p style="margin-bottom: 10px;"><strong>Your QR Ticket:</strong></p>
            <img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #10B981; padding: 10px;" />
          </div>
        `
      }
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">🎉 Registration Confirmed!</h2>
        <p>Hello ${name},</p>
        <p>Your registration for Solesta '26 has been confirmed!</p>
        ${qrImageHtml}
        <div style="background: #F3F4F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p><strong>Reference ID:</strong> ${referenceId}</p>
        </div>
        <p>We're excited to see you at the event!</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">Solesta '26 | KR Mangalam University</p>
      </div>
    `

    const t = getTransporter()
    const mailOptions = {
      from: `"Solesta '26" <${config.smtpUser}>`,
      to: email,
      subject: "Solesta '26 - Registration Confirmed!",
      html,
    }

    // Add attachments if any
    if (attachments.length > 0) {
      mailOptions.attachments = attachments
    }

    const result = await t.sendMail(mailOptions)

    console.log(`  ✓ Email sent to ${email}`)
    return {
      success: true,
      messageId: result.messageId,
      email,
    }
  } catch (error) {
    console.error(`  ✗ Email send failed: ${error.message}`)
    return {
      success: false,
      error: error.message,
      email: to,
    }
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(to) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">✓ Test Email - Solesta QR System</h2>
        <p>Hello,</p>
        <p>This is a test email from the Solesta QR approval script.</p>
        <p>If you received this, the email system is working correctly and QR codes will be sent to all approved participants.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">Solesta '26 | KR Mangalam University</p>
      </div>
    `

    const t = getTransporter()
    const result = await t.sendMail({
      from: `"Solesta '26" <${config.smtpUser}>`,
      to,
      subject: "✓ Solesta QR System - Test Email",
      html,
    })

    return {
      success: true,
      messageId: result.messageId,
      email: to,
    }
  } catch (error) {
    console.error(`✗ Test email failed: ${error.message}`)
    return {
      success: false,
      error: error.message,
      email: to,
    }
  }
}

export default {
  testSmtpConnection,
  sendQREmail,
  sendTestEmail,
  getTransporter,
}
