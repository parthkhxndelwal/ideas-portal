import { Router, Response } from 'express';
import { ApiRequest } from '../middleware/auth';
import { getRegistrationByExternalAppId, markPaymentSuccessful } from '../../services/registration';
import { sendConfirmationEmail } from '../../services/email';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId } = req.query;

    if (!externalAppId || typeof externalAppId !== 'string') {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId query parameter is required.' });
    }

    const registration = await getRegistrationByExternalAppId(externalAppId);

    if (!registration) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No registration found.' });
    }

    if (!registration.feePaid) {
      return res.status(400).json({ success: false, error: 'NOT_PAID', message: 'Payment not completed.' });
    }

    if (!registration.qrCode) {
      await markPaymentSuccessful(registration.referenceId);
      const updated = await getRegistrationByExternalAppId(externalAppId);
      return res.json({
        success: true,
        data: {
          referenceId: updated.referenceId,
          name: updated.name,
          qrCode: updated.qrCode
        },
        message: 'Ticket retrieved.'
      });
    }

    res.json({
      success: true,
      data: {
        referenceId: registration.referenceId,
        name: registration.name,
        qrCode: registration.qrCode
      },
      message: 'Ticket retrieved.'
    });
  } catch (error: any) {
    console.error('Ticket error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/resend', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, referenceId } = req.body;

    if (!externalAppId || !referenceId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId and referenceId are required.' });
    }

    const registration = await getRegistrationByExternalAppId(externalAppId);
    if (!registration || registration.referenceId !== referenceId) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Registration not found.' });
    }

    if (!registration.feePaid) {
      return res.status(400).json({ success: false, error: 'NOT_PAID', message: 'Payment not completed.' });
    }

    const emailSent = await sendConfirmationEmail(registration.email, registration.name, registration.referenceId, registration.qrCode);

    if (!emailSent) {
      return res.status(500).json({ success: false, error: 'EMAIL_FAILED', message: 'Failed to send email.' });
    }

    logger.info('Ticket resent via email', { externalAppId, referenceId });

    res.json({
      success: true,
      data: { sent: true },
      message: 'Ticket resent to your email.'
    });
  } catch (error: any) {
    console.error('Resend ticket error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

export default router;