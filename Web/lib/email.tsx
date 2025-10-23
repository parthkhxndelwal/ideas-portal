import nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import QRCode from "qrcode"
import fs from "fs"
import path from "path"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Helper function to get logo attachments
function getLogoAttachments() {
  const publicPath = path.join(process.cwd(), "public")
  return [
    {
      filename: "kr-logo.png",
      path: path.join(publicPath, "kr-logo.png"),
      cid: "kr-logo",
    },
    {
      filename: "ideas-email.png",
      path: path.join(publicPath, "ideas-email.png"),
      cid: "ideas-logo",
    },
  ]
}

function renderBrandHeader() {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block;">
        <img src="cid:kr-logo" alt="KR Mangalam University" style="height: 48px; width: auto; margin-right: 20px; vertical-align: middle;" />
        <img src="cid:ideas-logo" alt="IDEAS" style="height: 48px; width: auto; vertical-align: middle;" />
      </div>
    </div>
  `
}

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          <h2>IDEAS Portal - Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      attachments: getLogoAttachments(),
    }

    await transporter.sendMail(mailOptions)
    console.log("OTP email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send OTP email:", error)
    throw new Error("Failed to send verification email")
  }
}

export async function sendVolunteerQR(email: string, rollNumber: string, qrData: string) {
  try {
    // Generate QR code as buffer for attachment
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 300,
      margin: 2,
    })

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Volunteer Entry QR",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          <h2>IDEAS Portal - Volunteer Entry QR</h2>
          <p>Hello,</p>
          <p>Your volunteer entry QR code for IDEAS 3.0 is ready!</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <p><strong>Roll Number:</strong> ${rollNumber}</p>
            <div style="margin: 20px 0;">
              <img src="cid:volunteer-qr" alt="Volunteer QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd;" />
            </div>
          </div>
          <p><strong>Important Instructions:</strong></p>
          <ul style="text-align: left; margin: 20px 0; padding-left: 20px;">
            <li>The QR code is attached to this email as an image file</li>
            <li>If you can't see the QR code above, please check the email attachments</li>
            <li>Download and save the QR code to your phone for easy access</li>
            <li>Present this QR code at the venue for entry</li>
          </ul>
          <p>Thank you for volunteering at IDEAS 3.0!</p>
        </div>
      `,
      attachments: [
        ...getLogoAttachments(),
        {
          filename: `volunteer-qr-${rollNumber}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: 'volunteer-qr'
        }
      ]
    }

    await transporter.sendMail(mailOptions)
    console.log("Volunteer QR email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send volunteer QR email:", error)
    throw new Error("Failed to send volunteer QR email")
  }
}

export async function sendResendOTPEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Resend Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          <h2>IDEAS Portal - Email Verification (Resent)</h2>
          <p>Your new OTP for email verification is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      attachments: getLogoAttachments(),
    }

    await transporter.sendMail(mailOptions)
    console.log("Resend OTP email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send resend OTP email:", error)
    throw new Error("Failed to send verification email")
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          <h2>IDEAS Portal - Password Reset</h2>
          <p>You requested a password reset for your IDEAS Portal account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      attachments: getLogoAttachments(),
    }

    await transporter.sendMail(mailOptions)
    console.log("Password reset email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    throw new Error("Failed to send password reset email")
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to IDEAS Portal - Complete Your Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          
          <h2>Welcome to IDEAS Portal, ${name}!</h2>
          <p>Your account has been successfully created. To complete your registration and secure your spot at IDEAS 3.0, you need to complete the payment process.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Next Steps:</h3>
            <ol style="color: #374151;">
              <li>Log in to your account</li>
              <li>Complete the payment of ₹200</li>
              <li>Download your registration documents</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Registration</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you have any questions, please contact us at support.ideas.krmu@gmail.com</p>
        </div>
      `,
      attachments: getLogoAttachments(),
    }

    await transporter.sendMail(mailOptions)
    console.log("Welcome email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    throw new Error("Failed to send welcome email")
  }
}

export async function sendPaymentConfirmationEmail(
  email: string,
  name: string,
  transactionId: string,
  rollNumber: string,
  _paymentAmount: number = 200,
) {
  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard`
    const receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/documents/receipt?transactionId=${transactionId}`
    const registrationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/documents/registration?rollNumber=${rollNumber}`

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Payment Confirmed! Registration Complete",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${renderBrandHeader()}
          
          <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h2 style="color: #166534; margin-top: 0;">🎉 Payment Confirmed!</h2>
            <p style="color: #166534; margin-bottom: 0;">Your registration for IDEAS 3.0 is now complete!</p>
          </div>
          
          <h3>Hello ${name},</h3>
          <p>Congratulations! Your payment has been successfully processed and your registration for IDEAS 3.0 is now confirmed.</p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Registration Details:</h4>
            <p><strong>Roll Number:</strong> ${rollNumber}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Amount Paid:</strong> ₹200</p>
            <p><strong>Status:</strong> Confirmed ✅</p>
          </div>
          
          <h4>Download Your Documents:</h4>
          <div style="margin: 20px 0;">
            <div style="margin-bottom: 10px;">
              <a href="${receiptUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">📄 Download Payment Receipt</a>
            </div>
            <div>
              <a href="${registrationUrl}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">🎫 Download Entry QR Document</a>
            </div>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Please bring your Entry QR document to the venue for entry verification.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you have any questions, please contact us at support.ideas.krmu@gmail.com</p>
        </div>
      `,
      attachments: getLogoAttachments(),
    }

    await transporter.sendMail(mailOptions)
    console.log("Payment confirmation email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error)
    throw new Error("Failed to send payment confirmation email")
  }
}

