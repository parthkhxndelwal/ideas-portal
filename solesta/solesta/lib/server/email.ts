import nodemailer from 'nodemailer';
import { config } from './config';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export async function sendOtpEmail(
  email: string,
  otp: string,
  isKrmu: boolean
): Promise<boolean> {
  const subject = isKrmu
    ? 'Your KRMU Email Verification Code - Solesta 2026'
    : 'Your Email Verification Code - Solesta 2026';

  const html = isKrmu
    ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Solesta 2026 - Email Verification</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in ${config.otpExpiryMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Solesta 2026 - KRMU Annual Fest</p>
      </div>`
    : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Solesta 2026 - Email Verification</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in ${config.otpExpiryMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Solesta 2026 - KRMU Annual Fest</p>
      </div>`;

  try {
    await transporter.sendMail({
      from: `"Solesta 2026" <${config.smtpUser}>`,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}

export async function sendConfirmationEmail(
  email: string,
  name: string,
  referenceId: string
): Promise<boolean> {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Solesta 2026 - Registration Confirmed!</h2>
    <p>Hello ${name},</p>
    <p>Your registration has been confirmed!</p>
    <p><strong>Reference ID:</strong> ${referenceId}</p>
    <p>See you at Solesta 2026!</p>
    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 12px;">Solesta 2026 - KRMU Annual Fest</p>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Solesta 2026" <${config.smtpUser}>`,
      to: email,
      subject: 'Solesta 2026 - Registration Confirmed!',
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return false;
  }
}