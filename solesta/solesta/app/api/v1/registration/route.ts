import { NextRequest, NextResponse } from "next/server"
import { config } from "@/lib/server/config"
import {
  getOrCreateUserByExternalAppId,
  getUserByExternalAppId,
  updateUserState,
  updateStateData,
  isEmailVerifiedRecently,
  requireEmailVerification,
  markEmailAsVerified,
  UserState,
} from "@/lib/server/stateMachine"
import { createAndSendOtp, verifyOtp } from "@/lib/server/otp"
import { findStudentByRollNumber } from "@/lib/server/studentData"
import {
  createRegistration,
  getRegistrationByExternalAppId,
  getRegistrationByReferenceId,
  checkDuplicateRegistration,
} from "@/lib/server/registration"
import { sendConfirmationEmail } from "@/lib/server/email"

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  try {
    const body = await request.json()

    if (path === "start") {
      return handleStart(body)
    } else if (path === "roll-number") {
      return handleRollNumber(body)
    } else if (path === "email") {
      return handleEmailInput(body)
    } else if (path === "otp-request") {
      return handleOtpRequest(body)
    } else if (path === "otp-verify") {
      return handleOtpVerify(body)
    } else if (path === "details") {
      return handleDetails(body)
    } else if (path === "fresher") {
      return handleFresher(body)
    } else if (path === "confirm-details") {
      return handleConfirmDetails(body)
    } else if (path === "confirm-payment") {
      return handleConfirmPayment(body)
    }

    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "Endpoint not found." },
      { status: 404 }
    )
  } catch (error: any) {
    console.error("Registration API error:", error)
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const externalAppId = searchParams.get("externalAppId")
  const referenceId = searchParams.get("referenceId")

  if (referenceId) {
    return handleSearchByReference(referenceId)
  }

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId query parameter is required.",
      },
      { status: 400 }
    )
  }

  try {
    const user = await getUserByExternalAppId(externalAppId)
    if (!user) {
      return NextResponse.json({
        success: true,
        data: { exists: false },
        message: "No user found.",
      })
    }

    const registration = await getRegistrationByExternalAppId(externalAppId)

    const userData = user.stateData as any
    const responseData: any = {
      state: user.state,
      isVerified: user.isVerified,
      isKrmu: user.isKrmu,
    }

    if (user.state === "DISPLAY_FEE" && userData) {
      responseData.userDetails = {
        name: userData.name || "",
        email: userData.email || "",
        rollNumber: userData.rollNumber || "",
        course: userData.course || "",
        year: userData.year || "",
      }
    }

    if (registration) {
      responseData.registration = {
        referenceId: registration.referenceId,
        name: registration.name,
        email: registration.email,
        isKrmu: registration.isKrmu,
        rollNumber: registration.rollNumber,
        course: registration.course,
        year: registration.year,
        isFresher: registration.isFresher,
        feeAmount: registration.feeAmount,
        feePaid: registration.feePaid,
        hasQrCode: !!registration.qrCode,
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Status retrieved.",
    })
  } catch (error: any) {
    console.error("Status error:", error)
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

async function handleStart(body: any) {
  const { externalAppId, institution } = body

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId is required.",
      },
      { status: 400 }
    )
  }

  if (!institution || !["krmu", "external"].includes(institution)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PARAM",
        message: 'institution must be "krmu" or "external".',
      },
      { status: 400 }
    )
  }

  // Check if external registration is enabled
  if (institution === "external" && !config.enableExternalRegistration) {
    return NextResponse.json(
      {
        success: false,
        error: "DISABLED",
        message: "External registration is currently disabled.",
      },
      { status: 403 }
    )
  }

  const user = await getOrCreateUserByExternalAppId(externalAppId)

  await updateUserState({ externalAppId }, UserState.SELECT_INSTITUTION)
  await updateStateData(
    { externalAppId },
    { institution: institution as "krmu" | "external" }
  )

  return NextResponse.json({
    success: true,
    data: { state: UserState.ENTER_ROLL_NUMBER },
    message: `You selected ${institution === "krmu" ? "KRMU Student" : "External Student"} path.`,
  })
}

