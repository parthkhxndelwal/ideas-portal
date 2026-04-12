import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

interface StudentInput {
  rollnumber?: string;
  rollNumber?: string;
  name: string;
  courseAndSemester?: string;
  course?: string;
  year: string;
}

interface StudentRecord {
  rollNumber: string;
  name: string;
  courseAndSemester: string;
  year: string;
  email: string;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function normalize(input: StudentInput): StudentRecord {
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

async function importStudents(filePath: string) {
  const prisma = new PrismaClient();
  
  log(`Reading file: ${filePath}`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const students = data.map(normalize);
  
  log(`Found ${students.length} students to import`);
  
  let imported = 0;
  const total = students.length;
  
  for (let i = 0; i < total; i++) {
    const student = students[i];
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
    
    if ((i + 1) % 500 === 0) {
      log(`Progress: ${i + 1}/${total} (${imported} imported)`);
    }
  }
  
  log(`Import complete: ${imported}/${total}`);
  
  const count = await prisma.student.count();
  log(`Total students in DB: ${count}`);
  
  await prisma.$disconnect();
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx ts-node import/importStudents.ts <students.json>');
  process.exit(1);
}

importStudents(args[0]).catch(console.error);