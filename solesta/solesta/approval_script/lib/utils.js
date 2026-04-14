/**
 * Utility functions for normalization, validation, and string operations
 */

/**
 * Normalize reference ID: trim, uppercase, remove special characters and wrappers
 */
export function normalizeReferenceId(refId) {
  if (!refId) return ""

  let normalized = refId.trim().toUpperCase()

  // Remove emoji and special characters (keep only alphanumeric, hyphens, spaces)
  normalized = normalized.replace(/[^\w\s-]/g, "")

  // Extract SOL26-XXXXX pattern if wrapped in text
  const sol26Match = normalized.match(/SOL26-[A-Z0-9]{5}/)
  if (sol26Match) {
    return sol26Match[0]
  }

  // Remove all spaces and return
  return normalized.replace(/\s+/g, "")
}

/**
 * Normalize email: trim and lowercase
 */
export function normalizeEmail(email) {
  if (!email) return ""
  return email.trim().toLowerCase()
}

/**
 * Normalize name: trim whitespace
 */
export function normalizeName(name) {
  if (!name) return ""
  return name.trim()
}

/**
 * Normalize phone number: remove all non-digits
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return ""
  const cleaned = String(phone).trim().replace(/\D/g, "")
  return cleaned.length >= 10 ? cleaned : ""
}

/**
 * Check if input is a phone number starting with 2
 */
export function isPhoneNumberWithTwo(input) {
  if (!input) return false
  const cleaned = String(input).trim().replace(/\D/g, "")
  return /^2\d{9,10}$/.test(cleaned) // Starts with 2, followed by 9-10 digits
}

/**
 * Extract phone number from input
 */
export function extractPhoneNumber(input) {
  if (!input) return null
  const cleaned = String(input).trim().replace(/\D/g, "")
  if (/^2\d{9,10}$/.test(cleaned)) {
    return cleaned
  }
  return null
}

/**
 * Convert phone number to KRMU email format
 */
export function phoneToKrmuEmail(phoneNumber) {
  if (!phoneNumber) return null
  const phone = extractPhoneNumber(phoneNumber)
  if (phone) {
    return `${phone}@krmu.edu.in`
  }
  return null
}

/**
 * Validate email format (improved)
 */
export function isValidEmail(email) {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate roll number format (10 digits)
 */
export function isValidRollNumber(rollNumber) {
  if (!rollNumber) return false
  const pattern = /^\d{10}$/
  return pattern.test(String(rollNumber).trim())
}

/**
 * Validate reference ID format (SOL26-XXXXX)
 */
export function isValidReferenceFormat(refId) {
  if (!refId) return false
  const pattern = /^SOL26-[A-Z0-9]{5}$/
  return pattern.test(refId)
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of reference IDs
 */
export function levenshteinDistance(str1, str2) {
  const len1 = str1.length
  const len2 = str2.length
  const dp = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0))

  for (let i = 0; i <= len1; i++) dp[0][i] = i
  for (let i = 0; i <= len2; i++) dp[i][0] = i

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // delete
            dp[i][j - 1], // insert
            dp[i - 1][j - 1] // replace
          )
      }
    }
  }

  return dp[len2][len1]
}

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input) {
  if (!input) return ""
  return input.trim().replace(/[<>]/g, "")
}

/**
 * Format currency (INR)
 */
export function formatCurrency(amount) {
  return `₹${amount}`
}

/**
 * Determine student type from product code
 */
export function getStudentType(productCode) {
  if (!productCode) return "UNKNOWN"
  const code = productCode.toUpperCase()
  if (code.includes("EXTERNAL")) {
    return "EXTERNAL"
  } else if (code.includes("INTERNAL") || code.includes("SOLESTA 2026")) {
    return "INTERNAL"
  }
  return "UNKNOWN"
}

/**
 * Format timestamp for logging
 */
export function formatTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split("Z")[0]
}

/**
 * Generate CSV row
 */
export function createCsvRow(data) {
  return Object.values(data)
    .map((val) => {
      if (val === null || val === undefined) return ""
      const str = String(val)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    .join(",")
}

/**
 * Parse CSV row
 */
export function parseCsvRow(line) {
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
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export default {
  normalizeReferenceId,
  normalizeEmail,
  normalizePhoneNumber,
  normalizeName,
  isValidEmail,
  isValidRollNumber,
  isValidReferenceFormat,
  levenshteinDistance,
  sanitizeInput,
  formatCurrency,
  getStudentType,
  formatTimestamp,
  createCsvRow,
  parseCsvRow,
  isPhoneNumberWithTwo,
  extractPhoneNumber,
  phoneToKrmuEmail,
}
