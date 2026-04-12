import { Telegraf, Context } from 'telegraf';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';
import { startKeyboard, mainMenuKeyboard, adminMenuKeyboard } from '../../keyboards';
import { getOrCreateUser, updateUserState, UserState, getUserByTelegramId, updateStateData } from '../../services/stateMachine';
import { createRegistration, getRegistrationByTelegramId, sendTicketToUser } from '../../services/registration';

export function setupStartCommand(bot: Telegraf<Context>) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;

    try {
      const user = await getOrCreateUser(telegramId, username, firstName);
      
      if (config.adminTelegramIds.includes(telegramId)) {
        await prisma.user.update({
          where: { telegramId },
          data: { isAdmin: true },
        });
        await ctx.reply(
          '👋 Welcome to Solesta \'26 Admin Panel!',
          adminMenuKeyboard()
        );
        return;
      }

      const registration = await getRegistrationByTelegramId(telegramId);
      
      if (registration && registration.feePaid) {
        await ctx.reply(`🎉 Welcome back, ${registration.name}!\n\n✅ Your registration is confirmed!`);
        await ctx.reply(`📝 Your Reference ID:\n${registration.referenceId}\n\n👆 This is your reference ID.`);
        await ctx.reply('What would you like to do?', mainMenuKeyboard());
        return;
      }

      if (registration && registration.referenceId) {
        const status = registration.feePaid ? '✅ Paid' : '⏳ Pending';
        await ctx.reply(`👋 Welcome back!\n\n📋 Fee: ₹${registration.feeAmount}\nStatus: ${status}`);
        await ctx.reply(`📝 Your Reference ID:\n${registration.referenceId}\n\n👆 This is your reference ID.`);
        await ctx.reply('What would you like to do?', mainMenuKeyboard());
        return;
      }

      await updateUserState(telegramId, UserState.SELECT_INSTITUTION);
      await ctx.reply(
        `👋 Welcome to Solesta '26!\n\nPlease select your institution:`,
        startKeyboard()
      );
    } catch (error) {
      logger.error('Error in start command', error, { telegramId });
      await ctx.reply('❌ An error occurred. Please try /start again.');
    }
  });
}

export function setupHelpCommand(bot: Telegraf<Context>) {
  bot.command('help', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await getUserByTelegramId(telegramId);
    
    const helpText = `
📖 *Solesta '26 Registration Help*

/start - Start registration
/myregistration - View your registration status
/getticket - Get your QR ticket

*Registration Fees:*
• KRMU Students: ₹${config.feeKrmu}
• External Students: ₹${config.feeExternal}

*Process:*
1. Select institution
2. Verify identity (OTP)
3. Enter details
4. Pay registration fee
5. Receive ticket

Need help? Contact support.
    `;

    await ctx.replyWithMarkdown(helpText, user?.isAdmin ? adminMenuKeyboard() : mainMenuKeyboard());
  });
}

export function setupMyRegistrationCommand(bot: Telegraf<Context>) {
  bot.command('myregistration', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      
      if (!registration) {
        await ctx.reply('No registration found. Use /start to register.');
        return;
      }

      const status = registration.feePaid ? '✅ Confirmed' : '⏳ Pending Payment';
      
      await ctx.replyWithMarkdown(
        `📋 *Your Registration*\n\n` +
        `*Name:* ${registration.name}\n` +
        `*Email:* ${registration.email}\n` +
        `*Reference ID:* ${registration.referenceId}\n` +
        `*Fee:* ₹${registration.feeAmount}\n` +
        `*Status:* ${status}\n` +
        `${registration.year ? `*Year:* ${registration.year}\n` : ''}` +
        `${registration.isKrmu ? '' : `*College:* ${registration.college || 'N/A'}\n`}`
      );
    } catch (error) {
      logger.error('Error in myregistration command', error, { telegramId });
      await ctx.reply('❌ An error occurred. Please try /start again.');
    }
  });
}

export function setupGetTicketCommand(bot: Telegraf<Context>) {
  bot.command('getticket', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      
      if (!registration) {
        await ctx.reply('No registration found. Use /start to register.');
        return;
      }

      if (!registration.feePaid) {
        await ctx.reply('Payment not confirmed. Please complete payment first.');
        return;
      }

      if (registration.qrCode) {
        await ctx.replyWithPhoto(
          { source: Buffer.from(registration.qrCode.split(',')[1], 'base64') },
          {
            caption: `🎫 *Solesta '26 Ticket*\n\n*Reference:* ${registration.referenceId}\n*Name:* ${registration.name}`,
            parse_mode: 'Markdown',
          }
        );
      } else {
        await ctx.reply('Ticket not available. Contact support.');
      }
    } catch (error) {
      logger.error('Error in getticket command', error, { telegramId });
      await ctx.reply('❌ An error occurred. Please try /start again.');
    }
  });
}