async function handleRollNumber(body: any) {
  const { externalAppId, rollNumber, deviceToken } = body

  if (!externalAppId || !rollNumber) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId and rollNumber are required.",
      },
      { status: 400 }
    )
  }

  if (!/^\d{10}$/.test(rollNumber)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_FORMAT",
        message: "Roll number must be 10 digits.",
      },
      { status: 400 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const student = await findStudentByRollNumber(rollNumber)
  if (!student) {
    return NextResponse.json(
      {
        success: false,
        error: "STUDENT_NOT_FOUND",
        message: "Roll number not found in database.",
      },
      { status: 400 }
    )
  }

  // Check for duplicate registration
  const duplicateCheck = await checkDuplicateRegistration(rollNumber)
  if (duplicateCheck.exists) {
    return NextResponse.json(
      {
        success: false,
        error: "DUPLICATE_REGISTRATION",
        message: `You have already registered with this roll number. Your reference ID is ${duplicateCheck.registration.referenceId}. Use "Check Status" to view your registration.`,
      },
      { status: 400 }
    )
  }

  await updateStateData(
    { externalAppId },
    {
      rollNumber,
      email: student.email || `${rollNumber}@krmu.edu.in`,
      name: student.name,
      course: student.courseAndSemester,
      year: student.year,
    }
  )

  const alreadyVerified = await isEmailVerifiedRecently(
    externalAppId,
    deviceToken,
    48
  )
  if (alreadyVerified.valid) {
    return handleOtpVerifyAfterSkip(
      externalAppId,
      user,
      {
        ...user.stateData,
        institution: "krmu",
        email: student.email || `${rollNumber}@krmu.edu.in`,
        name: student.name,
        course: student.courseAndSemester,
        year: student.year,
      },
      deviceToken
    )
  }

  await updateUserState({ externalAppId }, UserState.OTP_VERIFICATION)

  return NextResponse.json({
    success: true,
    data: {
      state: UserState.OTP_VERIFICATION,
      email: student.email || `${rollNumber}@krmu.edu.in`,
    },
    message: "Enter the OTP sent to your KRMU email.",
  })
}

async function handleEmailInput(body: any) {
  const { externalAppId, email } = body

  if (!externalAppId || !email) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId and email are required.",
      },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_FORMAT",
        message: "Invalid email format.",
      },
      { status: 400 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  // Check for duplicate registration by email (only if not already registered by this user)
  const existingRegistration =
    await getRegistrationByExternalAppId(externalAppId)
  if (!existingRegistration) {
    // Only check for duplicates if user doesn't already have a registration
    const duplicateCheck = await checkDuplicateRegistration(undefined, email)
    if (duplicateCheck.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_REGISTRATION",
          message: `You have already registered with this email. Your reference ID is ${duplicateCheck.registration.referenceId}. Use "Check Status" to view your registration.`,
        },
        { status: 400 }
      )
    }
  }

  await updateStateData({ externalAppId }, { email })
  await updateUserState({ externalAppId }, UserState.OTP_VERIFICATION)

  return NextResponse.json({
    success: true,
    data: { state: UserState.OTP_VERIFICATION },
    message: "Enter the OTP sent to your email.",
  })
}

async function handleOtpRequest(body: any) {
  const { externalAppId, deviceToken } = body

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId is required.",
      },
      { status: 400 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const stateData = user.stateData as any
  const email = stateData?.email
  const isKrmu = stateData?.institution === "krmu"

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: "NO_EMAIL",
        message: "No email found. Please complete previous step.",
      },
      { status: 400 }
    )
  }

  // Check if email was verified recently (within 48 hours) on same device
  // But only skip OTP if the email is the same as the one that was previously verified
  const alreadyVerified = await isEmailVerifiedRecently(
    externalAppId,
    deviceToken,
    48
  )
  if (alreadyVerified.valid && alreadyVerified.email === email) {
    // Skip OTP only if same email was verified before
    return handleOtpVerifyAfterSkip(externalAppId, user, stateData, deviceToken)
  }

  const result = await createAndSendOtp(user.id, email, isKrmu)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "OTP_FAILED", message: result.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { otpSent: true },
    message: result.message,
  })
}

