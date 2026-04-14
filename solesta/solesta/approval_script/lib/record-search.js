/**
 * Record search utility
 * Searches for records by email, reference ID, or roll number
 * Note: Phone numbers are not stored in the database, only in payment CSVs
 */

import { prisma } from "../config.js"
import { isValidEmail } from "./utils.js"

/**
 * Search for a record by email, ref ID, or roll number
 * Returns: { found: boolean, refId: string, email: string, name: string }
 */
export async function searchRecord(searchTerm) {
  if (!searchTerm || typeof searchTerm !== "string") {
    return { found: false, error: "Invalid search term" }
  }

  const term = searchTerm.trim()

  try {
    // Strategy 1: Search by reference ID (exact match)
    if (term.toUpperCase().startsWith("SOL26-")) {
      const registration = await prisma.registration.findUnique({
        where: { referenceId: term.toUpperCase() },
        include: { user: true },
      })
      if (registration) {
        return {
          found: true,
          refId: registration.referenceId,
          email: registration.email,
          name: registration.name || "N/A",
          rollNumber: registration.rollNumber || "N/A",
          source: "Reference ID (exact match)",
        }
      }
    }

    // Strategy 2: Search by email (exact match)
    if (isValidEmail(term)) {
      const registration = await prisma.registration.findFirst({
        where: { email: { equals: term, mode: "insensitive" } },
        include: { user: true },
      })
      if (registration) {
        return {
          found: true,
          refId: registration.referenceId,
          email: registration.email,
          name: registration.name || "N/A",
          rollNumber: registration.rollNumber || "N/A",
          source: "Email (exact match)",
        }
      }
    }

    // Strategy 3: Search by roll number in Registration model
    if (/^\d{10}$/.test(term)) {
      // 10-digit KRMU roll number
      const registration = await prisma.registration.findFirst({
        where: { rollNumber: term },
        include: { user: true },
      })
      if (registration) {
        return {
          found: true,
          refId: registration.referenceId,
          email: registration.email,
          name: registration.name || "N/A",
          rollNumber: registration.rollNumber || "N/A",
          source: `Roll number ${term} (matched to registration)`,
        }
      }

      // Alternative: Search Student table then get registration
      const student = await prisma.student.findFirst({
        where: { rollNumber: term },
      })
      if (student && student.email) {
        const reg = await prisma.registration.findFirst({
          where: { email: student.email },
          include: { user: true },
        })
        if (reg) {
          return {
            found: true,
            refId: reg.referenceId,
            email: reg.email,
            name: reg.name || "N/A",
            rollNumber: reg.rollNumber || "N/A",
            source: `Roll number ${term} (matched via student email)`,
          }
        }
      }
    }

    // Not found
    return {
      found: false,
      searchTerm: term,
      error: "No record found",
    }
  } catch (error) {
    return {
      found: false,
      searchTerm: term,
      error: `Search error: ${error.message}`,
    }
  }
}

/**
 * Search records by multiple criteria (for data validation)
 */
export async function validateRecordExists(email, refId, rollNumber) {
  const results = {
    email: null,
    refId: null,
    rollNumber: null,
  }

  if (email) results.email = await searchRecord(email)
  if (refId) results.refId = await searchRecord(refId)
  if (rollNumber) results.rollNumber = await searchRecord(rollNumber)

  return results
}

export default {
  searchRecord,
  validateRecordExists,
}
