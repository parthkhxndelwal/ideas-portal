import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import { withTyping, withUploadPhoto } from '../../utils/typing';
import { findStudentByRollNumber } from '../../services/studentData';
import { createAndSendOtp, verifyOtp, canRequestOtp } from '../../services/otp';
import { createRegistration, getRegistrationByTelegramId } from '../../services/registration';
import {
  getOrCreateUser,
  updateUserState,
  getUserByTelegramId,
  updateStateData,
  UserState,
  StateData,
} from '../../services/stateMachine';
import {
  startKeyboard,
  yesNoKeyboard,
  yearSelectionKeyboard,
  confirmCopyKeyboard,
  paymentKeyboard,
  hostelKeyboard,
} from '../../keyboards';

async function safeEditMessageText(ctx: Context, text: string, extra?: any) {
  try {
    await ctx.editMessageText(text, extra);
  } catch (error: any) {
    if (error?.response?.error_code !== 400 || !error?.response?.description?.includes('message is not modified')) {
      throw error;
    }
  }
}

export function setupFlowHandlers(bot: Telegraf<Context>) {
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id.toString();
    
    if (ctx.message && 'text' in ctx.message && ctx.message.text && telegramId) {
      const text = ctx.message.text.trim();
      
      if (config.adminTelegramIds.includes(telegramId)) {
        return next();
      }
      if (text.startsWith('/')) {
        return next();
      }
      
      try {
        const user = await getUserByTelegramId(telegramId);
        const userState = user?.state;
        
        if (userState === UserState.ENTER_ROLL_NUMBER) {
          await handleRollNumberInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.OTP_VERIFICATION) {
          await handleOtpInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.ENTER_EMAIL) {
          await handleEmailInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.MANUAL_DETAILS) {
          await handleManualDetailsInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.ENTER_NAME) {
          await handleNameInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.ENTER_COLLEGE) {
          await handleCollegeInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.ENTER_COLLEGE_ROLL) {
          await handleCollegeRollInput(bot, ctx, telegramId, text);
        } else if (userState === UserState.SELECT_YEAR) {
          await handleYearInput(bot, ctx, telegramId, text);
        } else {
          await next();
        }
        return;
      } catch (error) {
        logger.error('Error handling text input', error, { telegramId });
        await ctx.reply('❌ An error occurred. Please try /start again.');
      }
    }
    
    await next();
  });
  
  bot.action('krmu', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      await getOrCreateUser(telegramId);
      await updateStateData(telegramId, { institution: 'krmu' });
      await updateUserState(telegramId, 'ASK_HOSTEL' as any);

      await safeEditMessageText(
        ctx,
        '🏛️ *KRMU Student Selected*\n\nAre you a hostel student at KRMU?\n\nIf yes, you need to complete your payment through the ICloudEMS App. Your ticket will be provided by the hostel management after payment.',
        { parse_mode: 'Markdown', ...hostelKeyboard() }
      );
    } catch (error) {
      logger.error('Error handling krmu action', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  bot.action('hostel_yes', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '🏛️ *Hostel Student*\n\nPlease complete your payment through the ICloudEMS App. Your ticket will be provided by the hostel management after payment.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('hostel_no', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      await updateUserState(telegramId, UserState.ENTER_ROLL_NUMBER);

      await safeEditMessageText(
        ctx,
        '🏛️ *KRMU Student Selected*\n\nPlease enter your 10-digit roll number:',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error handling hostel_no', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });

  bot.action('external', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();

    try {
      await getOrCreateUser(telegramId);
      await updateStateData(telegramId, { institution: 'external' });
      await updateUserState(telegramId, UserState.ENTER_EMAIL);

      await safeEditMessageText(
        ctx,
        '🌐 *External Student Selected*\n\nPlease enter your email address:',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error handling external action', error, { telegramId });
      await ctx.reply('An error occurred. Please try /start again.');
    }
  });
}

async function handleRollNumberInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  rollNumber: string
) {
  const cleanRoll = rollNumber.replace(/\s/g, '');

  if (!/^\d{10}$/.test(cleanRoll)) {
    await ctx.reply('⚠️ Invalid roll number. Please enter a 10-digit roll number (e.g., 2501201001):');
    return;
  }

  const student = await findStudentByRollNumber(cleanRoll);

  if (student) {
    await updateStateData(telegramId, {
      rollNumber: cleanRoll,
      name: student.name,
      course: student.courseAndSemester,
      year: student.year,
      email: student.email || `${cleanRoll}@krmu.edu.in`,
    });
    await updateUserState(telegramId, UserState.OTP_VERIFICATION);

    const user = await getUserByTelegramId(telegramId);
    if (user) {
      await withTyping(ctx, async () => {
        const otpResult = await createAndSendOtp(user.id, `${cleanRoll}@krmu.edu.in`, true);
        await ctx.reply(otpResult.message + '\n\nEnter the OTP sent to your KRMU email:');
      });
    }
  } else {
    await updateStateData(telegramId, {
      rollNumber: cleanRoll,
    });
    await updateUserState(telegramId, UserState.OTP_VERIFICATION);

    const existingUser = await getUserByTelegramId(telegramId);
    if (existingUser) {
      await withTyping(ctx, async () => {
        const otpResult = await createAndSendOtp(existingUser.id, `${cleanRoll}@krmu.edu.in`, true);
        await ctx.reply(
          otpResult.message +
            '\n\nRoll number not found in database. Please enter OTP, then provide your details manually.'
        );
      });
    }
  }
}

async function handleOtpInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  code: string
) {
  const user = await getUserByTelegramId(telegramId);
  const stateData = (user?.stateData as StateData) || {};

  if (!/^\d{6}$/.test(code)) {
    await ctx.reply('⚠️ Invalid OTP. Please enter a 6-digit code:');
    return;
  }

  const result = await verifyOtp(user.id, code);

  if (!result.success) {
    await ctx.reply(result.message);
    return;
  }

  const isKrmu = stateData.institution === 'krmu';
  const isFirstYear = stateData.year === '1';

  if (stateData.name && stateData.course) {
    if (isKrmu && isFirstYear) {
      await updateUserState(telegramId, UserState.FRESHER_SELECTION);
      await ctx.reply(
        'Would you like to participate in Mr. & Mrs. Fresher competition?',
        yesNoKeyboard('fresher')
      );
    } else {
      await withTyping(ctx, () => finalizeKrmuRegistration(ctx, telegramId, stateData));
    }
  } else {
    await updateUserState(telegramId, UserState.MANUAL_DETAILS);
    await ctx.reply('OTP verified!\n\nEnter your full name:');
  }
}

async function handleEmailInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  email: string
) {
  logger.info('handleEmailInput called', { telegramId, email });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    await ctx.reply('⚠️ Invalid email. Please enter a valid email address (e.g., john@example.com):');
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  logger.info('User fetched', { telegramId, userId: user?.id });
  
  await withTyping(ctx, async () => {
    const otpResult = await createAndSendOtp(user.id, email, false);
    logger.info('OTP result', { telegramId, success: otpResult.success, message: otpResult.message });
    
    if (!otpResult.success) {
      await ctx.reply(otpResult.message);
      return;
    }

    await updateStateData(telegramId, { email });
    await updateUserState(telegramId, UserState.OTP_VERIFICATION);
    await ctx.reply(otpResult.message + '\n\nEnter the OTP sent to your email:');
  });
}

