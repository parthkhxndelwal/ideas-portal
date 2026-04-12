import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface RawStudent {
  rollnumber?: string;
  rollNumber?: string;
  name: string;
  courseAndSemester?: string;
  course?: string;
  year: string;
}

function normalizeStudent(input: RawStudent) {
  const rollNumber = (input.rollnumber || input.rollNumber || '').trim();
  const course = input.courseAndSemester || input.course || '';
  
  return {
    rollNumber,
    name: input.name.trim(),
    courseAndSemester: course,
    year: input.year,
    email: `${rollNumber}@krmu.edu.in`,
  };
}

async function importStudents(students) {
  let imported = 0;
  const total = students.length;
  
  console.log(`Importing ${total} students...`);
  
  for (let i = 0; i < total; i++) {
    const student = normalizeStudent(students[i]);
    try {
      await prisma.student.upsert({
        where: { rollNumber: student.rollNumber },
        update: { name: student.name, courseAndSemester: student.courseAndSemester, year: student.year, email: student.email },
        create: { rollNumber: student.rollNumber, name: student.name, courseAndSemester: student.courseAndSemester, year: student.year, email: student.email },
      });
      imported++;
    } catch (err) {
      // Skip duplicates
    }
    
    if ((i + 1) % 1000 === 0 || i === total - 1) {
      console.log(`Progress: ${i + 1}/${total}, imported: ${imported}`);
    }
  }
  
  return imported;
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || path.join(process.cwd(), '../../solesta_bot/students.json');
  
  console.log('Reading from:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const students = JSON.parse(content);
  
  if (!Array.isArray(students)) {
    console.error('Invalid JSON format');
    process.exit(1);
  }
  
  const count = await importStudents(students);
  console.log(`Imported ${count} students successfully`);
  
  const finalCount = await prisma.student.count();
  console.log(`Total students in DB: ${finalCount}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);