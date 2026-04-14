#!/usr/bin/env node

/**
 * Test email sender - sends a sample QR email to verify formatting
 */

import { sendQREmail } from "./lib/email-sender.js"
import { generateQRForRegistration } from "./lib/qr-generator.js"
import { prisma } from "./config.js"

async function main() {
  try {
    const testEmail = "2301350013@krmu.edu.in"
    const testName = "Test User"
    const testRefId = "SOL26-TEST01"
    const isKrmu = true

    console.log(`\n📧 Generating test QR code...`)
    const qrResult = await generateQRForRegistration(testRefId, "2301350013")
    console.log(`✓ QR generated\n`)

    console.log(`📧 Sending test email to: ${testEmail}`)
    console.log(`   Name: ${testName}`)
    console.log(`   Reference ID: ${testRefId}`)
    console.log(`   QR: ${qrResult.qrCode.substring(0, 50)}...\n`)

    const result = await sendQREmail(
      testEmail,
      testName,
      testRefId,
      isKrmu,
      qrResult.qrCode
    )

    if (result.success) {
      console.log(`✅ Test email sent successfully!`)
      console.log(`   Message ID: ${result.messageId}`)
      console.log(`   Recipient: ${result.email}`)
    } else {
      console.log(`❌ Test email failed:`)
      console.log(`   Error: ${result.error}`)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
