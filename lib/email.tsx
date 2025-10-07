import nodemailer from "nodemailer"
import QRCode from "qrcode"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>IDEAS Portal - Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
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
        {
          filename: `volunteer-qr-${rollNumber}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: 'volunteer-qr' // Content-ID for embedding in HTML
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
          <h2>IDEAS Portal - Email Verification (Resent)</h2>
          <p>Your new OTP for email verification is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
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
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 18px;">KR</span>
              </div>
              <div style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;">IDEAS</div>
            </div>
          </div>
          
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
  paymentAmount: number = 200,
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
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 18px;">KR</span>
              </div>
              <div style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;">IDEAS</div>
            </div>
          </div>
          
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
    }

    await transporter.sendMail(mailOptions)
    console.log("Payment confirmation email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error)
    throw new Error("Failed to send payment confirmation email")
  }
}

export async function sendManualRegistrationEmail(email: string, name: string, rollNumber: string, password: string) {
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "IDEAS Portal - Your Account Has Been Created",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 18px;">KR</span>
              </div>
              <div style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;">IDEAS</div>
            </div>
          </div>
          
          <h2>Welcome to IDEAS Portal, ${name}!</h2>
          <p>Your account has been manually created by the administration. You can now log in and complete your registration for IDEAS 3.0.</p>
          
          <div style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">Your Login Credentials:</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Roll Number:</strong> ${rollNumber}</p>
            <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            <p style="color: #dc2626; font-size: 14px; margin-top: 16px;"><strong>Please change your password after logging in!</strong></p>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Next Steps:</h3>
            <ol style="color: #374151;">
              <li>Log in to your account using the credentials above</li>
              <li>Change your password in your profile settings</li>
              <li>Complete the payment of ₹200</li>
              <li>Download your registration documents</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your Account</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you have any questions, please contact us at support.ideas.krmu@gmail.com</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Manual registration email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send manual registration email:", error)
    throw new Error("Failed to send manual registration email")
  }
}