async function handleOtpVerify(body: any) {
  const { externalAppId, otp, deviceToken } = body

  if (!externalAppId || !otp) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId and otp are required.",
      },
      { status: 400 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const result = await verifyOtp(user.id, otp)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "INVALID_OTP", message: result.message },
      { status: 400 }
    )
  }

  // Mark email as verified for 48 hours on this device
  await markEmailAsVerified(externalAppId, deviceToken)

  const stateData = user.stateData as any
  const isKrmu = stateData?.institution === "krmu"

  if (isKrmu) {
    // Check both string '1' and number 1 for first year
    const isFirstYear = stateData?.year === "1" || stateData?.year === 1
    if (isFirstYear) {
      await updateUserState({ externalAppId }, UserState.FRESHER_SELECTION)
      return NextResponse.json({
        success: true,
        data: { state: UserState.FRESHER_SELECTION },
        message: result.message,
      })
    }

    // If KRMU student with data from roll number lookup, show details for confirmation
    if (stateData.name && stateData.course) {
      await updateUserState({ externalAppId }, UserState.DISPLAY_FEE)
      return NextResponse.json({
        success: true,
        data: {
          state: UserState.DISPLAY_FEE,
          name: stateData.name,
          email: stateData.email,
          rollNumber: stateData.rollNumber,
          course: stateData.course,
          year: stateData.year,
          feeAmount: config.feeKrmu,
        },
        message: "Please confirm your details.",
      })
    }
  } else {
    await updateUserState({ externalAppId }, UserState.ENTER_NAME)
    return NextResponse.json({
      success: true,
      data: { state: UserState.ENTER_NAME },
      message: "Enter your full name.",
    })
  }

  await updateUserState({ externalAppId }, UserState.MANUAL_DETAILS)
  return NextResponse.json({
    success: true,
    data: { state: UserState.MANUAL_DETAILS },
    message: result.message,
  })
}

async function handleDetails(body: any) {
  const { externalAppId, name, course, year, college, deviceToken } = body

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId is required.",
      },
      { status: 400 }
    )
  }

  // Server-side verification check - cannot be bypassed by client
  const verificationCheck = await requireEmailVerification(
    externalAppId,
    deviceToken,
    48
  )
  if (!verificationCheck.valid) {
    return NextResponse.json(
      {
        success: false,
        error: "EMAIL_NOT_VERIFIED",
        message: verificationCheck.message,
      },
      { status: 401 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const stateData = user.stateData as any
  if (!stateData.email) {
    return NextResponse.json(
      {
        success: false,
        error: "NO_EMAIL",
        message: "Please provide email first.",
      },
      { status: 400 }
    )
  }

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_NAME",
        message: "Name must be at least 2 characters.",
      },
      { status: 400 }
    )
  }
  if (!course || course.trim().length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_COURSE",
        message: "Course must be at least 2 characters.",
      },
      { status: 400 }
    )
  }
  if (!year || !["1", "2", "3", "4", "5"].includes(year)) {
    return NextResponse.json(
      { success: false, error: "INVALID_YEAR", message: "Year must be 1-5." },
      { status: 400 }
    )
  }

  // Check for duplicate registration by email
  const duplicateCheck = await checkDuplicateRegistration(
    undefined,
    stateData.email
  )
  if (duplicateCheck.exists) {
    return NextResponse.json(
      {
        success: false,
        error: "DUPLICATE_REGISTRATION",
        message: `You have already registered with this email. Your reference ID is ${duplicateCheck.registration.referenceId}. Use "Check Status" to view your registration.`,
      },
      { status: 400 }
    )
  }

  await updateStateData({ externalAppId }, { name, course, year, college })

  // Only show fresher selection for KRMU 1st year students with roll number data
  const isKrmu = stateData?.institution === "krmu"
  const isFirstYear = year === "1"
  const hasRollNumber = stateData?.rollNumber

  if (isKrmu && isFirstYear && hasRollNumber) {
    await updateUserState({ externalAppId }, UserState.FRESHER_SELECTION)
    return NextResponse.json({
      success: true,
      data: { state: UserState.FRESHER_SELECTION },
      message: "Would you like to participate in Mr. & Mrs. Fresher?",
    })
  }

  const isFresher = false

  const referenceId = await createRegistration({
    externalAppId,
    name: name.trim(),
    email: stateData.email,
    course: course.trim(),
    year,
    college: college?.trim(),
    isKrmu,
    isFresher,
  })

  const paymentLink = isKrmu
    ? config.paymentLinkInternal
    : config.paymentLinkExternal
  await updateUserState({ externalAppId }, UserState.REFERENCE_ID)
  await updateStateData({ externalAppId }, { referenceId, isFresher })

  await sendConfirmationEmail(stateData.email, stateData.name, referenceId)

  return NextResponse.json({
    success: true,
    data: { referenceId, paymentLink, state: UserState.REFERENCE_ID },
    message: `Registration created! Your reference ID is ${referenceId}`,
  })
}

