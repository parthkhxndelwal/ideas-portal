import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { findStudentByRollNumber } from "@/lib/server/studentData"
import { createAndSendOtp, verifyOtp } from "@/lib/server/otp"
import { sendConfirmationEmail } from "@/lib/server/email"
import {
  getOrCreateUserByExternalAppId,
  getUserByExternalAppId,
} from "@/lib/server/stateMachine"
import { checkDuplicateRegistration } from "@/lib/server/registration"
import { config } from "@/lib/server/config"
import { isReferenceIdUnique, encryptQR } from "@/lib/server/crypto"

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  try {
    const body = await request.json()

    if (path === "submit-roll-number") {
      return handleSubmitRollNumber(body)
    } else if (path === "verify-otp") {
      return handleVerifyOtp(body)
    } else if (path === "confirm-registration") {
      return handleConfirmRegistration(body)
    }

    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "Endpoint not found." },
      { status: 404 }
    )
  } catch (error: any) {
    console.error("Fresher Registration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "An error occurred.",
      },
      { status: 500 }
    )
  }
}

async function handleSubmitRollNumber(body: any) {
  const { rollNumber } = body

  if (!rollNumber) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "rollNumber is required.",
      },
      { status: 400 }
    )
  }

  // Validate roll number format (10 digits)
  if (!/^\d{10}$/.test(rollNumber)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_FORMAT",
        message: "Roll number must be exactly 10 digits.",
      },
      { status: 400 }
    )
  }

  try {
    // Check if student exists and fetch their details
    const student = await findStudentByRollNumber(rollNumber)
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "STUDENT_NOT_FOUND",
          message:
            "This roll number is not found in our KRMU student database.",
        },
        { status: 404 }
      )
    }

    // Check if student is first year (2025 batch for 2026)
    const currentYear = new Date().getFullYear()
    const fresherBatchYear = (currentYear - 1).toString() // 2025 for 2026

    if (student.year !== fresherBatchYear) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FIRST_YEAR",
          message: `This competition is only for ${fresherBatchYear} batch (first-year students).`,
        },
        { status: 403 }
      )
    }

    // Check if already registered for fresher competition
    const krmuEmail = `${rollNumber}@krmu.edu.in`
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        rollNumber,
        isFresher: true,
      },
    })

    if (existingRegistration) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_REGISTERED",
          message:
            "You have already registered for Mr. & Mrs. Fresher competition.",
        },
        { status: 409 }
      )
    }

    // Generate OTP and send to KRMU email
    const otpResult = await createAndSendOtp(
      `fresher_${rollNumber}`,
      krmuEmail,
      true
    )

    if (!otpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP_SEND_FAILED",
          message: "Failed to send OTP. Please try again.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        rollNumber,
        email: krmuEmail,
        name: student.name,
        year: student.year,
      },
      message: `OTP sent to ${krmuEmail}. Please verify to proceed.`,
    })
  } catch (error: any) {
    console.error("Roll number submission error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "An error occurred while processing your request.",
      },
      { status: 500 }
    )
  }
}

async function handleVerifyOtp(body: any) {
  const { rollNumber, otp } = body

  if (!rollNumber || !otp) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "rollNumber and otp are required.",
      },
      { status: 400 }
    )
  }

  try {
    // Verify OTP using the standard verifyOtp function
    const otpResult = await verifyOtp(`fresher_${rollNumber}`, otp)

    if (!otpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OTP",
          message: otpResult.message,
        },
        { status: 400 }
      )
    }

    // Get student details
    const student = await findStudentByRollNumber(rollNumber)
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "STUDENT_NOT_FOUND",
          message: "Student not found. Please try again.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        rollNumber,
        name: student.name,
        year: student.year,
        verified: true,
      },
      message: "OTP verified successfully. Do you want to register?",
    })
  } catch (error: any) {
    console.error("OTP verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "An error occurred during OTP verification.",
      },
      { status: 500 }
    )
  }
}

async function handleConfirmRegistration(body: any) {
  const { rollNumber, confirm, externalAppId } = body

  if (!rollNumber || typeof confirm !== "boolean") {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "rollNumber and confirm (boolean) are required.",
      },
      { status: 400 }
    )
  }

  try {
    if (!confirm) {
      // User declined registration
      return NextResponse.json({
        success: true,
        data: { registered: false },
        message: "You have declined to register for Mr. & Mrs. Fresher.",
      })
    }

    // Get or create user
    let user
    if (externalAppId) {
      user = await getUserByExternalAppId(externalAppId)
      if (!user) {
        user = await getOrCreateUserByExternalAppId(externalAppId)
      }
    } else {
      user = await getOrCreateUserByExternalAppId(
        `fresher_${rollNumber}_${Date.now()}`
      )
    }

    // Get student details
    const student = await findStudentByRollNumber(rollNumber)
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "STUDENT_NOT_FOUND",
          message: "Student not found. Please try again.",
        },
        { status: 404 }
      )
    }

    // Check for duplicate registration one more time
    const duplicateCheck = await checkDuplicateRegistration(rollNumber)
    if (duplicateCheck.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_REGISTRATION",
          message: `You have already registered. Your reference ID is ${duplicateCheck.registration.referenceId}.`,
        },
        { status: 409 }
      )
    }

    // Create registration entry in Registration table
    const existingRegistrations = await prisma.registration.findMany({
      select: { referenceId: true },
    })
    const collisions = existingRegistrations.map((r) => r.referenceId)
    const uniqueRefId = isReferenceIdUnique(collisions)
    const referenceId = uniqueRefId()

    const krmuEmail = `${rollNumber}@krmu.edu.in`
    const feeAmount = config.feeKrmu // Fresher registrations are always KRMU

    await prisma.registration.create({
      data: {
        referenceId,
        userId: user.id,
        externalAppId: externalAppId || user.externalAppId,
        name: student.name,
        email: krmuEmail,
        rollNumber,
        course: student.courseAndSemester,
        year: student.year,
        isKrmu: true,
        isFresher: true,
        feeAmount,
        feePaid: true, // Fresher competition is free, so mark as paid
        paymentDate: new Date(),
        qrCode: encryptQR(`${referenceId}:${rollNumber}:${referenceId}`),
      },
    })

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isKrmu: true },
    })

    // Send confirmation email
    await sendConfirmationEmail(krmuEmail, student.name, referenceId)

    return NextResponse.json({
      success: true,
      data: {
        registered: true,
        rollNumber,
        name: student.name,
        email: krmuEmail,
        referenceId,
      },
      message: `Congratulations! You have been registered for Mr. & Mrs. Fresher competition. A confirmation has been sent to ${krmuEmail}`,
    })
  } catch (error: any) {
    console.error("Confirmation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "An error occurred during registration confirmation.",
      },
      { status: 500 }
    )
  }
}
