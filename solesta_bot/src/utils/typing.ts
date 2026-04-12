import { Context } from 'telegraf';

export async function withTyping(ctx: Context, action: () => Promise<void>): Promise<void> {
  await ctx.sendChatAction('typing');
  await action();
}

export async function withUploadPhoto(ctx: Context, action: () => Promise<void>): Promise<void> {
  await ctx.sendChatAction('upload_photo');
  await action();
}

export async function withUploadDocument(ctx: Context, action: () => Promise<void>): Promise<void> {
  await ctx.sendChatAction('upload_document');
  await action();
}