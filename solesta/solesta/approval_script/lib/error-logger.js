/**
 * Error logging and tracking
 */

import fs from "fs/promises"
import path from "path"
import config from "../config.js"
import { createCsvRow, formatTimestamp } from "./utils.js"

const ERROR_HEADERS = [
  "timestamp",
  "reference_id",
  "name",
  "email",
  "student_type",
  "error_type",
  "error_message",
  "raw_data",
]

let errorsCsvPath = null
let sessionLogPath = null

/**
 * Initialize error logging
 */
export async function initializeErrorLogging() {
  try {
    // Ensure logs directory exists
    await fs.mkdir(config.logsDir, { recursive: true })

    // Create errors.csv if it doesn't exist
    errorsCsvPath = path.join(config.logsDir, "errors.csv")
    try {
      await fs.access(errorsCsvPath)
    } catch {
      // File doesn't exist, create it with headers
      await fs.writeFile(
        errorsCsvPath,
        createCsvRow(ERROR_HEADERS) + "\n",
        "utf-8"
      )
    }

    // Create session log
    const timestamp = formatTimestamp()
    sessionLogPath = path.join(config.logsDir, `${timestamp}.log`)

    return {
      errorsCsv: errorsCsvPath,
      sessionLog: sessionLogPath,
    }
  } catch (error) {
    console.error("Failed to initialize error logging:", error)
    throw error
  }
}

/**
 * Log error to CSV
 */
export async function logError(record, errorType, errorMessage, rawData = {}) {
  try {
    if (!errorsCsvPath) {
      console.warn("Error logging not initialized")
      return
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      reference_id: record.referenceId || "N/A",
      name: record.name || "N/A",
      email: record.email || "N/A",
      student_type: record.studentType || "N/A",
      error_type: errorType,
      error_message: errorMessage,
      raw_data: JSON.stringify(rawData),
    }

    const row = createCsvRow(errorEntry) + "\n"
    await fs.appendFile(errorsCsvPath, row, "utf-8")

    return errorEntry
  } catch (error) {
    console.error("Failed to log error:", error)
  }
}

/**
 * Log message to session log
 */
export async function logToSessionFile(message, level = "INFO") {
  try {
    if (!sessionLogPath) {
      console.warn("Session logging not initialized")
      return
    }

    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}\n`
    await fs.appendFile(sessionLogPath, logEntry, "utf-8")
  } catch (error) {
    console.error("Failed to write to session log:", error)
  }
}

/**
 * Log processing summary
 */
export async function logSummary(summary) {
  try {
    if (!sessionLogPath) {
      console.warn("Session logging not initialized")
      return
    }

    const summaryText = `
================================================================================
PROCESSING SUMMARY
================================================================================
Total Records:          ${summary.total}
Skipped (Already Proc): ${summary.skipped}
Successful:             ${summary.successful}
Failed:                 ${summary.failed}
================================================================================
Error Log:              ${errorsCsvPath}
Session Log:            ${sessionLogPath}
================================================================================
`

    await fs.appendFile(sessionLogPath, summaryText, "utf-8")
  } catch (error) {
    console.error("Failed to log summary:", error)
  }
}

/**
 * Get error count from CSV
 */
export async function getErrorCount() {
  try {
    if (!errorsCsvPath) return 0

    const content = await fs.readFile(errorsCsvPath, "utf-8")
    const lines = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("timestamp"))
    return lines.length
  } catch (error) {
    console.error("Failed to get error count:", error)
    return 0
  }
}

/**
 * Delete all error entries for a reference ID
 * Used when a previously failed record is successfully processed
 */
export async function deleteErrorsForRefId(referenceId) {
  try {
    if (!errorsCsvPath) return

    const content = await fs.readFile(errorsCsvPath, "utf-8")
    const lines = content.split("\n")

    // Keep header and filter out lines with matching reference_id
    const headers = lines[0]
    const filteredLines = lines.slice(1).filter((line) => {
      if (!line.trim()) return true // Keep empty lines

      // Parse CSV line to check reference_id (second column)
      const fields = line.split(",")
      if (fields.length > 1) {
        const refId = fields[1].replace(/^"|"$/g, "") // Remove quotes if present
        return refId !== referenceId
      }
      return true
    })

    // Write back the filtered content
    const newContent = [headers, ...filteredLines].join("\n")
    await fs.writeFile(errorsCsvPath, newContent, "utf-8")
  } catch (error) {
    console.error(`Failed to delete errors for ${referenceId}:`, error)
  }
}

export default {
  initializeErrorLogging,
  logError,
  logToSessionFile,
  logSummary,
  getErrorCount,
  deleteErrorsForRefId,
}
