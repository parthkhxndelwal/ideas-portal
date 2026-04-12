"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}
function normalize(input) {
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
async function importStudents(filePath) {
    const prisma = new client_1.PrismaClient();
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
        }
        catch (err) {
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
//# sourceMappingURL=importStudents.js.map