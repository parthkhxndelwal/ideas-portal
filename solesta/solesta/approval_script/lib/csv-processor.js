/**
 * CSV file parsing and processing
 */

import fs from "fs/promises"
import path from "path"
import config from "../config.js"
import { getStudentType } from "./utils.js"

/**
 * Find CSV files in approval_script folder
 */
export async function findCsvFiles() {
  try {
    const files = await fs.readdir(config.approvalScriptDir)
    const csvFiles = files.filter(
      (f) => f.endsWith(".csv") && !f.startsWith(".")
    )

    if (csvFiles.length === 0) {
      throw new Error("No CSV files found in approval_script folder")
    }

    if (csvFiles.length > 2) {
      throw new Error(
        `Found ${csvFiles.length} CSV files. Expected exactly 2 (internal and external)`
      )
    }

    return csvFiles
  } catch (error) {
    throw new Error(`CSV file discovery failed: ${error.message}`)
  }
}

/**
 * Parse CSV file and extract relevant columns
 */
export async function parseCsvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const lines = content.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      throw new Error("CSV file is empty or has no data rows")
    }

    // Parse header
    const headers = parseHeaderLine(lines[0])

    // Find relevant column indices
    // IMPORTANT: For Name, Email, RefID - these appear TWICE in the CSV
    // First occurrence: merchant/payment data
    // Last occurrences (near end): actual participant data
    // We want the LAST occurrences which are the actual participant info

    // Find the LAST "Name" column (participant name, not merchant)
    let nameIndex = -1
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i].toLowerCase() === "name") {
        nameIndex = i
        break
      }
    }
    // Fallback: if no exact "Name", try any name column
    if (nameIndex === -1) {
      nameIndex = headers.findIndex((h) => h.toLowerCase().includes("name"))
    }

    // Find "Email ID" column (participant email, not merchant email)
    const emailIndex = headers.findIndex((h) => h.toLowerCase() === "email id")

    // Find Reference ID column
    const refIdIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("reference id") ||
        h.toLowerCase().includes("your reference id")
    )

    // Find registration fee - prioritize "Registration Fee" columns, look for last match
    let feeIndex = -1
    for (let i = headers.length - 1; i >= 0; i--) {
      const h = headers[i].toLowerCase()
      if (
        h.includes("registration fee") ||
        (h.includes("registration") && h.includes("fee"))
      ) {
        feeIndex = i
        break
      }
    }
    // If not found, search from start for any "fee" column (fallback)
    if (feeIndex === -1) {
      feeIndex = headers.findIndex((h) => h.toLowerCase().includes("fee"))
    }

    // Find product code or program info
    const productCodeIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("product code") ||
        h.toLowerCase().includes("solesta 2026")
    )

    // Find phone number (from payment data)
    const phoneIndex = headers.findIndex(
      (h) =>
        h.toLowerCase() === "phone number" ||
        h.toLowerCase() === "mobile number"
    )

    if (
      nameIndex === -1 ||
      emailIndex === -1 ||
      refIdIndex === -1 ||
      feeIndex === -1
    ) {
      throw new Error(
        "CSV missing required columns: Name, Email, Reference ID, or Fee"
      )
    }

    // Parse data rows
    const records = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      try {
        const fields = parseDataLine(line)

        const record = {
          referenceId: fields[refIdIndex]?.trim().replace(/'/g, "") || "",
          name: fields[nameIndex]?.trim().replace(/'/g, "") || "",
          email: fields[emailIndex]?.trim().replace(/'/g, "") || "",
          phone: fields[phoneIndex]?.trim().replace(/'/g, "") || "",
          fee: parseFloat(fields[feeIndex]?.trim().replace(/'/g, "")) || 0,
          productCode: fields[productCodeIndex]?.trim().replace(/'/g, "") || "",
          studentType: getStudentType(fields[productCodeIndex] || ""),
          rawFields: fields,
        }

        if (record.referenceId && record.name) {
          records.push(record)
        }
      } catch (e) {
        console.warn(`Failed to parse row ${i}: ${e.message}`)
        continue
      }
    }

    return records
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`)
  }
}

/**
 * Parse CSV header line
 */
function parseHeaderLine(line) {
  return line.split(",").map((h) => h.trim().replace(/"/g, ""))
}

/**
 * Parse CSV data line (handle quoted fields)
 */
function parseDataLine(line) {
  const result = []
  let current = ""
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Load and categorize CSV files
 */
export async function loadCsvData() {
  try {
    const csvFiles = await findCsvFiles()
    console.log(`\n✓ Found ${csvFiles.length} CSV files:`)

    const allRecords = []
    let externalRecords = []
    let internalRecords = []

    for (const file of csvFiles) {
      const filePath = path.join(config.approvalScriptDir, file)
      console.log(`  Processing: ${file}`)

      const records = await parseCsvFile(filePath)
      console.log(`    • Loaded ${records.length} records`)

      // Categorize by student type
      if (
        file.includes("external") ||
        records.some((r) => r.studentType === "EXTERNAL")
      ) {
        externalRecords.push(
          ...records.filter((r) => r.studentType === "EXTERNAL")
        )
        console.log(
          `    • External: ${records.filter((r) => r.studentType === "EXTERNAL").length}`
        )
      }

      if (
        file.includes("internal") ||
        records.some((r) => r.studentType === "INTERNAL")
      ) {
        internalRecords.push(
          ...records.filter((r) => r.studentType === "INTERNAL")
        )
        console.log(
          `    • Internal: ${records.filter((r) => r.studentType === "INTERNAL").length}`
        )
      }

      allRecords.push(...records)
    }

    return {
      allRecords,
      externalRecords,
      internalRecords,
      totalRecords: allRecords.length,
    }
  } catch (error) {
    throw new Error(`Failed to load CSV data: ${error.message}`)
  }
}

export default {
  findCsvFiles,
  parseCsvFile,
  parseHeaderLine,
  parseDataLine,
  loadCsvData,
}
