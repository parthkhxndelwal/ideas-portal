import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export enum UserState {
  START = 'START',
  SELECT_INSTITUTION = 'SELECT_INSTITUTION',
  ENTER_ROLL_NUMBER = 'ENTER_ROLL_NUMBER',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  MANUAL_DETAILS = 'MANUAL_DETAILS',
  ENTER_EMAIL = 'ENTER_EMAIL',
  ENTER_NAME = 'ENTER_NAME',
  ENTER_COLLEGE = 'ENTER_COLLEGE',
  ENTER_COLLEGE_ROLL = 'ENTER_COLLEGE_ROLL',
  SELECT_YEAR = 'SELECT_YEAR',
  FRESHER_SELECTION = 'FRESHER_SELECTION',
  DISPLAY_FEE = 'DISPLAY_FEE',
  REFERENCE_ID = 'REFERENCE_ID',
  CONFIRM_COPY = 'CONFIRM_COPY',
  PAYMENT_LINK = 'PAYMENT_LINK',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  COMPLETED = 'COMPLETED',
  SUPPORT_FLOW = 'SUPPORT_FLOW',
}

export interface StateData {
  institution?: 'krmu' | 'external';
  rollNumber?: string;
  email?: string;
  name?: string;
  course?: string;
  year?: string;
  college?: string;
  collegeRoll?: string;
  isFresher?: boolean;
  feeAmount?: number;
  referenceId?: string;
  otpSent?: boolean;
  replyingToTicket?: string;
  userTelegramId?: string;
  userName?: string;
}

export async function getOrCreateUser(telegramId: string, username?: string, firstName?: string): Promise<any> {
  let user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
          firstName,
          state: UserState.START,
        },
      });
      logger.info('New user created', { telegramId, username });
    } catch (error: any) {
      if (error.code === 'P2002') {
        user = await prisma.user.findUnique({
          where: { telegramId },
        });
      } else {
        throw error;
      }
    }
  } else {
    if (username || firstName) {
      user = await prisma.user.update({
        where: { telegramId },
        data: {
          ...(username && { username }),
          ...(firstName && { firstName }),
        },
      });
    }
  }

  return user;
}

export async function updateUserState(
  telegramId: string,
  state: UserState,
  stateData?: StateData,
  additionalData?: Partial<{ isVerified: boolean; isKrmu: boolean }>
): Promise<void> {
  await prisma.user.update({
    where: { telegramId },
    data: {
      state,
      stateData: stateData as unknown as Record<string, any> || undefined,
      ...additionalData,
    },
  });
  logger.info('User state updated', { telegramId, state });
}

export async function getUserByTelegramId(telegramId: string): Promise<any> {
  return prisma.user.findUnique({
    where: { telegramId },
    include: { registration: true },
  });
}

export async function updateStateData(telegramId: string, data: Partial<StateData>): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  const currentData = (user?.stateData as StateData) || {};
  const newData = { ...currentData, ...data };

  await prisma.user.updateMany({
    where: { telegramId },
    data: { stateData: newData as unknown as Record<string, any> },
  });
}

export async function updateStateDataAtomic(telegramId: string, data: Partial<StateData>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { telegramId },
    });

    const currentData = (user?.stateData as StateData) || {};
    const newData = { ...currentData, ...data };

    await tx.user.update({
      where: { telegramId },
      data: { stateData: newData as unknown as Record<string, any> },
    });
  });
}

export async function clearStateData(telegramId: string): Promise<void> {
  await prisma.user.update({
    where: { telegramId },
    data: { stateData: {} as unknown as Record<string, any> },
  });
}