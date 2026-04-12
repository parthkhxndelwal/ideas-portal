import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { sendConfirmationEmail } from './email';
import QRCode from 'qrcode';
import { Telegraf, Context } from 'telegraf';
import { encryptQR, decryptQR } from '../utils/crypto';

interface QRSendResult {
  success: boolean;
  telegramSent: boolean;
  emailSent: boolean;
  message: string;
}

export async function sendQRToUser(
  refId: string,
  telegramId: string,
  telegram: any,
  email: string,
  name: string,
  isKrmu: boolean
): Promise<QRSendResult> {
  const registration = await prisma.registration.findUnique({
    where: { referenceId: refId },
  });

  if (!registration) {
    return { success: false, telegramSent: false, emailSent: false, message: 'Registration not found' };
  }

  if (!registration.feePaid) {
    return { success: false, telegramSent: false, emailSent: false, message: 'Payment not confirmed' };
  }

  // Generate QR if missing
  let qrCode = registration.qrCode;
  if (!qrCode) {
    const rawData = `${refId}:${registration.rollNumber || ''}:${refId}`;
    const encryptedData = encryptQR(rawData);
    qrCode = await QRCode.toDataURL(encryptedData);
    await prisma.registration.update({
      where: { referenceId: refId },
      data: { qrCode },
    });
  }

  let telegramSent = registration.qrSentTelegram;
  let emailSent = registration.qrSentEmail;
  const now = new Date();

  // Send via Telegram if not already sent
  if (!telegramSent) {
    try {
      await telegram.sendMessage(
        telegramId,
        `🎉 *Solesta '26 - Registration Confirmed!*\n\n*Name:* ${name}\n*Reference ID:* ${refId}\n\nYour QR ticket is below.`,
        { parse_mode: 'Markdown' }
      );
      await telegram.sendPhoto(
        telegramId,
        { source: Buffer.from(qrCode.split(',')[1], 'base64') },
        { caption: `🎫 Solesta '26 Ticket - ${name}` }
      );
      telegramSent = true;
      logger.info('QR sent via Telegram', { refId, name });
    } catch (e: any) {
      logger.error('Telegram send failed', e, { refId });
      await prisma.registration.update({
        where: { referenceId: refId },
        data: { 
          telegramRetryCount: { increment: 1 },
          lastTelegramAttempt: now,
        },
      });
    }
  }

  // Send email if not already sent
  if (!emailSent) {
    try {
      await sendConfirmationEmail(email, name, refId, isKrmu, qrCode);
      emailSent = true;
      logger.info('QR sent via Email', { refId, name, email });
    } catch (e: any) {
      logger.error('Email send failed', e, { refId });
      await prisma.registration.update({
        where: { referenceId: refId },
        data: { 
          emailRetryCount: { increment: 1 },
          lastEmailAttempt: now,
        },
      });
    }
  }

  // Update tracking fields
  await prisma.registration.update({
    where: { referenceId: refId },
    data: { 
      qrSentTelegram: telegramSent,
      qrSentEmail: emailSent,
    },
  });

  return {
    success: telegramSent || emailSent,
    telegramSent,
    emailSent,
    message: telegramSent && emailSent 
      ? 'QR sent via Telegram and Email' 
      : telegramSent 
        ? 'QR sent via Telegram only' 
        : emailSent 
          ? 'QR sent via Email only' 
          : 'Failed to send QR',
  };
}

export async function resendQRToUser(
  refId: string,
  telegram: any
): Promise<QRSendResult> {
  const registration = await prisma.registration.findUnique({
    where: { referenceId: refId },
  });

  if (!registration) {
    return { success: false, telegramSent: false, emailSent: false, message: 'Not found' };
  }

  if (!registration.feePaid) {
    return { success: false, telegramSent: false, emailSent: false, message: 'Payment not confirmed' };
  }

  // Generate QR if missing
  let qrCode = registration.qrCode;
  if (!qrCode) {
    const rawData = `${refId}:${registration.rollNumber || ''}:${refId}`;
    const encryptedData = encryptQR(rawData);
    qrCode = await QRCode.toDataURL(encryptedData);
    await prisma.registration.update({
      where: { referenceId: refId },
      data: { qrCode },
    });
  }

  const now = new Date();
  let telegramSent = false;
  let emailSent = false;

  // Always attempt Telegram send
  try {
    await telegram.sendMessage(
      registration.telegramId,
      `🎉 *Solesta '26 - QR Ticket Resent!*\n\n*Name:* ${registration.name}\n*Reference ID:* ${refId}\n\nYour QR ticket is below.`,
      { parse_mode: 'Markdown' }
    );
    await telegram.sendPhoto(
      registration.telegramId,
      { source: Buffer.from(qrCode.split(',')[1], 'base64') },
      { caption: `🎫 Solesta '26 Ticket - ${registration.name}` }
    );
    telegramSent = true;
    logger.info('QR resent via Telegram', { refId, name: registration.name });
  } catch (e: any) {
    logger.error('Telegram resend failed', e, { refId });
  }

  // Always attempt email send  
  try {
    await sendConfirmationEmail(registration.email, registration.name, refId, registration.isKrmu, qrCode || registration.qrCode || undefined);
    emailSent = true;
    logger.info('QR resent via Email', { refId, name: registration.name, email: registration.email });
  } catch (e: any) {
    logger.error('Email resend failed', e, { refId });
  }

  await prisma.registration.update({
    where: { referenceId: refId },
    data: { 
      qrSentTelegram: telegramSent,
      qrSentEmail: emailSent,
      telegramRetryCount: telegramSent ? 0 : { increment: 1 },
      emailRetryCount: emailSent ? 0 : { increment: 1 },
      lastTelegramAttempt: now,
      lastEmailAttempt: now,
    },
  });

  return {
    success: telegramSent || emailSent,
    telegramSent,
    emailSent,
    message: telegramSent && emailSent 
      ? 'QR resent via Telegram and Email' 
      : telegramSent 
        ? 'QR resent via Telegram only' 
        : emailSent 
          ? 'QR resent via Email only' 
          : 'Failed to resend QR',
  };
}

export async function resendAllPending(telegram: any): Promise<{ total: number; success: number; failed: number }> {
  const pending = await prisma.registration.findMany({
    where: { 
      feePaid: true,
      telegramId: { not: null },
      OR: [
        { qrSentEmail: false },
        { qrSentTelegram: false },
      ],
    },
  });

  let success = 0;
  let failed = 0;

  for (const reg of pending) {
    if (!reg.telegramId) {
      failed++;
      continue;
    }
    try {
      const result = await sendQRToUser(
        reg.referenceId,
        reg.telegramId,
        telegram,
        reg.email,
        reg.name,
        reg.isKrmu
      );
      if (result.success) success++;
      else failed++;
    } catch (e) {
      logger.error('Resend failed', e, { refId: reg.referenceId });
      failed++;
    }
  }

  logger.info('Resend all complete', { total: pending.length, success, failed });
  return { total: pending.length, success, failed };
}