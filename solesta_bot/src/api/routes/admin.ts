import { Router, Response } from 'express';
import { ApiRequest } from '../middleware/auth';
import { getStatistics, getFilteredRegistrations, getAllRegistrations } from '../../services/registration';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/registrations', async (req: ApiRequest, res: Response) => {
  try {
    const { isKrmu, year, isFresher, feePaid, limit = '100', offset = '0' } = req.query;

    const filter: any = {};
    if (isKrmu !== undefined) filter.isKrmu = isKrmu === 'true';
    if (year) filter.year = year as string;
    if (isFresher !== undefined) filter.isFresher = isFresher === 'true';
    if (feePaid !== undefined) filter.feePaid = feePaid === 'true';

    const registrations = await prisma.registration.findMany({
      where: filter,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      select: {
        referenceId: true,
        name: true,
        email: true,
        rollNumber: true,
        college: true,
        course: true,
        year: true,
        isKrmu: true,
        isFresher: true,
        feeAmount: true,
        feePaid: true,
        paymentDate: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: { registrations, count: registrations.length },
      message: 'Registrations retrieved.'
    });
  } catch (error: any) {
    console.error('Admin registrations error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.get('/statistics', async (_req: ApiRequest, res: Response) => {
  try {
    const stats = await getStatistics();
    res.json({ success: true, data: stats, message: 'Statistics retrieved.' });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.get('/export', async (req: ApiRequest, res: Response) => {
  try {
    const { type = 'all' } = req.query;

    let registrations;
    switch (type) {
      case 'paid':
        registrations = await prisma.registration.findMany({ where: { feePaid: true } });
        break;
      case 'fresher':
        registrations = await prisma.registration.findMany({ where: { isFresher: true } });
        break;
      default:
        registrations = await prisma.registration.findMany();
    }

    const csv = [
      'Reference ID,Name,Email,Roll Number,College,Course,Year,Is KRMU,Is Fresher,Fee Amount,Fee Paid,Payment Date,Created At',
      ...registrations.map(r => 
        `"${r.referenceId}","${r.name}","${r.email}","${r.rollNumber || ''}","${r.college || ''}","${r.course}","${r.year}",${r.isKrmu},${r.isFresher},${r.feeAmount},${r.feePaid},"${r.paymentDate?.toISOString() || ''}","${r.createdAt.toISOString()}"`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${type}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Admin export error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

export default router;