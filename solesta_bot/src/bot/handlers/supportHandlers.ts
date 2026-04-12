import { Telegraf, Context } from 'telegraf';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import { getUserByTelegramId, updateUserState, UserState, updateStateData } from '../../services/stateMachine';
import { createSupportTicket, getOpenTickets, resolveTicket, getTicketById, getTicketByTelegramId } from '../../services/support';
import { getRegistrationByTelegramId } from '../../services/registration';
import { Markup } from 'telegraf';
import { mainMenuKeyboard, adminMenuKeyboard } from '../../keyboards';
import { withTyping } from '../../utils/typing';

export function setupSupportHandlers(bot: Telegraf<Context>) {
  bot.action('support', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      await updateUserState(telegramId, UserState.SUPPORT_FLOW);
      
      await ctx.editMessageText(
        '💬 *Send a Message*\n\nType your message below. We\'ll get back to you shortly.',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
    } catch (error) {
      logger.error('Error in support action', error, { telegramId });
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });
}

export function setupSupportTextHandler(bot: Telegraf<Context>) {
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id.toString();
    
    if (!telegramId || !ctx.message || !('text' in ctx.message) || !ctx.message.text) {
      return next();
    }
    
    const text = ctx.message.text.trim();

    if (config.adminTelegramIds.includes(telegramId)) return next();
    if (text.startsWith('/')) return next();

    try {
      const user = await getUserByTelegramId(telegramId);
      
      if (user?.state === UserState.SUPPORT_FLOW) {
        await ctx.sendChatAction('typing');
        
        const registration = await getRegistrationByTelegramId(telegramId);
        const name = registration?.name || user.firstName || 'User';
        const email = registration?.email;

        await createSupportTicket({
          telegramId,
          name,
          email,
          message: text,
        });

        await updateUserState(telegramId, UserState.COMPLETED);
        
        await ctx.reply(
          '✅ Message sent!\n\nWe\'ll get back to you shortly.',
          mainMenuKeyboard()
        );

        for (const adminId of config.adminTelegramIds) {
          try {
            const ticket = await getTicketByTelegramId(telegramId);
            await ctx.telegram.sendMessage(
              adminId,
              `💬 *New Message*\n\n*From:* ${name}\n*Email:* ${email || 'N/A'}\n\n_${text}_`,
              { 
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[{ text: '💬 Reply', callback_data: `reply_${ticket?.id}` }]]
                }
              }
            );
          } catch (e) {
            logger.error('Failed to notify admin', e, { adminId });
          }
        }

logger.info('Message received', { telegramId, name });
        return;
      }

      const stateData = user?.stateData as any;
      if (stateData?.repliedToAdmin) {
        const registration = await getRegistrationByTelegramId(telegramId);
        const name = registration?.name || user.firstName || 'User';

        for (const adminId of config.adminTelegramIds) {
          try {
            await ctx.telegram.sendMessage(
              adminId,
              `💬 *Reply from ${name}*\n\n_${text}_`,
              { parse_mode: 'Markdown' }
            );
          } catch (e) {
            logger.error('Failed to notify admin of reply', e, { adminId });
          }
        }

        logger.info('User reply received', { telegramId, name });
        return;
      }
    } catch (error) {
      logger.error('Error in support text handler', { telegramId, error });
      await ctx.reply('❌ An error occurred. Please try again.');
    }
    
    return next();
  });
}

function cancelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'cancel')],
  ]);
}

