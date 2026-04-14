import { config } from "./config"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
})

export async function sendTicketLinkEmail(
  email: string,
  name: string,
  referenceId: string,
  ticketLink: string
): Promise<boolean> {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10B981;">🎉 Solesta '26 - Registration Confirmed!</h2>
    <p>Hello ${name},</p>
    <p>Your registration for Solesta '26 has been confirmed! Download your QR ticket using the link below.</p>
    
    <div style="background: #F3F4F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 15px 0;"><strong>Reference ID:</strong> ${referenceId}</p>
      <a href="${ticketLink}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download QR Ticket</a>
      <p style="color: #6B7280; font-size: 12px; margin: 15px 0 0 0;">This link expires in 72 hours</p>
    </div>
    
    <p>If you can't click the button above, copy this link:</p>
    <p style="word-break: break-all; color: #4F46E5;"><code>${ticketLink}</code></p>
    
    <p>We're excited to see you at Solesta '26!</p>
    
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
    <p style="color: #6B7280; font-size: 12px;">Solesta '26 | KR Mangalam University</p>
  </div>`

  try {
    await transporter.sendMail({
      from: `"Solesta '26" <${config.smtpUser}>`,
      to: email,
      subject: "Solesta '26 - Your Registration & QR Ticket",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send ticket link email:", error)
    return false
  }
}

export async function sendUpdateEmailNotification(
  oldEmail: string,
  newEmail: string,
  name: string,
  referenceId: string,
  ticketLink: string
): Promise<boolean> {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #F59E0B;">📧 Email Updated - New QR Ticket Link</h2>
    <p>Hello ${name},</p>
    <p>Your email address for Solesta '26 registration has been updated from <code>${oldEmail}</code> to <code>${newEmail}</code>.</p>
    <p>Your previous ticket download link has been deactivated for security. Please use the new link below:</p>
    
    <div style="background: #F3F4F6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 15px 0;"><strong>Reference ID:</strong> ${referenceId}</p>
      <a href="${ticketLink}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download QR Ticket</a>
      <p style="color: #6B7280; font-size: 12px; margin: 15px 0 0 0;">This link expires in 72 hours</p>
    </div>
    
    <p>If you didn't request this change, please contact us immediately.</p>
    
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
    <p style="color: #6B7280; font-size: 12px;">Solesta '26 | KR Mangalam University</p>
  </div>`

  try {
    await transporter.sendMail({
      from: `"Solesta '26" <${config.smtpUser}>`,
      to: newEmail,
      subject: "Solesta '26 - Email Updated & New QR Ticket Link",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send email update notification:", error)
    return false
  }
}
