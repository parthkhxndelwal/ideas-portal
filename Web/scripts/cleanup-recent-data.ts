/**
 * Cleanup Script - Remove Recent Users and Transactions
 * 
 * This script removes all users and transactions created in the last 2 hours.
 * Use this for testing purposes to clean up test data.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-recent-data.ts
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import { config } from "dotenv"
import { resolve } from "path"
import { existsSync } from "fs"

// Try .env.local first, then fall back to .env
const envLocalPath = resolve(process.cwd(), ".env.local")
const envPath = resolve(process.cwd(), ".env")

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath })
  console.log("📁 Loaded environment from .env.local")
} else if (existsSync(envPath)) {
  config({ path: envPath })
  console.log("📁 Loaded environment from .env")
} else {
  console.error("❌ No .env or .env.local file found!")
  process.exit(1)
}

// Verify MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!")
  process.exit(1)
}

const HOURS_TO_REMOVE = 2

async function cleanupRecentData() {
  try {
    console.log(`\n🧹 Starting cleanup of data from the last ${HOURS_TO_REMOVE} hours...\n`)
    
    // Dynamic import after env is loaded
    const { default: clientPromise } = await import("../lib/mongodb")
    
    // Connect to database
    const client = await clientPromise
    const db = client.db("solesta")
    
    // Calculate the cutoff time (2 hours ago)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - HOURS_TO_REMOVE)
    
    console.log(`📅 Cutoff time: ${cutoffTime.toISOString()}`)
    console.log(`📅 Current time: ${new Date().toISOString()}\n`)
    
    // Find users to be deleted (for logging)
    const usersToDelete = await db.collection("users").find({
      createdAt: { $gte: cutoffTime }
    }).toArray()
    
    console.log(`👤 Found ${usersToDelete.length} user(s) to delete:`)
    usersToDelete.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Created: ${user.createdAt.toISOString()}`)
    })
    
    // Find transactions to be deleted (for logging)
    const transactionsToDelete = await db.collection("transactions").find({
      createdAt: { $gte: cutoffTime }
    }).toArray()
    
    console.log(`\n💳 Found ${transactionsToDelete.length} transaction(s) to delete:`)
    transactionsToDelete.forEach(txn => {
      console.log(`   - ${txn.transactionId} (${txn.status}) - Amount: ₹${txn.amount} - Created: ${txn.createdAt.toISOString()}`)
    })
    
    // Ask for confirmation
    console.log("\n⚠️  WARNING: This action cannot be undone!")
    console.log("Press Ctrl+C to cancel or wait 5 seconds to proceed...\n")
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Delete users
    const userDeleteResult = await db.collection("users").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} user(s)`)
    
    // Delete transactions
    const transactionDeleteResult = await db.collection("transactions").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    
    console.log(`✅ Deleted ${transactionDeleteResult.deletedCount} transaction(s)`)
    
    // Also clean up related data
    console.log("\n🔍 Cleaning up related data...")
    
    // Delete email verifications for deleted users
    const emailVerificationDeleteResult = await db.collection("emailVerifications").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    console.log(`✅ Deleted ${emailVerificationDeleteResult.deletedCount} email verification(s)`)
    
    // Delete password resets for deleted users
    const passwordResetDeleteResult = await db.collection("passwordResets").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    console.log(`✅ Deleted ${passwordResetDeleteResult.deletedCount} password reset(s)`)
    
    // Delete entry records for deleted users
    const entryDeleteResult = await db.collection("entries").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    console.log(`✅ Deleted ${entryDeleteResult.deletedCount} entry record(s)`)
    
    // Delete scan records for deleted users
    const scanRecordDeleteResult = await db.collection("scanRecords").deleteMany({
      createdAt: { $gte: cutoffTime }
    })
    console.log(`✅ Deleted ${scanRecordDeleteResult.deletedCount} scan record(s)`)
    
    console.log("\n✨ Cleanup completed successfully!\n")
    
    // Summary
    console.log("📊 Summary:")
    console.log(`   Users deleted:               ${userDeleteResult.deletedCount}`)
    console.log(`   Transactions deleted:        ${transactionDeleteResult.deletedCount}`)
    console.log(`   Email verifications deleted: ${emailVerificationDeleteResult.deletedCount}`)
    console.log(`   Password resets deleted:     ${passwordResetDeleteResult.deletedCount}`)
    console.log(`   Entry records deleted:       ${entryDeleteResult.deletedCount}`)
    console.log(`   Scan records deleted:        ${scanRecordDeleteResult.deletedCount}`)
    console.log()
    
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupRecentData()