async function handleManualDetailsInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  name: string
) {
  const cleanName = name.trim();
  
  if (cleanName.length < 2) {
    await ctx.reply('⚠️ Invalid name. Please enter your full name (at least 2 characters):');
    return;
  }
  
  await updateStateData(telegramId, { name: cleanName });
  await updateUserState(telegramId, UserState.ENTER_COLLEGE);

  await ctx.reply('Enter your course (e.g., B.A. LL.B, B.Com):');
}

async function handleNameInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  name: string
) {
  const cleanName = name.trim();
  
  if (cleanName.length < 2) {
    await ctx.reply('⚠️ Invalid name. Please enter your full name (at least 2 characters):');
    return;
  }
  
  await updateStateData(telegramId, { name: cleanName });
  await updateUserState(telegramId, UserState.ENTER_COLLEGE_ROLL);

  await ctx.reply('Enter your college roll number:');
}

async function handleCollegeInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  course: string
) {
  const cleanCourse = course.trim();
  
  if (cleanCourse.length < 2) {
    await ctx.reply('⚠️ Invalid course. Please enter your course (e.g., B.A. LL.B, B.Com):');
    return;
  }
  
  await updateStateData(telegramId, { course: cleanCourse });
  await updateUserState(telegramId, UserState.SELECT_YEAR);

  await ctx.reply('Select your year:', yearSelectionKeyboard());
}