async function handleFresher(body: any) {
  const { externalAppId, isFresher, deviceToken } = body

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId is required.",
      },
      { status: 400 }
    )
  }

  if (typeof isFresher !== "boolean") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PARAM",
        message: "isFresher must be true or false.",
      },
      { status: 400 }
    )
  }

  // Server-side verification check - cannot be bypassed by client
  const verificationCheck = await requireEmailVerification(
    externalAppId,
    deviceToken,
    48
  )
  if (!verificationCheck.valid) {
    return NextResponse.json(
      {
        success: false,
        error: "EMAIL_NOT_VERIFIED",
        message: verificationCheck.message,
      },
      { status: 401 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const stateData = user.stateData as any
  if (
    !stateData.name ||
    !stateData.course ||
    !stateData.year ||
    !stateData.email
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "INCOMPLETE_DATA",
        message: "Registration data incomplete. Please start again.",
      },
      { status: 400 }
    )
  }

  // Check for duplicate registration by roll number (KRMU) or email
  const duplicateCheck = await checkDuplicateRegistration(
    stateData.rollNumber,
    stateData.email
  )
  if (duplicateCheck.exists) {
    return NextResponse.json(
      {
        success: false,
        error: "DUPLICATE_REGISTRATION",
        message: `You have already registered. Your reference ID is ${duplicateCheck.registration.referenceId}. Use "Check Status" to view your registration.`,
      },
      { status: 400 }
    )
  }

  const { name, course, year, college, institution, rollNumber, email } =
    stateData
  const isKrmu = institution === "krmu"

  const referenceId = await createRegistration({
    externalAppId,
    name: name?.trim(),
    email: email || `${rollNumber}@krmu.edu.in`,
    rollNumber,
    course: course?.trim(),
    year,
    college: college?.trim(),
    isKrmu,
    isFresher,
  })

  const paymentLink = isKrmu
    ? config.paymentLinkInternal
    : config.paymentLinkExternal
  await updateUserState({ externalAppId }, UserState.REFERENCE_ID)
  await updateStateData({ externalAppId }, { referenceId, isFresher })

  const regEmail = email || `${rollNumber}@krmu.edu.in`
  await sendConfirmationEmail(regEmail, name?.trim(), referenceId)

  return NextResponse.json({
    success: true,
    data: {
      referenceId,
      paymentLink,
      isFresher,
      state: UserState.REFERENCE_ID,
    },
    message: `Registration created! Your reference ID is ${referenceId}`,
  })
}

async function handleConfirmDetails(body: any) {
  const { externalAppId, deviceToken } = body

  if (!externalAppId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "externalAppId is required.",
      },
      { status: 400 }
    )
  }

  // Server-side verification check - cannot be bypassed by client
  const verificationCheck = await requireEmailVerification(
    externalAppId,
    deviceToken,
    48
  )
  if (!verificationCheck.valid) {
    return NextResponse.json(
      {
        success: false,
        error: "EMAIL_NOT_VERIFIED",
        message: verificationCheck.message,
      },
      { status: 401 }
    )
  }

  const user = await getUserByExternalAppId(externalAppId)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: "Please start with /start.",
      },
      { status: 400 }
    )
  }

  const stateData = user.stateData as any
  if (
    !stateData.name ||
    !stateData.course ||
    !stateData.year ||
    !stateData.email
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "INCOMPLETE_DATA",
        message: "Registration data incomplete. Please start again.",
      },
      { status: 400 }
    )
  }

  // Check for duplicate registration by roll number (KRMU) or email
  const duplicateCheck = await checkDuplicateRegistration(
    stateData.rollNumber,
    stateData.email
  )
  if (duplicateCheck.exists) {
    return NextResponse.json(
      {
        success: false,
        error: "DUPLICATE_REGISTRATION",
        message: `You have already registered. Your reference ID is ${duplicateCheck.registration.referenceId}. Use "Check Status" to view your registration.`,
      },
      { status: 400 }
    )
  }

  const isKrmu = stateData.institution === "krmu"
  const isFresher = stateData.year === "1" || stateData.year === 1

  const referenceId = await createRegistration({
    externalAppId,
    name: stateData.name,
    email: stateData.email,
    rollNumber: stateData.rollNumber,
    course: stateData.course,
    year: String(stateData.year),
    isKrmu,
    isFresher,
  })

  const paymentLink = isKrmu
    ? config.paymentLinkInternal
    : config.paymentLinkExternal
  await updateUserState({ externalAppId }, UserState.REFERENCE_ID)
  await updateStateData({ externalAppId }, { referenceId, isFresher })

  return NextResponse.json({
    success: true,
    data: {
      referenceId,
      paymentLink,
      isFresher,
      state: UserState.REFERENCE_ID,
    },
    message: `Registration created! Your reference ID is ${referenceId}`,
  })
}

