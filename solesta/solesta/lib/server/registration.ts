import { prisma } from './prisma';
import { config } from './config';
import { isReferenceIdUnique, encryptQR } from './crypto';

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
}

export async function createRegistration(
  data: CreateRegistrationData
): Promise<string> {
  const existingRegistrations = await prisma.registration.findMany({
    select: { referenceId: true },
  });

  const collisions = existingRegistrations.map((r) => r.referenceId);
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

  await prisma.registration.create({
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

  return referenceId;
}

export async function getRegistrationByExternalAppId(
  externalAppId: string
): Promise<any> {
  return prisma.registration.findFirst({
    where: { externalAppId },
  });
}

export async function getRegistrationByReferenceId(
  referenceId: string
): Promise<any> {
  try {
    // Try exact match first (case-sensitive)
    let registration = await prisma.registration.findUnique({
      where: { referenceId },
    });
    
    if (registration) {
      return registration;
    }
    
    // MongoDB allows case-insensitive search using regex
    const registrations = await prisma.registration.findMany({
      where: {
        referenceId: {
          // This is MongoDB-specific syntax for case-insensitive search
          contains: referenceId,
          mode: 'insensitive'
        }
      },
      take: 1
    });
    
    if (registrations.length > 0) {
      return registrations[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for registration:', error);
    return null;
  }
}

export async function checkDuplicateRegistration(
  rollNumber?: string,
  email?: string
): Promise<{ exists: boolean; registration?: any; reason?: string }> {
  // Check for existing registration by roll number
  if (rollNumber) {
    const existingByRoll = await prisma.registration.findFirst({
      where: { rollNumber }
    });
    
    if (existingByRoll) {
      return {
        exists: true,
        registration: existingByRoll,
        reason: 'A registration already exists with this roll number'
      };
    }
  }
  
  // Check for existing registration by email
  if (email) {
    const existingByEmail = await prisma.registration.findFirst({
      where: { email }
    });
    
    if (existingByEmail) {
      return {
        exists: true,
        registration: existingByEmail,
        reason: 'A registration already exists with this email'
      };
    }
  }
  
  return { exists: false };
}

export async function markPaymentSuccessful(
  referenceId: string
): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { referenceId },
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  const qrCode = `${referenceId}:${registration.rollNumber || ''}:${referenceId}`;
  const encryptedData = encryptQR(qrCode);

  await prisma.registration.update({
    where: { referenceId },
    data: {
      feePaid: true,
      paymentDate: new Date(),
      qrCode: encryptedData,
    },
  });
}

export async function sendTicketToUser(
  externalAppId: string
): Promise<boolean> {
  const registration = await prisma.registration.findFirst({
    where: { externalAppId },
    include: { user: true },
  });

  if (!registration) {
    return false;
  }

  if (!registration.feePaid) {
    return false;
  }

  await prisma.registration.update({
    where: { referenceId: registration.referenceId },
    data: { qrSentTelegram: true },
  });

  return true;
}

export async function getStatistics(): Promise<any> {
  const [total, krmuCount, externalCount, paidCount, fresherCount] =
    await Promise.all([
      prisma.registration.count(),
      prisma.registration.count({ where: { isKrmu: true } }),
      prisma.registration.count({ where: { isKrmu: false } }),
      prisma.registration.count({ where: { feePaid: true } }),
      prisma.registration.count({ where: { isFresher: true } }),
    ]);

  return {
    total,
    krmu: krmuCount,
    external: externalCount,
    paid: paidCount,
    fresher: fresherCount,
  };
}