import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.student.count();
  console.log('Total students in DB:', count);

  const sample = await prisma.student.findMany({ take: 5 });
  console.log('Sample students:', JSON.stringify(sample, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);