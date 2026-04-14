#!/usr/bin/env node

/**
 * SOLESTA QR APPROVAL SCRIPT
 *
 * Converts payment data from CSV exports to QR entry tickets
 * - Validates reference IDs against database
 * - Resolves emails with priority fallback
 * - Generates encrypted QR codes
 * - Sends QR tickets via email
 * - Logs all errors and tracks processing status
 */

import { validateConfig, prisma, config } from "./config.js"
import { loadCsvData } from "./lib/csv-processor.js"
import { validateAndResolveRefId } from "./lib/reference-validator.js"
import { initializeCache } from "./lib/fuzzy-match-cache.js"
import { resolveEmail } from "./lib/email-resolver.js"
import { generateQRForRegistration } from "./lib/qr-generator.js"
import {
  sendQREmail,
  sendTestEmail,
  testSmtpConnection,
} from "./lib/email-sender.js"
import {
  initializeErrorLogging,
  logError,
  logToSessionFile,
  logSummary,
  deleteErrorsForRefId,
} from "./lib/error-logger.js"
import {
  normalizeReferenceId,
  normalizeName,
  isValidEmail,
  isValidRollNumber,
  formatCurrency,
} from "./lib/utils.js"
import * as readline from "readline"

// Global processing status
let processingStatus = {
  total: 0,
  skipped: 0,
  successful: 0,
  failed: 0,
  errors: [],
}

/**
 * Display banner
 */
