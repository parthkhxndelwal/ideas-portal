import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Database ===');
  
  const studentCount = await prisma.student.count();
  console.log('Student count:', studentCount);
  
  const userCount = await prisma.user.count();
  console.log('User count:', userCount);
  
  const regCount = await prisma.registration.count();
  console.log('Registration count:', regCount);
  
  if (studentCount > 0) {
    const students = await prisma.student.findMany({ take: 3 });
    console.log('Sample students:', JSON.stringify(students, null, 2));
  }
  
  // Try to find a specific roll number
  const rollNum = '2105170011';
  const student = await prisma.student.findUnique({ where: { rollNumber: rollNum } });
  console.log(`Student ${rollNum}:`, student);

  await prisma.$disconnect();
}

main().catch(console.error);