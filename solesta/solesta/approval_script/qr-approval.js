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
 * Validate record before processing (without email resolution to avoid duplicate work)
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

  // Validate email (just basic format check, full resolution happens during processing)
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
 * Collect records for validation phase
 */
async function collectAndValidateAllRecords(records) {
  console.log(`\n[VALIDATION PHASE]`)
  const validated = {
    valid: [],
    failed: [],
    skipped: [],
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const progress = `[${i + 1}/${records.length}]`

    try {
      // Validate and resolve reference ID
      const refValidation = await validateAndResolveRefId(record.referenceId)

      if (!refValidation.success) {
        await logError(record, refValidation.error, refValidation.message)
        validated.failed.push({
          record,
          reason: refValidation.error,
          message: refValidation.message,
        })
        continue
      }

      const dbRegistration = refValidation.registration

      // Validate record
      const validation = await validateRecord(record, dbRegistration)

      if (!validation.valid) {
        if (validation.skip) {
          validated.skipped.push(record)
        } else {
          await logError(
            record,
            validation.reason,
            validation.errors.join("; ")
          )
          validated.failed.push({
            record,
            reason: validation.reason,
            errors: validation.errors,
          })
        }
        continue
      }

      // Record is valid, store ref validation result for later use
      validated.valid.push({
        record,
        refValidation,
      })
    } catch (error) {
      await logError(record, "VALIDATION_ERROR", error.message)
      validated.failed.push({
        record,
        reason: "VALIDATION_ERROR",
        message: error.message,
      })
    }
  }

  console.log(`✓ Validation complete`)
  console.log(`  • Valid: ${validated.valid.length}`)
  console.log(`  • Failed: ${validated.failed.length}`)
  console.log(`  • Skipped: ${validated.skipped.length}`)

  processingStatus.failed += validated.failed.length
  processingStatus.skipped += validated.skipped.length

  return validated
}

/**
 * Process single record (after validation phase - only handling QR generation and sending)
 */
async function processRecord(validatedRecord, index, total) {
  const { record, refValidation } = validatedRecord
  const progress = `[${index + 1}/${total}]`
  const statusPrefix = `${progress} ${record.referenceId} (${normalizeName(record.name)})`
  const dbRegistration = refValidation.registration

  try {
    console.log(`\n${statusPrefix}...`)

    // Resolve email
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

    // Generate QR code
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

    // Update database with QR
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

    // Send email with fallback
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
      // Mark for manual review
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

    // Mark as processed in database
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

    // Clean up any previous errors for this reference ID
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
 * Display manual review summary and next steps
 */
async function displayManualReviewSummary(loggingPaths) {
  console.log("\n[MANUAL REVIEW REQUIRED]")
  console.log("════════════════════════════════════════════════════════════")

  if (processingStatus.failed > 0) {
    console.log(
      `\n⚠  ${processingStatus.failed} records require manual attention:\n`
    )

    console.log(`📋 Review the following for manual intervention:`)
    console.log(`   ${loggingPaths.errorsCsv}`)

    console.log(`\n📝 Common issues and solutions:`)
    console.log(`   • EMAIL_SEND_FAILED: Update email address in database`)
    console.log(
      `   • VALIDATION_FAILED: Check fee & roll number against payment`
    )
    console.log(`   • QR_GEN_FAILED: Technical issue - check logs for details`)
    console.log(`   • MISSING_EMAIL: Add email address in database`)

    console.log(`\n🔄 After fixing issues, you can:`)
    console.log(`   1. Update the database with corrected information`)
    console.log(`   2. Re-run this script to process corrected records`)
    console.log(
      `   3. OR use resend-qr.js to manually send QRs to specific users`
    )
  }

  console.log("\n════════════════════════════════════════════════════════════")
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

    // PHASE 1: Test email BEFORE batch processing
    console.log("\n[TEST EMAIL PHASE]")
    console.log(`Sending test QR to: ${config.testEmailAddress}`)
    const testResult = await sendTestEmail(config.testEmailAddress)

    if (!testResult.success) {
      console.log(`✗ Test email failed: ${testResult.error}`)
      console.log("⚠ Cannot proceed with batch processing")
      throw new Error("Test email phase failed")
    }

    console.log("✓ Test email sent successfully")
    const confirmed = await waitForTestConfirmation(config.testEmailAddress)
    if (!confirmed) {
      console.log("⚠ Test email not confirmed by user")
      throw new Error("Test email not confirmed - aborting")
    }

    // PHASE 2: Validate all records
    const validatedRecords = await collectAndValidateAllRecords(
      csvData.allRecords
    )

    if (validatedRecords.valid.length === 0) {
      console.log(
        "\n⚠ No valid records to process. Check errors log for details."
      )
      await displayManualReviewSummary(loggingPaths)
      return
    }

    // PHASE 3: Process valid records (generate QR + send emails)
    console.log("\n[BATCH PROCESSING]")
    for (let i = 0; i < validatedRecords.valid.length; i++) {
      const validatedRecord = validatedRecords.valid[i]

      try {
        await processRecord(validatedRecord, i, validatedRecords.valid.length)
      } catch (error) {
        // Continue with other records
        console.error(`  ✗ Failed to process: ${error.message}`)
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

    // PHASE 4: Display manual review items (if any)
    if (processingStatus.failed > 0) {
      await displayManualReviewSummary(loggingPaths)
    }

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