export function setupAdminSupportHandlers(bot: Telegraf<Context>) {
bot.action('admin_support', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.answerCbQuery('Unauthorized.');
      return;
    }

    try {
      await ctx.answerCbQuery();
    } catch {
      // Callback expired
    }

    try {
      const tickets = await getOpenTickets();

      if (tickets.length === 0) {
        await ctx.editMessageText(
          '💬 *Messages*\n\nNo messages.',
          { parse_mode: 'Markdown', ...adminMenuKeyboard() }
        );
        return;
      }

      const buttons = tickets.slice(0, 10).map((t: any) => {
        const safeMessage = t.message
          .replace(/[*_`[\]()]/g, '')
          .substring(0, 25)
          .trim();
        return [Markup.button.callback(`${t.name}: ${safeMessage}...`, `reply_${t.id}`)];
      });

      await ctx.editMessageText(
        `💬 *Messages* (${tickets.length} unread)\n\nTap a message to reply.`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons), ...adminMenuKeyboard() }
      );
    } catch (error: any) {
      logger.error('Error in admin support', { telegramId, error: error.message });
      await ctx.reply('Error loading messages.');
    }
  });

  bot.action(/^reply_(.+)$/, async (ctx) => {
    const telegramId = ctx.from.id.toString();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.answerCbQuery('Unauthorized.');
      return;
    }

    const callbackData = (ctx.callbackQuery as any)?.data;
    const match = callbackData?.match(/^reply_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery('Error. Try again.');
      return;
    }

    const ticketId = match[1];

    try {
      const ticket = await getTicketById(ticketId);
      if (!ticket) {
        await ctx.answerCbQuery('Message not found.');
        return;
      }

      await ctx.answerCbQuery();
      await ctx.deleteMessage();

      await ctx.telegram.sendMessage(
        telegramId,
        `Replying to ${ticket.name} (${ticket.telegramId}):\n\n${ticket.message}\n\nSend your reply...`
      );

      await updateStateData(telegramId, { lastUserToReplyTo: ticket.telegramId, replyToName: ticket.name } as any);
    } catch (error) {
      logger.error('Error starting reply', { telegramId, ticketId, error });
      await ctx.answerCbQuery('Error starting reply.');
    }
  });

  bot.command(/^reply_(.+)$/, async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    const match = ctx.message.text.match(/^reply_(.+)$/);
    if (!match) return;

    const ticketId = match[1];
    
    try {
      const ticket = await getTicketById(ticketId);
      
      if (!ticket) {
        await ctx.reply('Ticket not found.');
        return;
      }

      await ctx.reply(
        `Replying to ${ticket.name} (${ticket.telegramId})\n\nOriginal message:\n${ticket.message}\n\nSend your response:`
      );

      const stateData = {
        replyingToTicket: ticketId,
        userTelegramId: ticket.telegramId,
        userName: ticket.name,
      };
      
      await updateStateData(telegramId, stateData as any);
      await updateUserState(telegramId, UserState.SUPPORT_FLOW);
    } catch (error) {
      logger.error('Error in reply command', error, { telegramId, ticketId });
      await ctx.reply('Error loading ticket.');
    }
  });

bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id.toString();
    
    if (!telegramId || !config.adminTelegramIds.includes(telegramId)) {
      return next();
    }
    
    if (!ctx.message || !('text' in ctx.message) || !ctx.message.text) {
      return next();
    }
    
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    try {
      const user = await getUserByTelegramId(telegramId);
      const stateData = user?.stateData as any;

      const isOldReplyFlow = stateData?.replyingToTicket && user?.state === UserState.SUPPORT_FLOW;
      const isNewReplyFlow = stateData?.lastUserToReplyTo;

      if (isOldReplyFlow || isNewReplyFlow) {
        const ticketId = stateData?.replyingToTicket;
        const userTelegramId = stateData?.userTelegramId || stateData?.lastUserToReplyTo;
        const userName = stateData?.userName || stateData?.replyToName;

        if (ticketId) {
          await resolveTicket(ticketId, text);
        }

        await ctx.reply('✅ Sent!');

        await ctx.telegram.sendMessage(
          userTelegramId,
          `💬 Hi ${userName},\n\n${text}`,
          {}
        );

        await updateUserState(telegramId, 'AWAITING_REPLY' as any);
        await updateStateData(telegramId, { 
          lastUserToReplyTo: undefined, 
          replyToName: undefined, 
          replyingToTicket: undefined, 
          userTelegramId: undefined, 
          userName: undefined,
          repliedToAdmin: true
        } as any);

        logger.info('Reply sent', { toUser: userTelegramId, adminId: telegramId });
        return;
      }
    } catch (error) {
      logger.error('Error in admin reply handler', { telegramId, error });
      await ctx.reply('Error sending response.');
    }
    
return next();
  });
}