function displayBanner() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  SOLESTA '26 - QR APPROVAL SCRIPT                          ║
║  Payment to Entry Ticket Converter                         ║
╚════════════════════════════════════════════════════════════╝
`)
}

/**
 * Prompt user with yes/no question
 */
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

/**
 * Wait for test email confirmation
 */
async function waitForTestConfirmation(testEmailAddress) {
  console.log(
    `\n⏳ Waiting for confirmation... (${config.testEmailTimeout / 1000} seconds)`
  )
  console.log("   [Press ENTER when email received, or wait for timeout]\n")

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const timeout = setTimeout(() => {
      if (rl) {
        rl.close()
        console.log("   Auto-proceeding after timeout...\n")
        resolve(true)
      }
    }, config.testEmailTimeout)

    rl.on("line", () => {
      clearTimeout(timeout)
      rl.close()
      console.log("   ✓ Confirmed. Proceeding...\n")
      resolve(true)
    })
  })
}

/**
 * Send test email
 */
async function runTestEmail() {
  console.log("\n[TEST EMAIL PHASE]")
  console.log(`Sending test QR to: ${config.testEmailAddress}`)

  const testResult = await sendTestEmail(config.testEmailAddress)

  if (!testResult.success) {
    console.log(`✗ Test email failed: ${testResult.error}`)
    return false
  }

  console.log("✓ Test email sent successfully")

  const confirmed = await waitForTestConfirmation(config.testEmailAddress)
  return confirmed
}

/**
 * Validate record before processing
 */
async function validateRecord(record, dbRegistration) {
  const errors = []

  // Check if already processed
  if (dbRegistration.feePaid) {
    return { valid: false, skip: true, reason: "ALREADY_PROCESSED" }
  }

  // Validate name
  if (!normalizeName(record.name)) {
    errors.push("Name is empty")
  }

  // Validate email
  const emailResolution = await resolveEmail(
    record,
    dbRegistration,
    dbRegistration.isKrmu
  )
  if (!emailResolution.email) {
    errors.push(`Email validation failed: ${emailResolution.error}`)
  }

  // Validate fee
  const expectedFee = dbRegistration.isKrmu
    ? config.feeKrmu
    : config.feeExternal
  if (record.fee !== expectedFee) {
    errors.push(
      `Fee mismatch: expected ${formatCurrency(expectedFee)}, got ${formatCurrency(record.fee)}`
    )
  }

  // Validate roll number for KRMU
  if (dbRegistration.isKrmu && !isValidRollNumber(dbRegistration.rollNumber)) {
    errors.push("Invalid or missing roll number for KRMU student")
  }

  if (errors.length > 0) {
    return {
      valid: false,
      skip: false,
      reason: "VALIDATION_FAILED",
      errors,
    }
  }

  return { valid: true }
}

/**
 * Process single record
 */
async function processRecord(record, index, total, isFirstRecord) {
  const progress = `[${index + 1}/${total}]`
  const statusPrefix = `${progress} ${record.referenceId} (${normalizeName(record.name)})`

  try {
    // Step 1: Validate and resolve reference ID
    console.log(`\n${statusPrefix}...`)
    const refValidation = await validateAndResolveRefId(record.referenceId)

    if (!refValidation.success) {
      await logError(record, refValidation.error, refValidation.message)
      processingStatus.failed++
      console.log(`  ✗ ${refValidation.message}`)
      return
    }

    const dbRegistration = refValidation.registration

    // Step 2: Validate record
    const validation = await validateRecord(record, dbRegistration)

    if (!validation.valid) {
      if (validation.skip) {
        processingStatus.skipped++
        console.log(`  ⊘ Skipped (already processed with QR)`)
        return
      }

      await logError(record, validation.reason, validation.errors.join("; "))
      processingStatus.failed++
      console.log(`  ✗ Validation failed: ${validation.errors.join(", ")}`)
      return
    }

    // Step 3: Resolve email
    const emailResolution = await resolveEmail(
      record,
      dbRegistration,
      dbRegistration.isKrmu
    )
    if (!emailResolution.email) {
      await logError(record, "MISSING_EMAIL", emailResolution.error)
      processingStatus.failed++
      console.log(`  ✗ Email resolution failed: ${emailResolution.error}`)
      return
    }

    const finalEmail = emailResolution.email
    console.log(`  Email: ${finalEmail} (from ${emailResolution.source})`)

    // Step 4: Test email if first record
    if (isFirstRecord) {
      const testEmailSuccess = await runTestEmail()
      if (!testEmailSuccess) {
        console.log("\n✗ Aborting due to test email failure")
        throw new Error("Test email phase failed")
      }
    }

    // Step 5: Generate QR code
    let qrResult
    try {
      qrResult = await generateQRForRegistration(
        refValidation.referenceId,
        dbRegistration.rollNumber
      )
      console.log("  ✓ QR generated")
    } catch (error) {
      await logError(record, "QR_GEN_FAILED", error.message)
      processingStatus.failed++
      console.log(`  ✗ QR generation failed: ${error.message}`)
      return
    }

    // Step 6: Update database with QR
    try {
      await prisma.registration.update({
        where: { referenceId: refValidation.referenceId },
        data: {
          qrCode: qrResult.qrCode,
        },
      })
    } catch (error) {
      await logError(record, "DB_UPDATE_FAILED", error.message)
      processingStatus.failed++
      console.log(`  ✗ Database update failed: ${error.message}`)
      return
    }

    // Step 7: Send email with fallback
    let emailResult = await sendQREmail(
      finalEmail,
      normalizeName(record.name),
      refValidation.referenceId,
      dbRegistration.isKrmu,
      qrResult.qrCode
    )

    let emailAttempted = finalEmail

    // Fallback: if primary email fails, try the payment data email
    if (!emailResult.success && record.email && record.email !== finalEmail) {
      console.log(`  ⚠ Retrying with payment data email: ${record.email}`)
      emailResult = await sendQREmail(
        record.email,
        normalizeName(record.name),
        refValidation.referenceId,
        dbRegistration.isKrmu,
        qrResult.qrCode
      )
      if (emailResult.success) {
        emailAttempted = record.email
      }
    }

    if (!emailResult.success) {
      // Option A: Skip invalid emails and mark for manual review
      await logError(
        record,
        "EMAIL_SEND_FAILED",
        `Attempted: ${emailAttempted} | Also tried: ${finalEmail !== emailAttempted ? finalEmail : "N/A"} | Error: ${emailResult.error} (SKIPPED - Manual Review Needed)`
      )
      processingStatus.failed++
      console.log(`  ✗ Email send failed: ${emailResult.error}`)
      console.log(`     ⚠ Marked for manual review - QR not sent`)
      return
    }

    // Step 8: Mark as processed in database
    try {
      await prisma.registration.update({
        where: { referenceId: refValidation.referenceId },
        data: {
          feePaid: true,
          qrSentEmail: true,
          paymentDate: new Date(),
          lastEmailAttempt: new Date(),
        },
      })
    } catch (error) {
      console.warn(`  ⚠ Failed to mark as processed: ${error.message}`)
    }

    // Step 9: Clean up any previous errors for this reference ID
    await deleteErrorsForRefId(refValidation.referenceId)

    processingStatus.successful++
    console.log("  ✓ QR sent successfully")
  } catch (error) {
    console.error(`  ✗ Unexpected error: ${error.message}`)
    await logError(record, "UNEXPECTED_ERROR", error.message)
    processingStatus.failed++
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    displayBanner()

    // Validate configuration
    console.log("[INITIALIZATION]")
    validateConfig()
    console.log("✓ Configuration validated")

    // Initialize fuzzy match cache
    await initializeCache()

    // Initialize error logging
    const loggingPaths = await initializeErrorLogging()
    console.log(`✓ Error logging initialized`)
    console.log(`  • Errors: ${loggingPaths.errorsCsv}`)
    console.log(`  • Session: ${loggingPaths.sessionLog}`)

    // Test SMTP connection
    const smtpOk = await testSmtpConnection()
    if (!smtpOk) {
      throw new Error("SMTP connection failed. Check your email configuration.")
    }

    // Load CSV data
    console.log("\n[CSV PROCESSING]")
    const csvData = await loadCsvData()
    processingStatus.total = csvData.totalRecords
    console.log(`✓ Total records to process: ${csvData.totalRecords}`)
    console.log(
      `  • External: ${csvData.externalRecords.length} (Fee: ${formatCurrency(config.feeExternal)})`
    )
    console.log(
      `  • Internal: ${csvData.internalRecords.length} (Fee: ${formatCurrency(config.feeKrmu)})`
    )

    // Process all records
    console.log("\n[BATCH PROCESSING]")
    let isFirstRecord = true

    for (let i = 0; i < csvData.allRecords.length; i++) {
      const record = csvData.allRecords[i]

      try {
        await processRecord(record, i, csvData.allRecords.length, isFirstRecord)
        isFirstRecord = false
      } catch (error) {
        if (error.message === "Test email phase failed") {
          console.log("\nAborting batch processing due to test email failure")
          throw error
        }
        // Continue with other records
      }
    }

    // Summary
    console.log("\n[SUMMARY]")
    console.log("════════════════════════════════════════════════════════════")
    console.log(`Total Records:        ${processingStatus.total}`)
    console.log(`Skipped:              ${processingStatus.skipped}`)
    console.log(`Successful:           ${processingStatus.successful}`)
    console.log(`Failed:               ${processingStatus.failed}`)
    console.log("════════════════════════════════════════════════════════════")

    await logSummary(processingStatus)

    console.log(`\n✓ Processing complete!`)
    console.log(`\nError Log: ${loggingPaths.errorsCsv}`)
    console.log(`Session Log: ${loggingPaths.sessionLog}\n`)
  } catch (error) {
    console.error(`\n✗ Fatal error: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  } finally {
    // Disconnect Prisma
    await prisma.$disconnect()
  }
}

// Run the script
main()