async function handleCollegeRollInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  collegeRoll: string
) {
  const cleanRoll = collegeRoll.trim();
  
  if (cleanRoll.length < 2) {
    await ctx.reply('⚠️ Invalid roll number. Please enter your college roll number:');
    return;
  }
  
  await updateStateData(telegramId, { collegeRoll: cleanRoll });
  await updateUserState(telegramId, UserState.SELECT_YEAR);

  await ctx.reply('Select your year:', yearSelectionKeyboard());
}

async function handleYearInput(
  bot: Telegraf<Context>,
  ctx: Context,
  telegramId: string,
  year: string
) {
  const validYears = ['1', '2', '3', '4', '5'];

  if (!validYears.includes(year)) {
    await ctx.reply('⚠️ Invalid year. Please select your year using the buttons below:');
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  const stateData = (user?.stateData as StateData) || {};
  const isKrmu = stateData.institution === 'krmu';

  if (isKrmu && year === '1') {
    await updateStateData(telegramId, { year });
    await updateUserState(telegramId, UserState.FRESHER_SELECTION);

    await ctx.reply(
      'Would you like to participate in Mr. & Mrs. Fresher competition?',
      yesNoKeyboard('fresher')
    );
  } else {
    await finalizeRegistration(ctx, telegramId, stateData, year);
  }
}

async function finalizeKrmuRegistration(
  ctx: Context,
  telegramId: string,
  stateData: StateData
) {
  const feeAmount = config.feeKrmu;
  const email = stateData.email || (stateData.rollNumber ? `${stateData.rollNumber}@krmu.edu.in` : null);

  if (!email) {
    await ctx.reply('An error occurred. Please try /start again.');
    logger.error('Missing email in finalizeKrmuRegistration', { telegramId, stateData });
    return;
  }

  await withTyping(ctx, async () => {
    const refId = await createRegistration({
      telegramId,
      name: stateData.name!,
      email,
      rollNumber: stateData.rollNumber,
      course: stateData.course!,
      year: stateData.year!,
      isKrmu: true,
    });

    await updateUserState(telegramId, UserState.REFERENCE_ID, { referenceId: refId });

    await ctx.replyWithMarkdown(
      `✅ *Registration Initiated!*\n\n` +
        `*Name:* ${stateData.name}\n` +
        `*Course:* ${stateData.course}\n` +
        `*Year:* ${stateData.year}\n\n` +
        `📋 *Registration Fee:* ₹${feeAmount}\n`
    );

    await ctx.reply(`📝 Your Reference ID:\n${refId}\n\n👆 Copy this for payment.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Proceed to Payment', url: config.paymentLinkInternal }],
          [{ text: '✅ I have paid', callback_data: 'payment_done' }],
        ],
      },
    });
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
  const email = stateData.email || (isKrmu && stateData.rollNumber ? `${stateData.rollNumber}@krmu.edu.in` : null);

  if (!email) {
    await ctx.reply('An error occurred. Please try /start again.');
    logger.error('Missing email in finalizeRegistration', { telegramId, stateData });
    return;
  }

  await withTyping(ctx, async () => {
    const refId = await createRegistration({
      telegramId,
      name: stateData.name!,
      email,
      rollNumber: stateData.rollNumber,
      college: stateData.college,
      course: stateData.course!,
      year,
      isKrmu,
      isFresher: stateData.isFresher,
    });

    await updateUserState(telegramId, UserState.REFERENCE_ID, { referenceId: refId, year });

    await ctx.replyWithMarkdown(
      `✅ *Registration Initiated!*\n\n` +
        `*Name:* ${stateData.name}\n` +
        `*Email:* ${stateData.email}\n` +
        `*Year:* ${year}\n\n` +
        `📋 *Registration Fee:* ₹${feeAmount}\n`
    );

    const paymentLink = isKrmu ? config.paymentLinkInternal : config.paymentLinkExternal;
    await ctx.reply(`📝 Your Reference ID:\n${refId}\n\n👆 Copy this for payment.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Proceed to Payment', url: paymentLink }],
          [{ text: '✅ I have paid', callback_data: 'payment_done' }],
        ],
      },
    });
  });
}

