import { NextResponse } from "next/server"
import { config } from "@/lib/server/config"

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      enableExternalRegistration: config.enableExternalRegistration,
    },
  })
}
