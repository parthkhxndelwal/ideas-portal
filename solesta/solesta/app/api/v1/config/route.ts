import { NextResponse } from "next/server"
import { config } from "@/lib/server/config"

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        enableExternalRegistration: config.enableExternalRegistration,
      },
    })
  } catch (error) {
    console.error("Error in config endpoint:", error)
    // Return default config on error
    return NextResponse.json({
      success: true,
      data: {
        enableExternalRegistration: true,
      },
    })
  }
}