export function setupMenuHandlers(bot: Telegraf<Context>) {
  bot.action('my_registration', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      
      if (!registration) {
        await ctx.editMessageText('No registration found. Use /start to register.');
        return;
      }
      
      if (registration.feePaid) {
        await ctx.editMessageText(
          `📋 *Your Registration*\n\n` +
          `*Name:* ${registration.name}\n` +
          `*Reference ID:* ${registration.referenceId}\n` +
          `*Status:* ✅ Confirmed`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Payment pending - show reference and ask if completed
      await ctx.editMessageText(
        `📋 *Your Registration*\n\n` +
        `*Name:* ${registration.name}\n` +
        `*Reference ID:* \`${registration.referenceId}\`\n` +
        `*Fee:* ₹${registration.feeAmount}\n` +
        `*Status:* ⏳ Pending\n\n` +
        `Have you completed the payment?`,
        { parse_mode: 'Markdown', ...yesNoKeyboard('pay') }
      );
    } catch (error) {
      logger.error('Error in my_registration', error, { telegramId });
      await ctx.reply('❌ An error occurred.');
    }
  });

  bot.action('pay_yes', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      if (!registration) return;
      
      // Payment done - tell them it's being reviewed
      await ctx.editMessageText(
        `✅ *Payment Confirmation Received*\n\n` +
        `Your registration is being reviewed.\n` +
        `You will receive your QR ticket via:\n` +
        `• Email\n` +
        `• Telegram (automatically)\n\n` +
        `This usually takes a few minutes. If not received within 24 hours, contact support.`,
        { parse_mode: 'Markdown' }
      );
      
      // Notify admin
      await ctx.telegram.sendMessage(
        config.adminTelegramIds[0],
        `💰 Payment confirmed by ${registration.name} (${registration.referenceId}). Pending approval.`
      );
    } catch (error) {
      logger.error('Error in pay_yes', error, { telegramId });
    }
  });

  bot.action('pay_no', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      if (!registration) return;
      
      // Copy ref ID message + Payment button
      await ctx.editMessageText(
        `📋 Reference ID: ${registration.referenceId}\n\n` +
        `Click payment to proceed:`,
        paymentKeyboard(config.paymentLinkInternal, config.paymentLinkExternal, registration.isKrmu)
      );
    } catch (error) {
      logger.error('Error in pay_no', error, { telegramId });
    }
  });

  bot.action('get_ticket', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await ctx.answerCbQuery();
    
    try {
      const registration = await getRegistrationByTelegramId(telegramId);
      
      if (!registration) {
        await ctx.editMessageText('No registration found.');
        return;
      }
      
      if (!registration.feePaid) {
        await ctx.editMessageText('Ticket not available. Payment pending.');
        return;
      }
      
      if (registration.qrCode) {
        await withUploadPhoto(ctx, async () => {
          await ctx.replyWithPhoto(
            { source: Buffer.from(registration.qrCode.split(',')[1], 'base64') },
            { caption: `🎫 Solesta '26 Ticket\nReference: ${registration.referenceId}\nName: ${registration.name}` }
          );
        });
      } else {
        await ctx.editMessageText('Ticket not available.');
      }
    } catch (error) {
      logger.error('Error in get_ticket', error, { telegramId });
      await ctx.reply('❌ An error occurred.');
    }
  });

  bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    
    await ctx.editMessageText(
      `📖 Help\n\n` +
      `- Use /start to register\n` +
      `- Use /myregistration to view status\n` +
      `- Contact support for issues.`
    );
  });
}