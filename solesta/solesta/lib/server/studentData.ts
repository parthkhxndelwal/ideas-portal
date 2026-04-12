import { prisma } from './prisma';

export interface StudentRecord {
  rollNumber: string;
  name: string;
  courseAndSemester: string;
  year: string;
  email?: string;
}

export async function findStudentByRollNumber(
  rollNumber: string
): Promise<StudentRecord | null> {
  const student = await prisma.student.findFirst({
    where: { rollNumber },
  });

  if (!student || !student.rollNumber || !student.name) {
    return null;
  }

  return {
    rollNumber: student.rollNumber!,
    name: student.name!,
    courseAndSemester: student.courseAndSemester || '',
    year: student.year || '',
    email: student.email || undefined,
  };
}

export async function importStudents(
  students: { rollNumber: string; name: string; courseAndSemester: string; year: string; email?: string }[]
): Promise<number> {
  let imported = 0;
  const total = students.length;

  for (let i = 0; i < total; i++) {
    const student = students[i];
    try {
      const existing = await prisma.student.findFirst({
        where: { rollNumber: student.rollNumber },
      });
      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            name: student.name,
            courseAndSemester: student.courseAndSemester,
            year: student.year,
            email: student.email,
          },
        });
      } else {
        await prisma.student.create({
          data: {
            rollNumber: student.rollNumber,
            name: student.name,
            courseAndSemester: student.courseAndSemester,
            year: student.year,
            email: student.email,
          },
        });
      }
      imported++;
    } catch {
      // Skip duplicates/errors
    }
  }

  return imported;
}