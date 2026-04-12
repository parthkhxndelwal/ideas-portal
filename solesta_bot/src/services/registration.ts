import { prisma } from '../db/prisma';
import { config } from '../utils/config';
import { generateReferenceId, isReferenceIdUnique, encryptQR } from '../utils/crypto';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';
import { sendConfirmationEmail } from './email';

export interface CreateRegistrationData {
  telegramId?: string;
  externalAppId?: string;
  name: string;
  email: string;
  rollNumber?: string;
  college?: string;
  course: string;
  year: string;
  isKrmu: boolean;
  isFresher?: boolean;
  skipOtp?: boolean;
}

export async function createRegistration(data: CreateRegistrationData): Promise<string> {
  const existingRegistrations = await prisma.registration.findMany({
    select: { referenceId: true },
  });
  
  const collisions = existingRegistrations.map(r => r.referenceId);
  const uniqueRefId = isReferenceIdUnique(collisions);

  const feeAmount = data.isKrmu ? config.feeKrmu : config.feeExternal;

  const userWhere = data.telegramId 
    ? { telegramId: data.telegramId } 
    : { externalAppId: data.externalAppId };
  
  const user = await prisma.user.findUnique({
    where: userWhere as any,
  });

  if (!user) {
    throw new Error('User not found');
  }

  const referenceId = uniqueRefId();
  
  const qrCodeData = `${referenceId}:${data.rollNumber || ''}:${referenceId}`;

  const registration = await prisma.registration.create({
    data: {
      referenceId,
      userId: user.id,
      telegramId: data.telegramId,
      externalAppId: data.externalAppId,
      name: data.name,
      email: data.email,
      rollNumber: data.rollNumber,
      college: data.college,
      course: data.course,
      year: data.year,
      isKrmu: data.isKrmu,
      isFresher: data.isFresher || false,
      feeAmount,
      qrCode: null,
      qrSentTelegram: false,
      qrSentEmail: false,
    },
  });

  const userUpdateWhere = data.telegramId 
    ? { telegramId: data.telegramId } 
    : { externalAppId: data.externalAppId };

  await prisma.user.update({
    where: userUpdateWhere as any,
    data: { isVerified: true, isKrmu: data.isKrmu },
  });

  logger.info('Registration created', { 
    telegramId: data.telegramId, 
    externalAppId: data.externalAppId,
    referenceId: registration.referenceId 
  });

  return registration.referenceId;
}

export async function getRegistrationByTelegramId(telegramId: string): Promise<any> {
  return prisma.registration.findFirst({
    where: { telegramId },
  });
}

export async function getRegistrationByExternalAppId(externalAppId: string): Promise<any> {
  return prisma.registration.findFirst({
    where: { externalAppId },
  });
}

export async function getRegistrationByReferenceId(referenceId: string): Promise<any> {
  return prisma.registration.findUnique({
    where: { referenceId },
  });
}

export async function markPaymentSuccessful(referenceId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { referenceId },
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  const rawData = `${referenceId}:${registration.rollNumber || ''}:${referenceId}`;
  const encryptedData = encryptQR(rawData);
  const qrCode = await QRCode.toDataURL(encryptedData);

  await prisma.registration.update({
    where: { referenceId },
    data: {
      feePaid: true,
      paymentDate: new Date(),
      qrCode,
      qrSentTelegram: false,
      qrSentEmail: false,
    },
  });

  logger.info('Payment marked successful, QR generated', { referenceId });
}

export async function sendTicketToUser(telegramId: string): Promise<boolean> {
  const registration = await prisma.registration.findFirst({
    where: { telegramId },
    include: { user: true },
  });

  if (!registration) {
    return false;
  }

  if (!registration.feePaid) {
    return false;
  }

  let qrCode = registration.qrCode;
  if (!qrCode) {
    const rawData = `${registration.referenceId}:${registration.rollNumber || ''}:${registration.referenceId}`;
    const encryptedData = encryptQR(rawData);
    qrCode = await QRCode.toDataURL(encryptedData);
    await prisma.registration.update({
      where: { referenceId: registration.referenceId },
      data: { qrCode, qrSentTelegram: true },
    });
  } else {
    await prisma.registration.update({
      where: { referenceId: registration.referenceId },
      data: { qrSentTelegram: true },
    });
  }

  logger.info('Ticket sent', { telegramId, referenceId: registration.referenceId });
  return true;
}

export async function getStatistics(): Promise<any> {
  const [total, krmuCount, externalCount, paidCount, fresherCount] = await Promise.all([
    prisma.registration.count(),
    prisma.registration.count({ where: { isKrmu: true } }),
    prisma.registration.count({ where: { isKrmu: false } }),
    prisma.registration.count({ where: { feePaid: true } }),
    prisma.registration.count({ where: { isFresher: true } }),
  ]);

  const byYear = await prisma.registration.groupBy({
    by: ['year'],
    _count: true,
  });

  return {
    total,
    krmu: krmuCount,
    external: externalCount,
    paid: paidCount,
    fresher: fresherCount,
    byYear: byYear.reduce((acc, item) => {
      acc[item.year] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

export async function getFilteredRegistrations(
  filter: { isKrmu?: boolean; year?: string; isFresher?: boolean }
): Promise<any[]> {
  return prisma.registration.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllRegistrations(): Promise<any[]> {
  return prisma.registration.findMany({
    orderBy: { createdAt: 'desc' },
  });
}