interface ManualRegistrationEmailOptions {
  email: string
  name: string
  rollNumber: string
  password: string
  transactionId: string
  paymentAmount: number
  qrCodeBuffer?: Buffer
  pdfBuffer?: Buffer
}

export async function sendManualRegistrationEmail({
  email,
  name,
  rollNumber,
  password,
  transactionId,
  paymentAmount,
  qrCodeBuffer,
  pdfBuffer,
}: ManualRegistrationEmailOptions) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const _loginUrl = `${baseUrl}/`
    const dashboardUrl = `${baseUrl}/dashboard`
    const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paymentAmount)

    const attachments: NonNullable<SendMailOptions["attachments"]> = [...getLogoAttachments()]
    if (qrCodeBuffer) {
      attachments.push({
        filename: `entry-qr-${rollNumber}.png`,
        content: qrCodeBuffer,
        contentType: "image/png",
        cid: "entry-qr",
      })
    }
    if (pdfBuffer) {
      attachments.push({
        filename: `entry-document-${rollNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      })
    }

    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Successfully registered for the IDEAS Event!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          ${renderBrandHeader()}

          <h2 style="color: #111827;">You're all set for IDEAS 3.0, ${name}!</h2>
          <p style="color: #374151;">We’re excited to confirm that your registration and payment have been recorded successfully. Welcome aboard!</p>

          <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #047857;">Registration Summary</h3>
            <p style="margin: 4px 0;"><strong>Roll Number:</strong> ${rollNumber}</p>
            <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
            <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ${formattedAmount}</p>
            <p style="margin: 4px 0;"><strong>Payment Mode:</strong> Cash (Manual Registration)</p>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #1d4ed8;">Portal Login Credentials</h3>
            <p style="margin: 6px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 6px 0;"><strong>Roll Number:</strong> ${rollNumber}</p>
            <p style="margin: 6px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 6px; font-family: monospace;">${password}</code></p>
            <p style="color: #ef4444; font-size: 14px; margin-top: 12px;">Please change your password after your first login.</p>
          </div>

          ${qrCodeBuffer ? `
          <div style="text-align: center; margin: 30px 0;">
            <h3 style="margin-bottom: 12px; color: #111827;">Your Entry QR Code</h3>
            <img src="cid:entry-qr" alt="Entry QR Code" style="max-width: 220px; width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: white;" />
          </div>
          ` : ""}

          ${pdfBuffer ? `
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 8px 0; color: #92400e;">Entry Document Attached</h3>
            <p style="margin: 0; color: #78350f;">We've attached your IDEAS entry document as a PDF. Please download it and keep it handy for venue access.</p>
          </div>
          ` : ""}

          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #111827;">Next Steps</h3>
            <ol style="padding-left: 20px; color: #374151;">
              <li>Log in to the IDEAS Portal using the credentials above.</li>
              <li>Review your profile information and update anything that’s missing.</li>
              <li>Bring the attached entry document and a valid ID to the event.</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${dashboardUrl}" style="background: #dc2626; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Open IDEAS Portal</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Need help? Reach us at <a href="mailto:support.ideas.krmu@gmail.com" style="color: #2563eb;">support.ideas.krmu@gmail.com</a>.</p>
        </div>
      `,
      attachments,
    }

    await transporter.sendMail(mailOptions)
    console.log("Manual registration email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send manual registration email:", error)
    throw new Error("Failed to send manual registration email")
  }
}
