/**
 * Fuzzy match cache
 * Stores user choices for fuzzy matches to avoid re-prompting
 * Format: { "original_ref_id": "matched_ref_id", ... }
 */

import fs from "fs/promises"
import path from "path"
import config from "../config.js"

const CACHE_FILE = path.join(config.logsDir, "fuzzy-match-cache.json")

let cache = {}
let cacheLoaded = false

/**
 * Load cache from file
 */
async function loadCache() {
  try {
    // Ensure logs directory exists
    await fs.mkdir(config.logsDir, { recursive: true })

    try {
      const content = await fs.readFile(CACHE_FILE, "utf-8")
      cache = JSON.parse(content)
      cacheLoaded = true
      console.log(
        `✓ Loaded fuzzy match cache (${Object.keys(cache).length} entries)`
      )
    } catch {
      // File doesn't exist, start with empty cache
      cache = {}
      cacheLoaded = true
    }
  } catch (error) {
    console.error("Failed to load fuzzy match cache:", error)
    cache = {}
    cacheLoaded = true
  }
}

/**
 * Get cached match for a reference ID
 */
export async function getCachedMatch(originalRefId) {
  if (!cacheLoaded) {
    await loadCache()
  }

  return cache[originalRefId] || null
}

/**
 * Save a fuzzy match choice to cache
 */
export async function saveFuzzyMatch(originalRefId, matchedRefId) {
  if (!cacheLoaded) {
    await loadCache()
  }

  cache[originalRefId] = matchedRefId

  try {
    // Ensure logs directory exists
    await fs.mkdir(config.logsDir, { recursive: true })
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8")
  } catch (error) {
    console.error("Failed to save fuzzy match to cache:", error)
  }
}

/**
 * Clear cache
 */
export async function clearCache() {
  cache = {}
  try {
    await fs.unlink(CACHE_FILE)
    console.log("✓ Fuzzy match cache cleared")
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to clear fuzzy match cache:", error)
    }
  }
}

/**
 * Get all cached matches
 */
export function getAllCachedMatches() {
  return { ...cache }
}

/**
 * Initialize cache on startup
 */
export async function initializeCache() {
  await loadCache()
}

export default {
  getCachedMatch,
  saveFuzzyMatch,
  clearCache,
  initializeCache,
  getAllCachedMatches,
}
