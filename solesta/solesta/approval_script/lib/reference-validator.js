/**
 * Reference ID validation and fuzzy matching
 */

import { normalizeReferenceId, levenshteinDistance } from "./utils.js"
import { prisma } from "../config.js"
import config from "../config.js"
import {
  getCachedMatch,
  saveFuzzyMatch,
  initializeCache,
} from "./fuzzy-match-cache.js"
import * as readline from "readline"

/**
 * Lookup reference ID in database
 */
export async function lookupReferenceId(normalizedRefId) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { referenceId: normalizedRefId },
      include: {
        user: true,
      },
    })

    if (registration) {
      return { found: true, registration }
    }

    return { found: false, registration: null, attemptedId: normalizedRefId }
  } catch (error) {
    console.error("Database lookup error:", error)
    throw error
  }
}

/**
 * Find similar reference IDs using fuzzy matching
 */
export async function fuzzyMatchReferenceId(
  normalizedRefId,
  threshold = config.fuzzyMatchThreshold
) {
  try {
    // Get all reference IDs from database
    const allRegistrations = await prisma.registration.findMany({
      select: {
        referenceId: true,
        name: true,
        email: true,
        isKrmu: true,
      },
    })

    // Calculate similarity scores
    const similarities = allRegistrations.map((reg) => ({
      referenceId: reg.referenceId,
      name: reg.name,
      email: reg.email,
      isKrmu: reg.isKrmu,
      distance: levenshteinDistance(normalizedRefId, reg.referenceId),
    }))

    // Filter and sort by distance
    const closeMatches = similarities
      .filter((s) => s.distance <= threshold)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5) // Top 5 matches

    return closeMatches
  } catch (error) {
    console.error("Fuzzy match error:", error)
    throw error
  }
}

/**
 * Prompt user to select from fuzzy matches
 */
export async function selectFromMatches(matches, originalRefId) {
  return new Promise((resolve) => {
    if (matches.length === 0) {
      resolve(null)
      return
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    console.log(`\n⚠️  Reference ID not found: "${originalRefId}"`)
    console.log("Found similar matches:")
    matches.forEach((match, index) => {
      console.log(
        `  [${index + 1}] ${match.referenceId} (${match.name}, ${match.isKrmu ? "KRMU" : "External"}) - Distance: ${match.distance}`
      )
    })

    const promptText = `Select match (1-${matches.length}) or 'n' to skip: `
    rl.question(promptText, (answer) => {
      rl.close()

      const choice = answer.trim().toLowerCase()
      if (choice === "n" || choice === "no") {
        resolve(null)
      } else {
        const index = parseInt(choice, 10) - 1
        if (index >= 0 && index < matches.length) {
          resolve(matches[index].referenceId)
        } else {
          console.log("Invalid selection")
          resolve(null)
        }
      }
    })
  })
}

/**
 * Validate and resolve reference ID
 */
export async function validateAndResolveRefId(
  csvRefId,
  allowFuzzyMatch = true
) {
  try {
    const normalizedRefId = normalizeReferenceId(csvRefId)

    if (!normalizedRefId) {
      return {
        success: false,
        error: "INVALID_FORMAT",
        message: "Reference ID is empty after normalization",
        originalRefId: csvRefId,
        normalizedRefId: "",
      }
    }

    // Step 1: Try exact match
    const exactMatch = await lookupReferenceId(normalizedRefId)
    if (exactMatch.found) {
      return {
        success: true,
        referenceId: normalizedRefId,
        registration: exactMatch.registration,
        matchType: "EXACT",
      }
    }

    // Step 2: Check cache for previous fuzzy match decision
    const cachedMatch = await getCachedMatch(normalizedRefId)
    if (cachedMatch) {
      const cached = await lookupReferenceId(cachedMatch)
      if (cached.found) {
        return {
          success: true,
          referenceId: cachedMatch,
          registration: cached.registration,
          matchType: "CACHED_FUZZY",
          message: `Using cached match: ${cachedMatch}`,
        }
      }
    }

    // Step 3: Try fuzzy match if allowed
    if (allowFuzzyMatch) {
      const fuzzyMatches = await fuzzyMatchReferenceId(normalizedRefId)

      if (fuzzyMatches.length > 0) {
        // Prompt user to select
        const selectedRefId = await selectFromMatches(
          fuzzyMatches,
          normalizedRefId
        )

        if (selectedRefId) {
          const selected = await lookupReferenceId(selectedRefId)
          if (selected.found) {
            // Save this choice to cache for future runs
            await saveFuzzyMatch(normalizedRefId, selectedRefId)

            return {
              success: true,
              referenceId: selectedRefId,
              registration: selected.registration,
              matchType: "FUZZY",
              message: `User selected: ${selectedRefId}`,
            }
          }
        } else {
          return {
            success: false,
            error: "USER_REJECTED",
            message: "User rejected all fuzzy matches",
            originalRefId: csvRefId,
            normalizedRefId: normalizedRefId,
          }
        }
      }
    }

    // No match found
    return {
      success: false,
      error: "NOT_FOUND",
      message: `Reference ID not found: ${normalizedRefId}`,
      originalRefId: csvRefId,
      normalizedRefId: normalizedRefId,
      debugInfo: `Original: "${csvRefId}" → Normalized: "${normalizedRefId}"`,
    }
  } catch (error) {
    console.error("Reference validation error:", error)
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: error.message,
    }
  }
}

export default {
  lookupReferenceId,
  fuzzyMatchReferenceId,
  selectFromMatches,
  validateAndResolveRefId,
  initializeCache,
}
