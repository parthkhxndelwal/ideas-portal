import { NextRequest, NextResponse } from "next/server"
import { createAndSendOtp, verifyOtp } from "@/lib/server/otp"
import { prisma } from "@/lib/server/prisma"

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  try {
    const body = await request.json()

    if (path === "request") {
      // Request OTP for ticket verification
      const { email } = body

      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: "MISSING_EMAIL",
            message: "Email is required.",
          },
          { status: 400 }
        )
      }

      // Find user by registration email
      const registration = await prisma.registration.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { user: true },
      })

      if (!registration) {
        return NextResponse.json(
          {
            success: false,
            error: "NOT_FOUND",
            message: "No registration found with this email.",
          },
          { status: 400 }
        )
      }

      if (!registration.feePaid) {
        return NextResponse.json(
          {
            success: false,
            error: "PAYMENT_PENDING",
            message: "Payment not completed.",
          },
          { status: 400 }
        )
      }

      // Create and send OTP
      const result = await createAndSendOtp(
        registration.userId,
        email,
        registration.isKrmu
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "OTP_SEND_FAILED", message: result.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      })
    } else if (path === "verify") {
      // Verify OTP for ticket access
      const { email, otp } = body

      if (!email || !otp) {
        return NextResponse.json(
          {
            success: false,
            error: "MISSING_PARAMS",
            message: "Email and OTP are required.",
          },
          { status: 400 }
        )
      }

      // Find user by registration email
      const registration = await prisma.registration.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { user: true },
      })

      if (!registration) {
        return NextResponse.json(
          {
            success: false,
            error: "NOT_FOUND",
            message: "No registration found with this email.",
          },
          { status: 400 }
        )
      }

      // Verify OTP
      const result = await verifyOtp(registration.userId, otp)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: "OTP_VERIFICATION_FAILED",
            message: result.message,
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully. You can now view your ticket.",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PATH",
          message: "Invalid path parameter.",
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Ticket OTP error:", error)
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
