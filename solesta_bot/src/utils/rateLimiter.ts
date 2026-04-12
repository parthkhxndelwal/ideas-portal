import { Context, MiddlewareFn } from 'telegraf';
import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger';

const limiter = new Bottleneck({
  reservoir: 30,
  reservoirRefreshAmount: 30,
  reservoirRefreshInterval: 60000,
  maxConcurrent: 1,
});

const userLimiters = new Map<string, Bottleneck>();

function getUserLimiter(telegramId: string): Bottleneck {
  let limiter = userLimiters.get(telegramId);
  
  if (!limiter) {
    limiter = new Bottleneck({
      reservoir: 20,
      reservoirRefreshAmount: 20,
      reservoirRefreshInterval: 60000,
      maxConcurrent: 1,
    });
    userLimiters.set(telegramId, limiter);
  }
  
  return limiter;
}

export const rateLimitMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const telegramId = ctx.from?.id.toString();
  
  if (!telegramId) {
    return next();
  }

  try {
    await next();
  } catch (error) {
    logger.error('Rate limiter error in next():', error);
    throw error;
  }
};

export const globalRateLimitMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  try {
    await limiter.schedule(next);
  } catch (error) {
    logger.error('Global rate limit exceeded', error);
    await ctx.reply('⚠️ Service is busy. Please try again in a moment.');
  }
};