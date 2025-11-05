import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { Database } from "@/lib/database"
import { migrateManualRegistrations } from "@/lib/migration"

export async function POST(request: NextRequest) {
	try {
		await requireAdmin(request)

		const result = await migrateManualRegistrations()

		if (result.success) {
			return NextResponse.json({
				message: `Migration completed successfully. ${result.migrated} users updated.`,
				migrated: result.migrated
			})
		} else {
			return NextResponse.json({ error: result.error }, { status: 500 })
		}
	} catch (error) {
		console.error("Migration error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

async function requireAdmin(request: NextRequest) {
	const authHeader = request.headers.get("authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Unauthorized")
	}

	const token = authHeader.substring(7)
	const decoded = verifyJWT(token)
	if (!decoded) {
		throw new Error("Invalid token")
	}

	const user = await Database.findUserById(decoded.userId)
	if (!user || user.role !== "admin") {
		throw new Error("Access denied")
	}

	return user
}