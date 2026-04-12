import { prisma } from './prisma';
import { config } from './config';
import { generateOtp, hashCode, verifyCode } from './crypto';
import { sendOtpEmail } from './email';

export interface CreateOtpResult {
  success: boolean;
  message: string;
}

export async function createAndSendOtp(
  userId: string,
  email: string,
  isKrmu: boolean
): Promise<CreateOtpResult> {
  const existingOtp = await prisma.otp.findFirst({
    where: { userId, isUsed: false },
    orderBy: { createdAt: 'desc' },
  });

  if (existingOtp) {
    const timeSinceCreation = Date.now() - existingOtp.createdAt.getTime();
    const cooldownMs = 60 * 1000;

    if (timeSinceCreation < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
      return {
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
      };
    }
  }

  const otp = generateOtp();
  const hashedCode = await hashCode(otp);
  const expiresAt = new Date(
    Date.now() + config.otpExpiryMinutes * 60 * 1000
  );

  await prisma.otp.create({
    data: {
      userId,
      email,
      code: otp,
      hashedCode,
      expiresAt,
      retryCount: 0,
    },
  });

  const emailSent = await sendOtpEmail(email, otp, isKrmu);

  if (!emailSent) {
    return {
      success: false,
      message: 'Failed to send OTP email. Please try again later.',
    };
  }

  let displayEmail = email;
  if (isKrmu && !email.includes('@krmu.edu.in')) {
    displayEmail = `${email}@krmu.edu.in`;
  }
  return {
    success: true,
    message: `OTP sent to ${displayEmail}. Valid for ${config.otpExpiryMinutes} minutes.`,
  };
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

export async function verifyOtp(
  userId: string,
  code: string
): Promise<VerifyOtpResult> {
  const otpRecord = await prisma.otp.findFirst({
    where: { userId, isUsed: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return { success: false, message: 'No OTP found. Please request a new OTP.' };
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    return { success: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  if (otpRecord.retryCount >= config.otpMaxRetries) {
    return {
      success: false,
      message: 'Maximum retry limit exceeded. Please request a new OTP.',
    };
  }

  const isValid = await verifyCode(code, otpRecord.hashedCode);

  if (!isValid) {
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { retryCount: { increment: 1 } },
    });
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return { success: true, message: 'OTP verified successfully!' };
}

export async function canRequestOtp(
  userId: string
): Promise<{ allowed: boolean; message: string }> {
  const otpRecord = await prisma.otp.findFirst({
    where: { userId, isUsed: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return { allowed: true, message: '' };
  }

  if (otpRecord.retryCount >= config.otpMaxRetries) {
    return {
      allowed: false,
      message: 'Maximum retry limit exceeded. Please request a new OTP.',
    };
  }

  if (otpRecord.expiresAt.getTime() > Date.now()) {
    const remainingSeconds = Math.ceil(
      (otpRecord.expiresAt.getTime() - Date.now()) / 1000
    );
    if (remainingSeconds > 0) {
      return { allowed: false, message: `Please wait ${remainingSeconds} seconds.` };
    }
  }

  return { allowed: true, message: '' };
}