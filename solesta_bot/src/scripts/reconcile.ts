import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { config, validateConfig } from '../utils/config';

interface PaymentRecord {
  referenceId?: string;
  reference_id?: string;
  amount?: string;
  amountPaid?: string;
  amount_paid?: string;
  status?: string;
  date?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

async function processPaymentFile(filePath: string): Promise<number> {
  logger.info('Starting reconciliation', { filePath });

  const ext = path.extname(filePath).toLowerCase();
  let payments: PaymentRecord[] = [];

  if (ext === '.csv') {
    payments = await parseCsv(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    payments = await parseExcel(filePath);
  } else {
    throw new Error('Unsupported file format. Use CSV or XLSX.');
  }

  logger.info(`Parsed ${payments.length} payment records`);

  let successCount = 0;
  let alreadyPaidCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const payment of payments) {
    try {
      const referenceId = payment.referenceId || payment.reference_id;
      
      if (!referenceId) {
        logger.warn('Missing reference ID in payment record', payment);
        notFoundCount++;
        continue;
      }

      const registration = await prisma.registration.findUnique({
        where: { referenceId },
      });

      if (!registration) {
        logger.warn('Registration not found', { referenceId });
        notFoundCount++;
        continue;
      }

      if (registration.feePaid) {
        logger.info('Already paid', { referenceId });
        alreadyPaidCount++;
        continue;
      }

      await prisma.registration.update({
        where: { referenceId },
        data: {
          feePaid: true,
          paymentDate: new Date(),
        },
      });

      logger.info('Payment marked successful', { referenceId });
      successCount++;
    } catch (error) {
      logger.error('Error processing payment record', error, payment);
      errorCount++;
    }
  }

  logger.info('Reconciliation complete', {
    success: successCount,
    alreadyPaid: alreadyPaidCount,
    notFound: notFoundCount,
    errors: errorCount,
  });

  return successCount;
}

async function parseCsv(filePath: string): Promise<PaymentRecord[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const records: PaymentRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const record: PaymentRecord = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    records.push(record);
  }

  return records;
}

async function parseExcel(filePath: string): Promise<PaymentRecord[]> {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data as PaymentRecord[];
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run reconcile -- <path-to-payment-file>');
    console.log('Example: npm run reconcile -- ./payments.csv');
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }

  await connectDatabase();

  try {
    const count = await processPaymentFile(filePath);
    console.log(`✅ Successfully processed ${count} payments`);
  } catch (error) {
    logger.error('Reconciliation failed', error);
    console.error('Reconciliation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

export { processPaymentFile, parseCsv, parseExcel };