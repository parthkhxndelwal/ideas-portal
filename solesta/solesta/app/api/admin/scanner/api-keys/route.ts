import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { generateScannerApiKey, deactivateScannerApiKey } from "@/lib/server/scanner-auth"
import { prisma } from "@/lib/server/prisma"
import { withCors } from "@/lib/server/cors"

export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    await requireAdminSession()

    // Get all API keys
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      keys: apiKeys,
    })
  })
}

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    await requireAdminSession()

    const body = await request.json()
    const { name, action } = body

    if (action === "generate") {
      if (!name) {
        return NextResponse.json(
          { error: "Name is required for new API key" },
          { status: 400 }
        )
      }

      const apiKey = await generateScannerApiKey(name)

      return NextResponse.json({
        success: true,
        message: "API key generated successfully",
        apiKey,
        name,
      })
    } else if (action === "deactivate") {
      const { keyId } = body

      if (!keyId) {
        return NextResponse.json(
          { error: "Key ID is required" },
          { status: 400 }
        )
      }

      // Get the key first
      const key = await prisma.apiKey.findUnique({
        where: { id: keyId },
      })

      if (!key) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        )
      }

      await deactivateScannerApiKey(key.key)

      return NextResponse.json({
        success: true,
        message: "API key deactivated successfully",
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  })
}
