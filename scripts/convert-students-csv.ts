import fs from "fs"
import path from "path"

interface RollNumberData {
  name: string
  rollnumber: string
  courseAndSemester: string
  year: string
}

const inputFile = path.join(process.cwd(), "students.csv")
const outputFile = path.join(process.cwd(), "students.json")

function parseCSV(filePath: string): RollNumberData[] {
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split("\n").filter(line => line.trim())
  
  // Skip header row
  const dataLines = lines.slice(1)
  
  const data: RollNumberData[] = []
  
  for (const line of dataLines) {
    // Handle CSV with commas, but also quoted fields
    const parts: string[] = []
    let current = ""
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        parts.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    parts.push(current.trim())
    
    // Skip empty rows
    if (parts.length < 3) continue
    
    // CSV format: S.NO., Student ID, Student Name, Program
    const serialNo = parts[0]
    const studentId = parts[1]
    const studentName = parts[2]
    const program = parts[3]
    
    // Skip if no student ID
    if (!studentId) continue
    
    // Extract year from Student ID
    let year = ""
    
    // Format 1: 21XXXXXXX -> 2021, 20XXXXXXX -> 2020
    if (studentId.match(/^\d{2}/)) {
      const num = parseInt(studentId.substring(0, 2))
      if (num >= 19 && num <= 99) {
        year = num >= 50 ? `19${num}` : `20${num}`
      }
    }
    // Format 2: KRMU25XXXXXXX -> 2025 (KRMU + year + rest)
    if (studentId.startsWith("KRMU")) {
      // Year is after "KRMU" prefix (positions 4-5)
      const yearPart = studentId.substring(4, 6)
      if (yearPart.match(/^\d{2}$/)) {
        const num = parseInt(yearPart)
        if (num >= 19 && num <= 99) {
          year = num >= 50 ? `19${yearPart}` : `20${yearPart}`
        }
      }
    }
    
    // Skip if no valid roll number or data
    if (!studentId || !studentName) continue
    
    // Skip if critical fields are empty (but allow placeholder values)
    const validPlaceholders = ["tbd", "n/a", "pending", "to be assigned", "unknown program", "unknown course"]
    if (!program || validPlaceholders.includes(program.trim().toLowerCase())) {
      console.log(`Skipping row ${serialNo}: missing/placeholder program - ${studentName} (${studentId})`)
      continue
    }
    
    data.push({
      name: studentName,
      rollnumber: studentId,
      courseAndSemester: program || "",
      year: year || ""
    })
  }
  
  return data
}

try {
  const parsedData = parseCSV(inputFile)
  
  fs.writeFileSync(outputFile, JSON.stringify(parsedData, null, 2))
  
  console.log(`✓ Converted ${parsedData.length} students`)
  console.log(`✓ Output saved to: ${outputFile}`)
  
  // Show sample
  console.log("\n--- Sample Output (first 3 records) ---")
  console.log(JSON.stringify(parsedData.slice(0, 3), null, 2))
  
} catch (error) {
  console.error("Error:", error)
  process.exit(1)
}