async function handleSearchByReference(
  referenceId: string
): Promise<NextResponse> {
  try {
    const registration = await getRegistrationByReferenceId(referenceId)

    if (!registration) {
      return NextResponse.json({
        success: true,
        data: { exists: false },
        message: "No registration found.",
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        state: "COMPLETED",
        isVerified: true,
        isKrmu: registration.isKrmu,
        registration: {
          referenceId: registration.referenceId,
          name: registration.name,
          email: registration.email,
          isKrmu: registration.isKrmu,
          rollNumber: registration.rollNumber,
          course: registration.course,
          year: registration.year,
          isFresher: registration.isFresher,
          feeAmount: registration.feeAmount,
          feePaid: registration.feePaid,
          hasQrCode: !!registration.qrCode,
        },
      },
      message: "Registration found.",
    })
  } catch (error) {
    console.error("Search error:", error)
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

async function handleConfirmPayment(body: any) {
  const { referenceId } = body

  if (!referenceId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PARAM",
        message: "referenceId is required.",
      },
      { status: 400 }
    )
  }

  const registration = await getRegistrationByReferenceId(referenceId)
  if (!registration) {
    return NextResponse.json(
      {
        success: false,
        error: "NOT_FOUND",
        message: "Registration not found.",
      },
      { status: 400 }
    )
  }

  await updateUserState(
    { externalAppId: registration.externalAppId },
    UserState.PAYMENT_CONFIRMED
  )

  return NextResponse.json({
    success: true,
    data: { confirmed: true },
    message:
      "Payment confirmed. You will receive your ticket once verified by admin.",
  })
}

async function handleOtpVerifyAfterSkip(
  externalAppId: string,
  user: any,
  stateData: any,
  deviceToken: string
): Promise<NextResponse> {
  // Mark email as verified for this device
  await markEmailAsVerified(externalAppId, deviceToken)

  const isKrmu = stateData?.institution === "krmu"

  if (isKrmu) {
    const isFirstYear = stateData?.year === "1" || stateData?.year === 1
    if (isFirstYear) {
      await updateUserState({ externalAppId }, UserState.FRESHER_SELECTION)
      return NextResponse.json({
        success: true,
        data: { state: UserState.FRESHER_SELECTION, alreadyVerified: true },
        message:
          "Email verified within 48 hours. Would you like to participate in Mr. & Mrs. Fresher?",
      })
    }

    if (stateData.name && stateData.course) {
      await updateUserState({ externalAppId }, UserState.DISPLAY_FEE)
      return NextResponse.json({
        success: true,
        data: {
          state: UserState.DISPLAY_FEE,
          name: stateData.name,
          email: stateData.email,
          rollNumber: stateData.rollNumber,
          course: stateData.course,
          year: stateData.year,
          feeAmount: config.feeKrmu,
          alreadyVerified: true,
        },
        message: "Please confirm your details.",
      })
    }
  } else {
    await updateUserState({ externalAppId }, UserState.ENTER_NAME)
    return NextResponse.json({
      success: true,
      data: { state: UserState.ENTER_NAME, alreadyVerified: true },
      message: "Enter your full name.",
    })
  }

  await updateUserState({ externalAppId }, UserState.MANUAL_DETAILS)
  return NextResponse.json({
    success: true,
    data: { state: UserState.MANUAL_DETAILS, alreadyVerified: true },
    message: "Enter your details.",
  })
}
