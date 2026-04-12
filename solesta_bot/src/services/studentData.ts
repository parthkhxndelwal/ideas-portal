import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export interface StudentRecord {
  rollNumber: string;
  name: string;
  courseAndSemester: string;
  year: string;
  email?: string;
}

interface RawStudentInput {
  rollnumber?: string;
  rollNumber?: string;
  name: string;
  courseAndSemester?: string;
  course?: string;
  year: string;
}

function normalizeStudent(input: RawStudentInput): StudentRecord {
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

export async function findStudentByRollNumber(rollNumber: string): Promise<StudentRecord | null> {
  const student = await prisma.student.findUnique({
    where: { rollNumber },
  });

  if (!student) {
    return null;
  }

  return {
    rollNumber: student.rollNumber,
    name: student.name,
    courseAndSemester: student.courseAndSemester,
    year: student.year,
    email: student.email || undefined,
  };
}

export async function importStudents(students: RawStudentInput[]): Promise<number> {
  let imported = 0;
  const total = students.length;
  
  for (let i = 0; i < total; i++) {
    const student = normalizeStudent(students[i]);
    try {
      await prisma.student.upsert({
        where: { rollNumber: student.rollNumber },
        update: { name: student.name, courseAndSemester: student.courseAndSemester, year: student.year, email: student.email },
        create: { rollNumber: student.rollNumber, name: student.name, courseAndSemester: student.courseAndSemester, year: student.year, email: student.email },
      });
      imported++;
    } catch {
      // Skip duplicates/errors
    }
    
    // Log progress every 1000 records
    if ((i + 1) % 1000 === 0 || i === total - 1) {
      logger.info('Student import progress', { progress: i + 1, total, imported });
    }
  }

  logger.info('Student import complete', { total, imported });
  return imported;
}

export async function getStudentCount(): Promise<number> {
  return prisma.student.count();
}

export async function clearStudents(): Promise<void> {
  await prisma.student.deleteMany();
  logger.info('All student records cleared');
}