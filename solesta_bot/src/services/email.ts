import nodemailer from 'nodemailer';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export async function sendOtpEmail(to: string, otp: string, isKrmu: boolean): Promise<boolean> {
  let email = to;
  if (isKrmu && !to.includes('@krmu.edu.in')) {
    email = `${to}@krmu.edu.in`;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Solesta '26 - Verification Code</h2>
      <p>Hello,</p>
      <p>Your verification code for Solesta '26 registration is:</p>
      <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
        ${otp}
      </div>
      <p><strong>This code expires in ${config.otpExpiryMinutes} minutes.</strong></p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
      <p style="color: #6B7280; font-size: 12px;">Solesta '26 | KR Mangalam University</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Solesta '26" <${config.smtpUser}>`,
      to: email,
      subject: "Solesta '26 - Verification Code",
      html,
    });
    logger.info(`OTP email sent successfully`, { to: email });
    return true;
  } catch (error) {
    logger.error('Failed to send OTP email', error, { to: email });
    return false;
  }
}

export async function sendConfirmationEmail(
  to: string,
  name: string,
  referenceId: string,
  isKrmu: boolean,
  qrCode?: string
): Promise<boolean> {
  let email = to;
  if (isKrmu && !to.includes('@krmu.edu.in')) {
    email = `${to}@krmu.edu.in`;
  }
  
  let qrImageHtml = '';
  if (qrCode) {
    qrImageHtml = `
      <div style="margin: 20px 0; text-align: center;">
        <p style="margin-bottom: 10px;"><strong>Your QR Ticket:</strong></p>
        <img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
      </div>
    `;
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
  `;

  try {
    await transporter.sendMail({
      from: `"Solesta '26" <${config.smtpUser}>`,
      to: email,
      subject: "Solesta '26 - Registration Confirmed!",
      html,
    });
    logger.info(`Confirmation email sent successfully`, { to: email, referenceId });
    return true;
  } catch (error) {
    logger.error('Failed to send confirmation email', error, { to: email, referenceId });
    return false;
  }
}

export async function testSmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed', error);
    return false;
  }
}