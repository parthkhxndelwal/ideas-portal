import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ApiRequest extends Request {
  apiKeyId?: string;
  userId?: string;
}

export async function authMiddleware(req: ApiRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'MISSING_API_KEY', message: 'X-API-Key header is required.' });
  }

  const keyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });

  if (!keyRecord) {
    return res.status(401).json({ success: false, error: 'INVALID_API_KEY', message: 'Invalid API key.' });
  }

  if (!keyRecord.isActive) {
    return res.status(401).json({ success: false, error: 'INACTIVE_API_KEY', message: 'API key is inactive.' });
  }

  await prisma.apiKey.update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } });

  req.apiKeyId = keyRecord.id;

  next();
}