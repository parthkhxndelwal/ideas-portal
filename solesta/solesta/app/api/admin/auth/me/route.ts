import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/server/admin-auth"
import { prisma } from "@/lib/server/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, admin })
  } catch (error) {
    console.error("Get admin error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
