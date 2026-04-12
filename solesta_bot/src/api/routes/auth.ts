import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/verify', async (req: ApiRequest, res: Response) => {
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

  res.json({
    success: true,
    data: { valid: true, name: keyRecord.name, createdAt: keyRecord.createdAt },
    message: 'API key is valid.'
  });
});

router.get('/user', async (req: ApiRequest, res: Response) => {
  const { externalAppId } = req.query;

  if (!externalAppId || typeof externalAppId !== 'string') {
    return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId query parameter is required.' });
  }

  const user = await prisma.user.findUnique({
    where: { externalAppId },
    include: { registration: true }
  });

  if (!user) {
    return res.json({ success: true, data: { exists: false, registration: null }, message: 'No user found.' });
  }

  res.json({
    success: true,
    data: {
      exists: true,
      state: user.state,
      isVerified: user.isVerified,
      isKrmu: user.isKrmu,
      registration: user.registration ? {
        referenceId: user.registration.referenceId,
        name: user.registration.name,
        email: user.registration.email,
        isKrmu: user.registration.isKrmu,
        feePaid: user.registration.feePaid,
        qrCode: user.registration.qrCode ? true : false
      } : null
    },
    message: 'User retrieved successfully.'
  });
});

export default router;