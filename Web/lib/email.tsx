import * as nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import * as QRCode from "qrcode"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Helper function to get logo URLs for inline embedding
function getLogoUrls() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://solesta.krmangalam.edu.in"

  return {
    krLogo: `${baseUrl}/kr-logo.png`,
    solestaLogo: `${baseUrl}/solesta-email.png`
  }
}

function renderBrandHeader(krLogoUrl?: string, solestaLogoUrl?: string) {
  if (!krLogoUrl || !solestaLogoUrl) {
    // Fallback to text if logos aren't available
    return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="color: #dc2626; margin: 0;">KR Mangalam University</h2>
      <h3 style="color: #2563eb; margin: 5px 0 0 0;">Solesta</h3>
    </div>
  `
  }

  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block;">
        <img src="${krLogoUrl}" alt="KR Mangalam University" style="height: 48px; width: auto; margin-right: 20px; vertical-align: middle;" />
        <img src="${solestaLogoUrl}" alt="Solesta" style="height: 48px; width: auto; vertical-align: middle;" />
      </div>
    </div>
  `
}

function renderEmailTemplate(content: string, krLogoUrl?: string, solestaLogoUrl?: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Solesta</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .email-content { padding: 20px; }
        .email-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-content">
          ${renderBrandHeader(krLogoUrl, solestaLogoUrl)}
          ${content}
        </div>
        <div class="email-footer">
          <p>Need help? Contact us at <a href="mailto:krmuevents@krmangalam.edu.in" style="color: #2563eb;">krmuevents@krmangalam.edu.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const logoUrls = getLogoUrls()
    
    const content = `
      <h2>Solesta - Email Verification</h2>
      <p>Your OTP for email verification is:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Solesta - Email Verification",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
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
    const logoUrls = getLogoUrls()
    
    // Generate QR code as buffer for attachment
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 300,
      margin: 2,
    })

    const content = `
      <h2>Solesta - Volunteer Entry QR</h2>
      <p>Hello,</p>
      <p>Your volunteer entry QR code for Solesta is ready!</p>
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
      <p>Thank you for volunteering at Solesta!</p>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Solesta - Volunteer Entry QR",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
      attachments: [
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
    const logoUrls = getLogoUrls()
    
    const content = `
      <h2>Solesta - Email Verification (Resent)</h2>
      <p>Your new OTP for email verification is:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Solesta - Resend Email Verification",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
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
    const logoUrls = getLogoUrls()
    
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    const content = `
      <h2>Solesta - Password Reset</h2>
      <p>You requested a password reset for your Solesta account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Solesta - Password Reset",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
    }

    await transporter.sendMail(mailOptions)
    console.log("Password reset email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    throw new Error("Failed to send password reset email")
  }
}

export async function sendWelcomeEmail(email: string, name: string, paymentAmount: number) {
  try {
    const logoUrls = getLogoUrls()
    
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/`
    const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paymentAmount)

    const content = `
      <h2>Welcome to Solesta, ${name}!</h2>
      <p>Your account has been successfully created. To complete your registration and secure your spot at Solesta, you need to complete the payment process.</p>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin-top: 0;">Next Steps:</h3>
        <ol style="color: #374151;">
          <li>Log in to your account</li>
          <li>Complete the payment of ${formattedAmount}</li>
          <li>Download your registration documents</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Registration</a>
      </div>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to Solesta - Complete Your Registration",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
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
  paymentAmount: number,
  subeventName?: string,
  venue?: string,
  qrCodeBuffer?: Buffer,
) {
  try {
    const logoUrls = getLogoUrls()
    
    const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard`
    const receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/documents/receipt?transactionId=${transactionId}`
    const registrationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/documents/registration?rollNumber=${rollNumber}`
    const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paymentAmount)

    const content = `
      <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <h2 style="color: #166534; margin-top: 0;">🎉 Payment Confirmed!</h2>
        <p style="color: #166534; margin-bottom: 0;">Your registration for Solesta is now complete!</p>
      </div>
      
      <h3>Hello ${name},</h3>
      <p>Congratulations! Your payment has been successfully processed and your registration for Solesta is now confirmed.</p>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h4 style="margin-top: 0;">Registration Details:</h4>
        ${subeventName ? `<p><strong>Event Registered for:</strong> ${subeventName}</p>` : ''}
        ${venue ? `<p><strong>Venue to report to:</strong> ${venue}</p>` : ''}
        <p><strong>Roll Number:</strong> ${rollNumber}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
        <p><strong>Status:</strong> Confirmed ✅</p>
      </div>

      ${qrCodeBuffer && qrCodeBuffer.length > 0 ? `
      <div style="text-align: center; margin: 20px 0;">
        <h4>Your Entry QR Code</h4>
        <div style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 8px; margin: 10px 0;">
          <img src="cid:payment-qr" alt="Entry QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd;" />
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">Present this QR code at the venue for entry</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">(QR code also attached as image file)</p>
      </div>
      ` : ''}
      
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
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Solesta - Payment Confirmed! Registration Complete",
      html: renderEmailTemplate(content, logoUrls.krLogo, logoUrls.solestaLogo),
      attachments: qrCodeBuffer && qrCodeBuffer.length > 0 ? [
        {
          filename: `entry-qr-${rollNumber}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: 'payment-qr'
        }
      ] : [],
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
  transactionId: string
  paymentAmount: number
  qrCodeBuffer?: Buffer
  pdfBuffer?: Buffer
  subeventName?: string
  venue?: string
  paymentMethod?: string
  temporaryPassword?: string
}

export async function sendManualRegistrationEmail({
  email,
  name,
  rollNumber,
  transactionId,
  paymentAmount,
  qrCodeBuffer,
  pdfBuffer,
  subeventName,
  venue,
  paymentMethod = "Cash",
  temporaryPassword,
}: ManualRegistrationEmailOptions) {
  try {
    const logoUrls = getLogoUrls()
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const portalUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paymentAmount)

    const attachments: NonNullable<SendMailOptions["attachments"]> = []
    if (pdfBuffer) {
      attachments.push({
        filename: `entry-document-${rollNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      })
    }

    // Add QR code as attachment if provided
    if (qrCodeBuffer && qrCodeBuffer.length > 0) {
      attachments.push({
        filename: `entry-qr-${rollNumber}.png`,
        content: qrCodeBuffer,
        contentType: 'image/png',
        cid: 'manual-qr'
      })
    }

    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Successfully registered for the IDEAS Event!",
      html: renderEmailTemplate(`
        <h2 style="color: #111827;">You're all set for Solesta, ${name}!</h2>
        <p style="color: #374151;">We're excited to confirm that your registration and payment have been recorded successfully. Welcome aboard!</p>

        ${subeventName && venue ? `
        <div style="padding: 20px; margin: 24px 0; text-align: center;">
          <h2 style="margin: 0 0 8px 0; color: #111827;">Registered for</h2>
          <h1 style="margin: 0 0 8px 0; color: #dc2626; font-size: 28px;">${subeventName}</h1>
          <h3 style="margin: 0; color: #6b7280;">at ${venue}</h3>
        </div>
        ` : subeventName ? `
        <div style="padding: 20px; margin: 24px 0; text-align: center;">
          <h2 style="margin: 0 0 8px 0; color: #111827;">Registered for</h2>
          <h1 style="margin: 0 0 8px 0; color: #dc2626; font-size: 28px;">${subeventName}</h1>
        </div>
        ` : venue ? `
        <div style="padding: 20px; margin: 24px 0; text-align: center;">
          <h3 style="margin: 0; color: #6b7280;">at ${venue}</h3>
        </div>
        ` : ''}

        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #047857;">Registration Details:</h3>
          <p style="margin: 4px 0;"><strong>Roll Number:</strong> ${rollNumber}</p>
          <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ${formattedAmount}</p>
          <p style="margin: 4px 0;"><strong>Payment Mode:</strong> ${paymentMethod}</p>
        </div>

        ${temporaryPassword ? `
        <div style="background: #e0f2fe; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #1d4ed8;">Portal Access</h3>
          <p style="margin: 4px 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          <p style="margin: 12px 0 0 0; color: #1f2937;">Visit <a href="${portalUrl}" style="color: #1d4ed8; text-decoration: none;">${portalUrl}</a> to sign in and update your password after first login.</p>
        </div>
        ` : ""}

        ${qrCodeBuffer && qrCodeBuffer.length > 0 ? `
        <div style="text-align: center; margin: 30px 0;">
          <h3 style="margin-bottom: 12px; color: #111827;">Your Entry QR Code</h3>
          <div style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 12px; margin: 10px 0;">
            <img src="cid:manual-qr" alt="Entry QR Code" style="max-width: 200px; height: auto; border: 1px solid #e5e7eb; border-radius: 8px;" />
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">Present this QR code at the venue for entry</p>
          
        </div>
        ` : ""}

        ${pdfBuffer ? `
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; color: #92400e;">Entry Document Attached</h3>
          <p style="margin: 0; color: #78350f;">We've attached your IDEAS entry document as a PDF. Please download it and keep it handy for venue access.</p>
        </div>
        ` : ""}
        <div style="background: #b3d9ffff; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #000000ff; font-size: 12px; margin-top: 8px;">This QR Code will be valid for use <span style="color: red;">once</span> per day. <br> Once the entry is done, it can't be used until the next day.</p>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #111827;">Important Instructions</h3>
          <ul style="padding-left: 20px; color: #374151;">
            <li>Bring the attached entry document and a valid ID to the event.</li>
            <li>Present your QR code at the venue entrance for entry verification.</li>
            <li>Arrive at the venue on time as specified in your registration details.</li>
          </ul>
        </div>
      `, logoUrls.krLogo, logoUrls.solestaLogo),
      attachments,
    }

    await transporter.sendMail(mailOptions)
    console.log("Manual registration email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send manual registration email:", error)
    throw new Error("Failed to send manual registration email")
  }
}
