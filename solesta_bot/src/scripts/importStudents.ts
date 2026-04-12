import 'dotenv/config';
import fs from 'fs';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { config, validateConfig } from '../utils/config';
import { connectDatabase, disconnectDatabase } from '../db/prisma';
import { importStudents, StudentRecord } from '../services/studentData';

async function importFromJsonFile(filePath: string): Promise<number> {
  logger.info('Starting student import', { filePath });

  const content = fs.readFileSync(filePath, 'utf-8');
  const students: StudentRecord[] = JSON.parse(content);

  if (!Array.isArray(students)) {
    throw new Error('Invalid JSON format. Expected array of student records.');
  }

  logger.info(`Found ${students.length} student records to import`);

  const imported = await importStudents(students);

  logger.info('Student import complete', { imported });
  return imported;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run import:students -- <path-to-json-file>');
    console.log('Example: npm run import:students -- ./students.json');
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
    const count = await importFromJsonFile(filePath);
    console.log(`✅ Successfully imported ${count} students`);
  } catch (error) {
    logger.error('Import failed', error);
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  main();
}

export { importFromJsonFile };