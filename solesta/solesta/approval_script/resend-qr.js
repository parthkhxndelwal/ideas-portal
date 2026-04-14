#!/usr/bin/env node

/**
 * SOLESTA QR RESEND SCRIPT
 *
 * Resends QR codes to all registrations that have:
 * - feePaid: true (payment approved)
 * - qrCode: not null (QR generated)
 *
 * Useful for:
 * - Re-sending QRs to users who didn't receive them
 * - Fixing email delivery issues
 * - Batch resending to a subset of users
 */

import { prisma, config } from "./config.js"
import { sendQREmail } from "./lib/email-sender.js"
import {
  initializeErrorLogging,
  logError,
  logToSessionFile,
  logSummary,
  deleteErrorsForRefId,
} from "./lib/error-logger.js"
import { normalizeName, formatCurrency } from "./lib/utils.js"
import * as readline from "readline"

// Processing status
let processingStatus = {
  total: 0,
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
║  SOLESTA '26 - QR RESEND SCRIPT                           ║
║  Resend QR Codes to Approved Registrations                ║
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
 * Resend QR to a registration
 */
async function resendQRToRegistration(registration, index, total) {
  const progress = `[${index + 1}/${total}]`
  const statusPrefix = `${progress} ${registration.referenceId} (${registration.name})`

  try {
    console.log(`\n${statusPrefix}...`)

    // Validate we have the QR code
    if (!registration.qrCode) {
      console.log(`  ⚠ No QR code stored for this registration`)
      return { success: false, reason: "NO_QR_CODE" }
    }

    // Send email
    const emailResult = await sendQREmail(
      registration.email,
      normalizeName(registration.name),
      registration.referenceId,
      registration.isKrmu,
      registration.qrCode
    )

    if (!emailResult.success) {
      console.log(`  ✗ Email send failed: ${emailResult.error}`)

      // Try fallback: if registration has a user relation, try alternate email
      if (
        registration.user?.email &&
        registration.user.email !== registration.email
      ) {
        console.log(`  ⚠ Retrying with user email: ${registration.user.email}`)
        const fallbackResult = await sendQREmail(
          registration.user.email,
          normalizeName(registration.name),
          registration.referenceId,
          registration.isKrmu,
          registration.qrCode
        )

        if (fallbackResult.success) {
          console.log(`  ✓ QR resent successfully (to alternate email)`)
          return { success: true, email: registration.user.email }
        }
      }

      return {
        success: false,
        reason: "EMAIL_FAILED",
        error: emailResult.error,
      }
    }

    console.log(`  ✓ QR resent successfully`)
    return { success: true, email: registration.email }
  } catch (error) {
    console.error(`  ✗ Unexpected error: ${error.message}`)
    return { success: false, reason: "UNEXPECTED_ERROR", error: error.message }
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    displayBanner()

    // Initialize error logging
    console.log("[INITIALIZATION]")
    const loggingPaths = await initializeErrorLogging()
    console.log(`✓ Error logging initialized`)
    console.log(`  • Errors: ${loggingPaths.errorsCsv}`)
    console.log(`  • Session: ${loggingPaths.sessionLog}`)

    // Fetch all registrations with QR codes and feePaid=true
    console.log("\n[FETCHING REGISTRATIONS]")
    const registrations = await prisma.registration.findMany({
      where: {
        feePaid: true,
        qrCode: {
          not: null,
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    processingStatus.total = registrations.length

    if (registrations.length === 0) {
      console.log("✗ No registrations found with QR codes and feePaid=true")
      process.exit(0)
    }

    console.log(`✓ Found ${registrations.length} registrations to resend`)

    // Group by student type
    const krmuRegistrations = registrations.filter((r) => r.isKrmu)
    const externalRegistrations = registrations.filter((r) => !r.isKrmu)

    console.log(`  • KRMU: ${krmuRegistrations.length}`)
    console.log(`  • External: ${externalRegistrations.length}`)

    // Ask for confirmation
    console.log("\n[CONFIRMATION]")
    console.log(
      `About to resend QR codes to ${registrations.length} registrations.`
    )
    const confirm = await prompt("Continue? (yes/no): ")

    if (confirm !== "yes" && confirm !== "y") {
      console.log("\n✗ Resend cancelled by user")
      process.exit(0)
    }

    // Optionally filter by student type
    let toResend = registrations
    console.log("\n[OPTIONS]")
    const filterType = await prompt(
      "Resend to all, KRMU only, or External only? (all/krmu/external): "
    )

    if (filterType === "krmu") {
      toResend = krmuRegistrations
      console.log(`Filtering to KRMU only: ${toResend.length} registrations`)
    } else if (filterType === "external") {
      toResend = externalRegistrations
      console.log(
        `Filtering to External only: ${toResend.length} registrations`
      )
    } else {
      console.log(`Resending to all: ${toResend.length} registrations`)
    }

    // Process registrations
    console.log("\n[BATCH RESENDING]")
    for (let i = 0; i < toResend.length; i++) {
      const registration = toResend[i]

      try {
        const result = await resendQRToRegistration(
          registration,
          i,
          toResend.length
        )

        if (result.success) {
          processingStatus.successful++
        } else {
          processingStatus.failed++
          processingStatus.errors.push({
            referenceId: registration.referenceId,
            name: registration.name,
            email: registration.email,
            reason: result.reason,
            error: result.error,
          })
        }
      } catch (error) {
        console.error(`  ✗ Failed to process: ${error.message}`)
        processingStatus.failed++
        processingStatus.errors.push({
          referenceId: registration.referenceId,
          name: registration.name,
          email: registration.email,
          reason: "UNEXPECTED_ERROR",
          error: error.message,
        })
      }
    }

    // Summary
    console.log("\n[SUMMARY]")
    console.log("════════════════════════════════════════════════════════════")
    console.log(`Total Registrations:  ${processingStatus.total}`)
    console.log(`Resend Successful:    ${processingStatus.successful}`)
    console.log(`Resend Failed:        ${processingStatus.failed}`)
    console.log("════════════════════════════════════════════════════════════")

    // Log failed resends
    if (processingStatus.errors.length > 0) {
      console.log("\n[FAILED RESENDS]")
      processingStatus.errors.forEach((err) => {
        console.log(
          `  • ${err.referenceId} (${err.name}): ${err.reason}${err.error ? ` - ${err.error}` : ""}`
        )
      })
    }

    // Log to session file
    await logToSessionFile(`\n[RESEND SCRIPT SUMMARY]`, "INFO")
    await logToSessionFile(`Total: ${processingStatus.total}`, "INFO")
    await logToSessionFile(`Successful: ${processingStatus.successful}`, "INFO")
    await logToSessionFile(`Failed: ${processingStatus.failed}`, "INFO")

    if (processingStatus.errors.length > 0) {
      await logToSessionFile(`\nFailed resends:`, "INFO")
      for (const err of processingStatus.errors) {
        await logToSessionFile(
          `  ${err.referenceId}: ${err.reason} - ${err.error || "N/A"}`,
          "ERROR"
        )
      }
    }

    console.log(`\n✓ Resend complete!`)
    console.log(`\nSession Log: ${loggingPaths.sessionLog}\n`)
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
