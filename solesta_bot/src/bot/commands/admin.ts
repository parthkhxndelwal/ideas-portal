import { Telegraf, Context } from 'telegraf';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/prisma';
import {
  getStatistics,
  getFilteredRegistrations,
  getAllRegistrations,
  getRegistrationByTelegramId,
  markPaymentSuccessful,
  getRegistrationByReferenceId,
} from '../../services/registration';
import { sendQRToUser, resendQRToUser, resendAllPending } from '../../services/qrSender';
import QRCode from 'qrcode';
import { encryptQR } from '../../utils/crypto';
import { getStudentCount, importStudents, StudentRecord } from '../../services/studentData';
import {
  adminMenuKeyboard,
  filterTypeKeyboard,
  adminYearKeyboard,
  exportTypeKeyboard,
} from '../../keyboards';
import { withTyping } from '../../utils/typing';
import fs from 'fs';
import path from 'path';

interface SessionData {
  filter?: { isKrmu?: boolean; year?: string; isFresher?: boolean };
}

const adminSessions: Map<string, SessionData> = new Map<string, SessionData>();

export function setupAdminCommands(bot: Telegraf<Context>) {
  bot.command('admin', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    await ctx.reply('👋 Admin Panel', adminMenuKeyboard());
  });

  bot.action('admin_stats', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    try {
      const stats = await getStatistics();
      const studentCount = await getStudentCount();

      logger.info('Admin viewed statistics', { telegramId, stats });

      await ctx.editMessageText(
        `📊 *Statistics*\n\n` +
          `*Total Registrations:* ${stats.total}\n` +
          `*KRMU Students:* ${stats.krmu}\n` +
          `*External Students:* ${stats.external}\n` +
          `*Paid:* ${stats.paid}\n` +
          `*Fresher Participants:* ${stats.fresher}\n\n` +
          `*By Year:*\n` +
          Object.entries(stats.byYear)
            .map(([year, count]) => `  ${year}th Year: ${count}`)
            .join('\n') + 
          `\n\n*Student Records:* ${studentCount}`,
        { parse_mode: 'Markdown', ...adminMenuKeyboard() }
      );
    } catch (error) {
      logger.error('Error getting stats', error, { telegramId });
      await ctx.reply('Error getting statistics.');
    }
  });

  bot.action('admin_export', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    await ctx.editMessageText(
      '📤 *Export Registrations*\n\nSelect what you want to export:',
      { parse_mode: 'Markdown', ...exportTypeKeyboard() }
    );
  });

  bot.action('export_all', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    try {
      const registrations = await getAllRegistrations();
      await sendExport(ctx, registrations, 'All Registrations');
    } catch (error) {
      logger.error('Error exporting all data', error, { telegramId });
      await ctx.reply('Error exporting data.');
    }
  });

  bot.action('export_paid', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    try {
      const registrations = await prisma.registration.findMany({
        where: { feePaid: true },
      });
      await sendExport(ctx, registrations, 'Paid Registrations');
    } catch (error) {
      logger.error('Error exporting paid data', error, { telegramId });
      await ctx.reply('Error exporting data.');
    }
  });

  bot.action('export_fresher', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    try {
      const registrations = await prisma.registration.findMany({
        where: { isFresher: true },
      });
      await sendExport(ctx, registrations, 'Fresher Participants');
    } catch (error) {
      logger.error('Error exporting fresher data', error, { telegramId });
      await ctx.reply('Error exporting data.');
    }
  });

  async function sendExport(ctx: any, registrations: any[], label: string) {
    const csv = generateCsv(registrations);
    const fileName = `registrations_${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), fileName);
    fs.writeFileSync(filePath, csv);

    logger.info('Admin exported registrations', { telegramId: ctx.from.id.toString(), count: registrations.length, type: label });

    await ctx.replyWithDocument({ source: filePath }, { caption: `📤 ${label} (${registrations.length} records)` });

    fs.unlinkSync(filePath);
  }

  bot.action('admin_filter', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    await ctx.editMessageText('Select filter type:', filterTypeKeyboard());
  });

  bot.action('filter_krmu', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const registrations = await getFilteredRegistrations({ isKrmu: true });
      logger.info('Admin filtered KRMU students', { telegramId, count: registrations.length });
      await showFilteredResults(ctx, registrations, 'KRMU Students');
    } catch (error) {
      logger.error('Error filtering krmu', error, { telegramId });
      await ctx.reply('Error filtering.');
    }
  });

  bot.action('filter_external', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const registrations = await getFilteredRegistrations({ isKrmu: false });
      logger.info('Admin filtered external students', { telegramId, count: registrations.length });
      await showFilteredResults(ctx, registrations, 'External Students');
    } catch (error) {
      logger.error('Error filtering external', error, { telegramId });
      await ctx.reply('Error filtering.');
    }
  });

  bot.action('filter_year', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    await ctx.editMessageText('Select year:', adminYearKeyboard());
  });

  for (let i = 1; i <= 5; i++) {
    bot.action(`admin_year_${i}`, async (ctx) => {
      const telegramId = ctx.from.id.toString();
      await ctx.answerCbQuery();

      try {
        const registrations = await getFilteredRegistrations({ year: i.toString() });
        logger.info('Admin filtered by year', { telegramId, year: i, count: registrations.length });
        await showFilteredResults(ctx, registrations, `${i}th Year Students`);
      } catch (error) {
        logger.error('Error filtering by year', error, { telegramId, year: i });
        await ctx.reply('Error filtering.');
      }
    });
  }

  bot.action('filter_fresher', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const registrations = await getFilteredRegistrations({ isFresher: true });
      logger.info('Admin filtered fresher participants', { telegramId, count: registrations.length });
      await showFilteredResults(ctx, registrations, 'Fresher Participants');
    } catch (error) {
      logger.error('Error filtering fresher', error, { telegramId });
      await ctx.reply('Error filtering.');
    }
  });

  bot.action('admin_import', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    try {
      await ctx.answerCbQuery();
    } catch {
      // Callback expired, ignore
    }

    await ctx.reply(
      '📁 *Import Students*\n\n' +
        'Send a JSON file with student records.\n' +
        'Format:\n' +
        '```json\n' +
        '[{"rollnumber":"2105170011","name":"John","course":"B.A.","year":"2021"}]\n' +
        '```',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_back', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    await ctx.editMessageText('👋 Admin Panel', adminMenuKeyboard());
  });

  bot.command('apikey', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized.');
      return;
    }

    const args = ctx.message.text.replace('/apikey', '').trim().split(' ');
    const command = args[0]?.toLowerCase();
    const name = args.slice(1).join(' ') || 'External App';

    if (command === 'generate' || command === 'gen' || command === '') {
      const { v4: uuidv4 } = await import('uuid');
      const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
      
      const apiKeyRecord = await prisma.apiKey.create({
        data: { key: apiKey, name }
      });

      logger.info('API key generated', { telegramId, name, keyId: apiKeyRecord.id });

      await ctx.reply(
        `🔑 *API Key Generated*\n\n` +
        `*Name:* ${name}\n` +
        `*Key:* \`${apiKey}\`\n\n` +
        `Use this key in the X-API-Key header for API requests.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (command === 'list') {
      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (keys.length === 0) {
        await ctx.reply('No API keys found.');
        return;
      }

      const list = keys.map(k => 
        `• ${k.name} - ${k.isActive ? '✅' : '❌'} - ${k.createdAt.toLocaleDateString()}`
      ).join('\n');

      await ctx.reply(`🔑 *API Keys*\n\n${list}`, { parse_mode: 'Markdown' });
      return;
    }

    if (command === 'revoke' || command === 'delete') {
      const keyId = args[1];
      if (!keyId) {
        await ctx.reply('Usage: /apikey revoke <key_id>');
        return;
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: { isActive: false }
      });

      await ctx.reply('✅ API key revoked.');
      return;
    }

    await ctx.reply(
      '🔑 *API Key Commands*\n\n' +
      '/apikey generate <name> - Generate new key\n' +
      '/apikey list - List existing keys\n' +
      '/apikey revoke <id> - Revoke a key',
      { parse_mode: 'Markdown' }
    );
  });
}

async function showFilteredResults(
  ctx: Context,
  registrations: any[],
  title: string
) {
  if (registrations.length === 0) {
    await ctx.editMessageText(`No records found for: ${title}`, adminMenuKeyboard());
    return;
  }

  const summary = registrations.slice(0, 10).map(r => 
    `${r.name} - ${r.referenceId} - ${r.feePaid ? '✅' : '⏳'}`
  ).join('\n');

  const total = registrations.length;
  const paid = registrations.filter(r => r.feePaid).length;

  await ctx.editMessageText(
    `📋 *${title}*\n\n*Total:* ${total} | *Paid:* ${paid}\n\n` +
      summary +
      (total > 10 ? `\n... and ${total - 10} more` : ''),
    { parse_mode: 'Markdown', ...adminMenuKeyboard() }
  );
}

function generateCsv(registrations: any[]): string {
  const headers = [
    'Reference ID',
    'Telegram ID',
    'Name',
    'Email',
    'Roll Number',
    'College',
    'Course',
    'Year',
    'Is KRMU',
    'Is Fresher',
    'Fee Amount',
    'Fee Paid',
    'Ticket Sent',
    'Created At',
  ];

  const rows = registrations.map(r => [
    r.referenceId,
    r.telegramId,
    r.name,
    r.email,
    r.rollNumber || '',
    r.college || '',
    r.course,
    r.year,
    r.isKrmu ? 'Yes' : 'No',
    r.isFresher ? 'Yes' : 'No',
    r.feeAmount.toString(),
    r.feePaid ? 'Yes' : 'No',
    r.ticketSent ? 'Yes' : 'No',
    r.createdAt.toISOString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export function setupImportHandler(bot: Telegraf<Context>) {
  bot.on('document', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    if (!config.adminTelegramIds.includes(telegramId)) {
      return;
    }

    const document = ctx.message.document;
    
    if (!document.file_name?.endsWith('.json')) {
      await ctx.reply('📁 Please send a JSON file.');
      return;
    }

    try {
      await ctx.reply('⏬ Downloading...');
      
      const file = await ctx.telegram.getFile(document.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
      
      const response = await fetch(fileUrl);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        await ctx.reply('❌ Invalid JSON format.');
        return;
      }

      const total = data.length;
      await ctx.reply(`📋 ${total} records found. Starting background import...`);
      
      // Start import in background without waiting
      importStudents(data).then((imported) => {
        logger.info('Background import complete', { count: imported, total });
        ctx.telegram.sendMessage(telegramId, `✅ Import complete: ${imported}/${total} students`);
      }).catch((err) => {
        logger.error('Background import failed', err);
        ctx.telegram.sendMessage(telegramId, `❌ Import failed: ${err.message}`);
      });
    } catch (error) {
      logger.error('Error importing students', error, { telegramId });
      await ctx.reply('❌ Error importing. Check logs.');
    }
  });
}

export function setupPaymentApproval(bot: Telegraf<Context>) {
  // /resend SOL26-XXXXX - resend QR to specific user
  bot.command('resend', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized');
      return;
    }

    const text = ctx.message.text.replace('/resend', '').trim();
    if (!text) {
      await ctx.reply('Usage: /resend SOL26-XXXXX');
      return;
    }

    // Extract reference ID
    const match = text.match(/SOL26-[A-Z0-9]+/i);
    const refId = match ? match[0].toUpperCase() : null;

    if (!refId) {
      await ctx.reply('Invalid Reference ID. Usage: /resend SOL26-XXXXX');
      return;
    }

    await ctx.reply(`Resending QR for ${refId}...`);
    
    try {
      await withTyping(ctx, async () => {
        const result = await resendQRToUser(refId, ctx.telegram);
        await ctx.reply(`✅ ${result.message}`);
        logger.info('Resend complete', { refId, result: result.message });
      });
    } catch (error: any) {
      await ctx.reply(`❌ Error: ${error.message}`);
      logger.error('Resend error', error, { refId });
    }
  });

  // /resendall - resend QR to all pending users
  bot.command('resendall', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    if (!config.adminTelegramIds.includes(telegramId)) {
      await ctx.reply('Unauthorized');
      return;
    }

    await ctx.reply('Finding pending QRs...');

    try {
      await withTyping(ctx, async () => {
        const result = await resendAllPending(ctx.telegram);
        await ctx.reply(`✅ Resend complete: ${result.success}/${result.total} sent, ${result.failed} failed`);
        logger.info('Resend all complete', result);
      });
    } catch (error: any) {
      await ctx.reply(`❌ Error: ${error.message}`);
      logger.error('Resend all error', error);
    }
  });

  // Listen for text containing SOL26- (for comma-separated reference IDs)
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id.toString();
    
    // Only process if admin and has text
    if (!telegramId || !config.adminTelegramIds.includes(telegramId)) {
      return next();
    }
    
    if (!ctx.message || !('text' in ctx.message) || !ctx.message.text) {
      return next();
    }
    
    const text = ctx.message.text;
    if (!text.includes('SOL26-') || text.startsWith('/')) {
      return next();
    }

    // Extract reference IDs
    const match = text.match(/SOL26-[A-Z0-9]+/gi);
    const refIds = match ? [...new Set(match.map(s => s.toUpperCase()))] : [];

    if (refIds.length === 0) {
      return next();
    }

    await ctx.reply(`Processing ${refIds.length} reference ID(s)...`);

    for (const refId of refIds) {
      try {
        const registration = await getRegistrationByReferenceId(refId);
        if (!registration) {
          await ctx.reply(`❌ ${refId}: Not found`);
          continue;
        }

        // If already paid, resend QR
        if (registration.feePaid) {
          const result = await resendQRToUser(refId, ctx.telegram);
          await ctx.reply(`🔄 ${refId}: ${result.message}`);
        } else {
          // Mark as paid and send QR
          const qrCodeData = `${refId}:${registration.rollNumber || ''}:${refId}`;
          const encryptedData = encryptQR(qrCodeData);
          const qrCode = await QRCode.toDataURL(encryptedData);

          await prisma.registration.update({
            where: { referenceId: refId },
            data: { feePaid: true, paymentDate: new Date(), qrCode, qrSentTelegram: false, qrSentEmail: false },
          });

          const result = await sendQRToUser(
            refId,
            registration.telegramId,
            ctx.telegram,
            registration.email,
            registration.name,
            registration.isKrmu
          );
          await ctx.reply(`✅ ${refId}: ${result.message}`);
        }

        logger.info('Approved', { refId, name: registration.name });
      } catch (error: any) {
        await ctx.reply(`❌ ${refId}: ${error.message}`);
        logger.error('Approve error', error, { refId });
      }
    }
  });
}

export function setupManualRegistration(bot: Telegraf<Context>) {
  bot.action('admin_manual', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    adminSessions.set(telegramId, {});
    await ctx.editMessageText(
      '➕ *Manual Registration*\n\nEnter Telegram ID:',
      { parse_mode: 'Markdown' }
    );

    await ctx.reply('Please enter the Telegram user ID for the new registration:');
  });

  bot.action('admin_resend', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery('Enter Telegram ID');

    await ctx.editMessageText(
      '📨 *Resend Ticket*\n\nEnter Telegram ID:',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_skip_otp', async (ctx) => {
    await ctx.answerCbQuery('OTP verification skipped');
  });
}