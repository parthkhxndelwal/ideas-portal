#!/usr/bin/env node

/**
 * SOLESTA QR RECORD SEARCH TOOL
 *
 * Search for records by:
 * - Email address
 * - Reference ID (SOL26-XXXXX)
 * - Roll number (10-digit KRMU roll)
 *
 * Note: Phone numbers are not stored in the database - they're only in payment CSVs.
 * To find a record by phone, use the roll number or email instead.
 *
 * Usage:
 *   node search-record.js <search-term>
 *   node search-record.js rashmeet@example.com
 *   node search-record.js 2512345678
 *   node search-record.js SOL26-A1127
 */

import { searchRecord } from "./lib/record-search.js"
import { prisma } from "./config.js"

async function main() {
  const searchTerm = process.argv[2]

  if (!searchTerm) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  SOLESTA '26 - RECORD SEARCH TOOL                         ║
╚════════════════════════════════════════════════════════════╝

Usage:
  node search-record.js <search-term>

Examples:
  node search-record.js SOL26-A1127              # Search by Reference ID
  node search-record.js rashmeet@krmu.edu.in      # Search by Email
  node search-record.js 2512345678                # Search by Roll Number

Supported Search Types:
  - Reference ID:    SOL26-XXXXX format (case-insensitive)
  - Email:           Any valid email address
  - Roll Number:     10-digit KRMU roll number

Note: Phone numbers are stored in payment CSVs only, not in the database.
    `)
    process.exit(0)
  }

  try {
    console.log(`\n🔍 Searching for: "${searchTerm}"\n`)

    const result = await searchRecord(searchTerm)

    if (result.found) {
      console.log("✓ Record found!\n")
      console.log(`  Reference ID:  ${result.refId}`)
      console.log(`  Name:          ${result.name}`)
      console.log(`  Email:         ${result.email}`)
      console.log(`  Roll Number:   ${result.rollNumber}`)
      console.log(`  Found via:     ${result.source}\n`)
    } else {
      console.log("✗ Record not found")
      console.log(`  Search term: "${result.searchTerm}"`)
      console.log(`  Error: ${result.error}\n`)
    }
  } catch (error) {
    console.error("Search error:", error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
