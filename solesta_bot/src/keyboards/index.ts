import { Markup } from 'telegraf';

export function startKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🏛️ KRMU Student', 'krmu')],
    [Markup.button.callback('🌐 External Student', 'external')],
  ]);
}

export function hostelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Yes, I\'m a hostel student', 'hostel_yes')],
    [Markup.button.callback('❌ No', 'hostel_no')],
  ]);
}

export function yesNoKeyboard(actionPrefix: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Yes', `${actionPrefix}_yes`)],
    [Markup.button.callback('❌ No', `${actionPrefix}_no`)],
  ]);
}

export function yearSelectionKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1st Year', 'year_1')],
    [Markup.button.callback('2nd Year', 'year_2')],
    [Markup.button.callback('3rd Year', 'year_3')],
    [Markup.button.callback('4th Year', 'year_4')],
    [Markup.button.callback('5th Year', 'year_5')],
  ]);
}

export function confirmCopyKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ I have copied the Reference ID', 'copy_confirmed')],
  ]);
}

export function paymentKeyboard(internalLink: string, externalLink: string, isKrmu: boolean) {
  const link = isKrmu ? internalLink : externalLink;
  return Markup.inlineKeyboard([
    [Markup.button.url('💳 Proceed to Payment', link)],
    [Markup.button.callback('✅ I have paid', 'payment_done')],
  ]);
}

export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 My Registration', 'my_registration')],
    [Markup.button.callback('🎫 Get Ticket', 'get_ticket')],
    [Markup.button.callback('💬 Contact Support', 'support')],
  ]);
}

export function backKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'go_back')],
  ]);
}

export function adminMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Statistics', 'admin_stats')],
    [Markup.button.callback('📤 Export CSV', 'admin_export')],
    [Markup.button.callback('👥 Filter Users', 'admin_filter')],
    [Markup.button.callback('📁 Import Students', 'admin_import')],
    [Markup.button.callback('➕ Manual Registration', 'admin_manual')],
    [Markup.button.callback('📨 Resend Ticket', 'admin_resend')],
    [Markup.button.callback('🎫 Support Tickets', 'admin_support')],
  ]);
}

export function filterTypeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🏛️ KRMU Only', 'filter_krmu')],
    [Markup.button.callback('🌐 External Only', 'filter_external')],
    [Markup.button.callback('📅 By Year', 'filter_year')],
    [Markup.button.callback('🎯 Fresher Only', 'filter_fresher')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ]);
}

export function adminYearKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1st Year', 'admin_year_1')],
    [Markup.button.callback('2nd Year', 'admin_year_2')],
    [Markup.button.callback('3rd Year', 'admin_year_3')],
    [Markup.button.callback('4th Year', 'admin_year_4')],
    [Markup.button.callback('5th Year', 'admin_year_5')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ]);
}

export function skipOtpKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⏭️ Skip OTP Verification', 'admin_skip_otp')],
  ]);
}

export function cancelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'cancel')],
  ]);
}

export function exportTypeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 All Registrations', 'export_all')],
    [Markup.button.callback('✅ Paid Only', 'export_paid')],
    [Markup.button.callback('🎭 Fresher Participants', 'export_fresher')],
    [Markup.button.callback('🔙 Back', 'admin_back')],
  ]);
}