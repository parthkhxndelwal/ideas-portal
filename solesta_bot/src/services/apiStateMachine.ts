import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { UserState, StateData } from './stateMachine';

export interface UserIdentifier {
  telegramId?: string;
  externalAppId?: string;
}

export async function getOrCreateUserByIdentifier(
  identifier: UserIdentifier,
  username?: string,
  firstName?: string
): Promise<any> {
  const where = identifier.telegramId ? { telegramId: identifier.telegramId } : { externalAppId: identifier.externalAppId };

  let user = await prisma.user.findUnique({ where });

  if (!user) {
    try {
      const createData: any = {
        username,
        firstName,
        state: UserState.START,
      };
      if (identifier.telegramId) createData.telegramId = identifier.telegramId;
      if (identifier.externalAppId) createData.externalAppId = identifier.externalAppId;

      user = await prisma.user.create({ data: createData });
      logger.info('New user created', identifier);
    } catch (error: any) {
      if (error.code === 'P2002') {
        user = await prisma.user.findUnique({ where });
      } else {
        throw error;
      }
    }
  } else {
    if (username || firstName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { ...(username && { username }), ...(firstName && { firstName }) },
      });
    }
  }

  return user;
}

export async function updateUserState(
  identifier: UserIdentifier,
  state: UserState,
  stateData?: StateData,
  additionalData?: Partial<{ isVerified: boolean; isKrmu: boolean; isFresher?: boolean }>
): Promise<void> {
  const where = identifier.telegramId ? { telegramId: identifier.telegramId } : { externalAppId: identifier.externalAppId };

  await prisma.user.update({
    where,
    data: {
      state,
      stateData: stateData as unknown as Record<string, any> || undefined,
      ...additionalData,
    },
  });
  logger.info('User state updated', { identifier, state });
}

export async function getUserByIdentifier(identifier: UserIdentifier): Promise<any> {
  const where = identifier.telegramId ? { telegramId: identifier.telegramId } : { externalAppId: identifier.externalAppId };

  return prisma.user.findUnique({
    where,
    include: { registration: true },
  });
}

export async function updateStateData(identifier: UserIdentifier, data: Partial<StateData>): Promise<void> {
  const where = identifier.telegramId ? { telegramId: identifier.telegramId } : { externalAppId: identifier.externalAppId };

  const user = await prisma.user.findUnique({ where });
  const currentData = (user?.stateData as StateData) || {};
  const newData = { ...currentData, ...data };

  await prisma.user.update({
    where,
    data: { stateData: newData as unknown as Record<string, any> },
  });
}

export async function clearStateData(identifier: UserIdentifier): Promise<void> {
  const where = identifier.telegramId ? { telegramId: identifier.telegramId } : { externalAppId: identifier.externalAppId };

  await prisma.user.update({
    where,
    data: { stateData: {} as unknown as Record<string, any> },
  });
}