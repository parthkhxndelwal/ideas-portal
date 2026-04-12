import { Telegraf, Context } from 'telegraf';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import {
  getUserByTelegramId,
  updateUserState,
  UserState,
  StateData,
  updateStateData,
} from '../../services/stateMachine';
import { createRegistration, getRegistrationByTelegramId } from '../../services/registration';
import {
  yearSelectionKeyboard,
  confirmCopyKeyboard,
  paymentKeyboard,
  yesNoKeyboard,
} from '../../keyboards';

export function setupCallbackHandlers(bot: Telegraf<Context>) {
  for (let i = 1; i <= 5; i++) {
    bot.action(`year_${i}`, async (ctx) => {
      const telegramId = ctx.from.id.toString();
      await ctx.answerCbQuery();

      try {
        const user = await getUserByTelegramId(telegramId);
        const stateData = (user?.stateData as StateData) || {};

        if (stateData.institution === 'krmu' && i === 1) {
          await updateStateData(telegramId, { year: i.toString() });
          await updateUserState(telegramId, UserState.FRESHER_SELECTION);

          await ctx.editMessageText(
            'Would you like to participate in Mr. & Mrs. Fresher competition?',
            yesNoKeyboard('fresher')
          );
        } else {
          await finalizeRegistration(ctx, telegramId, stateData, i.toString());
        }
      } catch (error) {
        logger.error('Error handling year selection', error, { telegramId, year: i });
        await ctx.reply('❌ An error occurred. Please try /start again.');
      }
    });
  }

  bot.action('fresher_yes', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const user = await getUserByTelegramId(telegramId);
      const stateData = (user?.stateData as StateData) || {};

      await updateStateData(telegramId, { isFresher: true });
      await finalizeRegistration(ctx, telegramId, stateData, stateData.year || '1');
    } catch (error) {
      logger.error('Error handling fresher yes', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  bot.action('fresher_no', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const user = await getUserByTelegramId(telegramId);
      const stateData = (user?.stateData as StateData) || {};

      await updateStateData(telegramId, { isFresher: false });
      await finalizeRegistration(ctx, telegramId, stateData, stateData.year || '1');
    } catch (error) {
      logger.error('Error handling fresher no', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  bot.action('copy_confirmed', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const user = await getUserByTelegramId(telegramId);
      const stateData = (user?.stateData as StateData) || {};
      
      let isKrmu = stateData.institution === 'krmu';
      if (!isKrmu && user?.registration) {
        isKrmu = user.registration.isKrmu;
      }

      await updateUserState(telegramId, UserState.PAYMENT_LINK);

      const displayFee = user?.registration?.feeAmount || (isKrmu ? config.feeKrmu : config.feeExternal);
      const displayRefId = stateData.referenceId || user?.registration?.referenceId;
      
      await ctx.editMessageText(
        `💳 *Proceed to Payment*\n\n` +
          `Use the button below to complete your payment of ₹${displayFee}.\n\n` +
          `⚠️ *Important:* Use your Reference ID (${displayRefId}) during payment.`,
        { parse_mode: 'Markdown', ...paymentKeyboard(config.paymentLinkInternal, config.paymentLinkExternal, isKrmu) }
      );
    } catch (error) {
      logger.error('Error handling copy confirmation', error, { telegramId });
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  bot.action('payment_done', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      if (!registration) return;
      
      await ctx.editMessageText(
        `📋 *Registration Initiated*\n\n` +
        `If you have completed the payment:\n` +
        `Your QR ticket will be sent to:\n` +
        `• Email: ${registration.email}\n` +
        `• Telegram (automatically)\n\n` +
        `⏳ Verification takes 1-3 business days.\n` +
        `If you don't receive your ticket after 3 days, contact support.\n\n` +
        `If you haven't completed payment:\n` +
        `Click /start and then select "My Registration" to complete your registration.`
      );
      
      await ctx.telegram.sendMessage(
        config.adminTelegramIds[0],
        `💰 Payment initiated by ${registration.name} (${registration.referenceId}). Email: ${registration.email}`
      );
    } catch (error) {
      logger.error('Error in payment_done', error, { telegramId });
    }
  });

  bot.action('go_back', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      await updateUserState(telegramId, UserState.SELECT_INSTITUTION);
      await ctx.editMessageText('Please select your institution:');
    } catch (error) {
      logger.error('Error handling go back', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  bot.action('cancel', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery('Cancelled');

    await updateUserState(telegramId, UserState.START);
    await ctx.deleteMessage();
  });
}

async function finalizeRegistration(
  ctx: Context,
  telegramId: string,
  stateData: StateData,
  year: string
) {
  const isKrmu = stateData.institution === 'krmu';
  const feeAmount = isKrmu ? config.feeKrmu : config.feeExternal;
  const refId = stateData.referenceId;

  let registration;
  if (refId) {
    registration = await getRegistrationByTelegramId(telegramId);
  }

  const name = stateData.name || registration?.name;
  const course = stateData.course || registration?.course;
  const email = stateData.email || (isKrmu && stateData.rollNumber ? `${stateData.rollNumber}@krmu.edu.in` : null) || registration?.email;

  if (!email || !name) {
    await ctx.reply('An error occurred. Please try /start again.');
    logger.error('Missing email or name in finalizeRegistration', { telegramId, stateData, registration });
    return;
  }

  if (refId && registration) {
    await updateUserState(telegramId, UserState.REFERENCE_ID, {
      feeAmount,
      year,
      isFresher: stateData.isFresher,
    });

    await ctx.replyWithMarkdown(
      `✅ *Registration Complete!*\n\n` +
        `*Name:* ${name}\n` +
        `*Course:* ${course}\n` +
        `*Year:* ${year}\n` +
        `${stateData.isFresher ? `*Fresher Competition:* Yes\n` : ''}` +
        `\n📋 *Registration Fee:* ₹${feeAmount}\n`
    );

    await ctx.reply(`📝 Your Reference ID:\n${refId}\n\n👆 Copy this for payment.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ I have copied', callback_data: 'copy_confirmed' }],
        ],
      },
    });
    return;
  }

  const newRefId = await createRegistration({
    telegramId,
    name,
    email,
    rollNumber: stateData.rollNumber,
    college: stateData.college,
    course: course!,
    year,
    isKrmu,
    isFresher: stateData.isFresher,
  });

  await updateUserState(telegramId, UserState.REFERENCE_ID, {
    referenceId: newRefId,
    feeAmount,
    year,
  });

  await ctx.replyWithMarkdown(
    `✅ *Registration Complete!*\n\n` +
      `*Name:* ${name}\n` +
      `*Email:* ${email}\n` +
      `*Year:* ${year}\n` +
      `${stateData.isFresher ? `*Fresher Competition:* Yes\n` : ''}` +
      `\n📋 *Registration Fee:* ₹${feeAmount}\n`
  );

  const paymentLink = isKrmu ? config.paymentLinkInternal : config.paymentLinkExternal;
  await ctx.reply(`📝 Your Reference ID:\n${newRefId}\n\n👆 Copy this for payment.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 Proceed to Payment', url: paymentLink }],
        [{ text: '✅ I have paid', callback_data: 'payment_done' }],
      ],
    },
  });
}