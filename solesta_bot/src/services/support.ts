import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export interface CreateTicketData {
  telegramId: string;
  name: string;
  email?: string;
  message: string;
}

export async function createSupportTicket(data: CreateTicketData) {
  const ticket = await prisma.supportTicket.create({
    data: {
      telegramId: data.telegramId,
      name: data.name,
      email: data.email,
      message: data.message,
      status: 'open',
    },
  });

  logger.info('Support ticket created', { telegramId: data.telegramId, ticketId: ticket.id });
  return ticket;
}

export async function getOpenTickets() {
  return prisma.supportTicket.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllTickets() {
  return prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function resolveTicket(ticketId: string, adminResponse: string) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'resolved',
      adminResponse,
    },
  });

  logger.info('Ticket resolved', { ticketId, adminResponse });
  return ticket;
}

export async function getTicketById(ticketId: string) {
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
}

export async function getTicketByTelegramId(telegramId: string) {
  return prisma.supportTicket.findFirst({
    where: { telegramId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOpenTicketCount() {
  return prisma.supportTicket.count({
    where: { status: 'open' },
  });
}