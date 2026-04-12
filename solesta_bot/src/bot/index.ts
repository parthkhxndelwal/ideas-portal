import { Telegraf, Context } from 'telegraf';
import { config, validateConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { connectDatabase, disconnectDatabase } from '../db/prisma';
import { setupStartCommand, setupHelpCommand, setupMyRegistrationCommand, setupGetTicketCommand } from './commands/start';
import { setupFlowHandlers, setupMenuHandlers } from './handlers/flowHandlers';
import { setupCallbackHandlers } from './handlers/callbackHandlers';
import { setupSupportHandlers, setupSupportTextHandler, setupAdminSupportHandlers } from './handlers/supportHandlers';
import { setupAdminCommands, setupImportHandler, setupManualRegistration, setupPaymentApproval } from './commands/admin';
import { rateLimitMiddleware } from '../utils/rateLimiter';
import { startApiServer } from '../api/index';

let bot: Telegraf<Context>;

async function main() {
  try {
    validateConfig();
    logger.info('Starting Solesta 26 Bot...');

    await connectDatabase();

    bot = new Telegraf(config.botToken);

    bot.use(rateLimitMiddleware);
    setupFlowHandlers(bot);
    setupStartCommand(bot);
    setupPaymentApproval(bot);
    setupHelpCommand(bot);
    setupMyRegistrationCommand(bot);
    setupGetTicketCommand(bot);
    setupCallbackHandlers(bot);
    setupAdminCommands(bot);
    setupImportHandler(bot);
    setupManualRegistration(bot);
    setupMenuHandlers(bot);
    setupSupportHandlers(bot);
    setupSupportTextHandler(bot);
    setupAdminSupportHandlers(bot);

    // Set bot commands for / menu visibility (public commands only)
    try {
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start registration' },
        { command: 'help', description: 'Get help' },
        { command: 'myregistration', description: 'View your registration' },
        { command: 'getticket', description: 'Get QR ticket' },
      ]);
      logger.info('Bot commands registered');
    } catch (e) {
      logger.error('Failed to register bot commands', e);
    }

    // Set admin-only commands (hidden from regular users)
    try {
      await bot.telegram.setMyCommands([
        { command: 'admin', description: 'Admin panel' },
        { command: 'resend', description: 'Resend QR to user' },
        { command: 'resendall', description: 'Resend all pending QRs' },
      ], { scope: { type: 'chat', chat_id: config.adminTelegramIds[0] } });
      logger.info('Admin commands registered');
    } catch (e) {
      logger.error('Failed to register admin commands', e);
    }

    bot.catch(async (err, ctx) => {
      logger.error('Bot error', err, { telegramId: ctx.from?.id });
      try {
        if (ctx.callbackQuery) {
          try {
            await ctx.answerCbQuery('❌ An error occurred.', { show_alert: false });
          } catch {
            // Callback already expired, ignore
          }
        } else if (ctx.message) {
          await ctx.reply('❌ An error occurred. Please try again.');
        }
      } catch (replyErr) {
        logger.error('Failed to send error reply', replyErr);
      }
    });

    await bot.launch();

    logger.info('Bot started successfully using long polling');
    logger.info(`Admin IDs: ${config.adminTelegramIds.join(', ')}`);
  } catch (error: any) {
    if (error.message?.includes('409') || error.error_code === 409) {
      logger.warn('Bot already running elsewhere, starting API only');
    } else {
      logger.error('Failed to start bot', error);
    }
  }

  if (process.env.ENABLE_API === 'true') {
    startApiServer();
  } else {
    logger.info('API server disabled (set ENABLE_API=true to enable)');
  }
}

process.once('SIGINT', async () => {
  logger.info('Shutting down bot...');
  bot?.stop('SIGINT');
  await disconnectDatabase();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Shutting down bot...');
  bot?.stop('SIGTERM');
  await disconnectDatabase();
  process.exit(0);
});

main();