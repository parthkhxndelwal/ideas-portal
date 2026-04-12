import { prisma } from './prisma';

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

export async function getOrCreateUserByExternalAppId(
  externalAppId: string
): Promise<any> {
  let user = await prisma.user.findUnique({
    where: { externalAppId },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          externalAppId,
          state: UserState.START,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        user = await prisma.user.findUnique({
          where: { externalAppId },
        });
      } else {
        throw error;
      }
    }
  }

  return user;
}

export async function getUserByExternalAppId(
  externalAppId: string
): Promise<any> {
  return prisma.user.findUnique({
    where: { externalAppId },
    include: { registration: true },
  });
}

export async function updateUserState(
  identifier: { externalAppId: string },
  state: UserState,
  stateData?: StateData
): Promise<void> {
  await prisma.user.update({
    where: { externalAppId: identifier.externalAppId },
    data: {
      state,
      stateData: (stateData as unknown as Record<string, any>) || undefined,
    },
  });
}

export async function updateStateData(
  identifier: { externalAppId: string },
  data: Partial<StateData>
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { externalAppId: identifier.externalAppId },
  });

  const currentData = (user?.stateData as StateData) || {};
  const newData = { ...currentData, ...data };

  await prisma.user.update({
    where: { externalAppId: identifier.externalAppId },
    data: { stateData: newData as unknown as Record<string, any> },
  });
}

export async function isEmailVerifiedRecently(
  externalAppId: string,
  deviceToken: string,
  hoursValid: number = 48
): Promise<{ valid: boolean; message: string; email?: string }> {
  const user = await prisma.user.findUnique({
    where: { externalAppId },
  });

  if (!user || !user.verifiedAt) {
    return { valid: false, message: 'Email not verified.' };
  }

  const stateData = user.stateData as any;
  const storedToken = stateData?.deviceToken;
  const storedEmail = stateData?.email;
  
  if (storedToken !== deviceToken) {
    return { valid: false, message: 'Email verification tied to different device.' };
  }

  const hoursSinceVerification = (Date.now() - user.verifiedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceVerification > hoursValid) {
    return { valid: false, message: 'Verification expired. Please verify again.' };
  }

  return { valid: true, message: 'Verified.', email: storedEmail };
}

export async function markEmailAsVerified(
  externalAppId: string,
  deviceToken: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { externalAppId },
  });

  const currentData = (user?.stateData as any) || {};
  
  await prisma.user.update({
    where: { externalAppId },
    data: { 
      isVerified: true,
      verifiedAt: new Date(),
      stateData: {
        ...currentData,
        deviceToken
      }
    },
  });
}

export async function requireEmailVerification(
  externalAppId: string,
  deviceToken: string,
  hoursValid: number = 48
): Promise<{ valid: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { externalAppId },
  });

  if (!user || !user.verifiedAt) {
    return { valid: false, message: 'Email not verified. Please verify your email first.' };
  }

  const stateData = user.stateData as any;
  const storedToken = stateData?.deviceToken;
  
  if (storedToken !== deviceToken) {
    return { valid: false, message: 'Verification tied to different device.' };
  }

  const hoursSinceVerification = (Date.now() - user.verifiedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceVerification > hoursValid) {
    return { valid: false, message: 'Email verification expired. Please verify your email again.' };
  }

  return { valid: true, message: 'Email verified.' };
}