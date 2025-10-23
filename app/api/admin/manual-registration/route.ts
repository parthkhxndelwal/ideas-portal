import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, hashPassword } from "@/lib/auth"
import { Database } from "@/lib/database"
import { sendManualRegistrationEmail } from "@/lib/email"
import { generateRegistrationPDF } from "@/lib/pdf-generator"
import { encrypt } from "@/lib/crypto"
import QRCode from "qrcode"

const MANUAL_TRANSACTION_ID = "CASH_TRANSACT_1905"

class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message)
	}
}

interface RegisterInput {
	name?: string
	rollNumber?: string
	email?: string
	password?: string
	course?: string
	semester?: string
	courseAndSemester?: string
}

interface RegisterResult {
	success: boolean
	error?: string
	status?: number
	transactionId?: string
}

export async function POST(request: NextRequest) {
	try {
		await requireAdmin(request)

		if (request.nextUrl.searchParams.get("bulk") === "1") {
			return await handleBulkUpload(request)
		}

		const body = await request.json()
		const result = await registerParticipant({
			name: body.name,
			rollNumber: body.rollNumber,
			email: body.email,
			password: body.password,
			course: body.course,
			semester: body.semester,
			courseAndSemester: body.courseAndSemester,
		})

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
		}

		return NextResponse.json({ message: "Student registered and email sent", transactionId: result.transactionId })
	} catch (error) {
		if (error instanceof ApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status })
		}
		console.error("Manual registration error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

async function requireAdmin(request: NextRequest) {
	const authHeader = request.headers.get("authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new ApiError(401, "Unauthorized")
	}

	const token = authHeader.substring(7)
	const decoded = verifyJWT(token)
	if (!decoded) {
		throw new ApiError(401, "Invalid token")
	}

	const user = await Database.findUserById(decoded.userId)
	if (!user || user.role !== "admin") {
		throw new ApiError(403, "Access denied")
	}

	return user
}

async function registerParticipant(input: RegisterInput): Promise<RegisterResult> {
	const { name, rollNumber, email, password, course, semester } = input
	const courseAndSemester = input.courseAndSemester || [course, semester].filter(Boolean).join(" ").trim()

	if (!rollNumber || !email || !password || !name || !courseAndSemester) {
		return { success: false, error: "All fields are required", status: 400 }
	}

	const existingUser = await Database.findUserByEmail(email)
	if (existingUser) {
		return { success: false, error: "User already exists", status: 400 }
	}

	const eventConfig = await Database.getEventConfig()
	const paymentAmount = Number(eventConfig?.paymentAmount ?? 0)

	const hashedPassword = await hashPassword(password)
	const transactionId = MANUAL_TRANSACTION_ID
	const registrationStatus = "confirmed" as const
	const paymentStatus = "completed" as const

	const userData = {
		email,
		password: hashedPassword,
		role: "participant" as const,
		isEmailVerified: true,
		rollNumber,
		name,
		courseAndSemester,
		registrationStatus,
		paymentStatus,
		transactionId,
	}

	const createdUser = await Database.createUser(userData)

	try {
		await Database.createTransaction({
			userId: createdUser._id!,
			amount: paymentAmount,
			status: "completed",
			transactionId,
			paymentMethod: "cash",
			paymentCaptured: true,
		})
	} catch (transactionError) {
		console.error("Failed to record manual payment:", transactionError)
		return { success: false, error: "Payment record failed", status: 500 }
	}

	const rawQrData = `participant_ideas3.0_${rollNumber}_${transactionId}`
	const encryptedQrData = encrypt(rawQrData)
	const qrCodeBuffer = await QRCode.toBuffer(encryptedQrData, { type: "png", width: 300, margin: 2 })

	let pdfBuffer: Buffer | undefined
	try {
		pdfBuffer = await generateRegistrationPDF({
			...createdUser,
		})
	} catch (pdfError) {
		console.error("Failed to generate entry document PDF:", pdfError)
	}

	try {
		await sendManualRegistrationEmail({
			email,
			name,
			rollNumber,
			password,
			transactionId,
			paymentAmount,
			qrCodeBuffer,
			pdfBuffer,
		})
	} catch (emailError) {
		console.error("Failed to send manual registration email:", emailError)
		return { success: false, error: "User created but email sending failed", status: 500 }
	}

	return { success: true, transactionId }
}

async function handleBulkUpload(request: NextRequest) {
	const formData = await request.formData()
	const file = formData.get("file")

	if (!file || typeof file === "string") {
		throw new ApiError(400, "No file uploaded")
	}

	const text = await file.text()
	const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

	if (lines.length < 2) {
		throw new ApiError(400, "CSV must include a header and at least one data row")
	}

	const headers = lines[0].split(",").map((header) => normalizeKey(header))
	const requiredHeaders = ["name", "roll_number", "email", "password", "course", "semester"]

	const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header))
	if (!hasAllHeaders) {
		throw new ApiError(400, "Invalid CSV header. Please download the sample template.")
	}

	const results: Array<{ email: string; success?: boolean; error?: string }> = []

	for (let index = 1; index < lines.length; index++) {
		const values = lines[index].split(",")
		const row: Record<string, string> = {}

		headers.forEach((header, headerIndex) => {
			row[header] = (values[headerIndex] ?? "").trim()
		})

		const registerResult = await registerParticipant({
			name: row["name"],
			rollNumber: row["roll_number"],
			email: row["email"],
			password: row["password"],
			course: row["course"],
			semester: row["semester"],
		})

		if (registerResult.success) {
			results.push({ email: row["email"], success: true })
		} else {
			results.push({ email: row["email"], error: registerResult.error ?? "Failed" })
		}
	}

	const successCount = results.filter((result) => result.success).length
	const failedCount = results.length - successCount

	return NextResponse.json({
		message: `Bulk upload complete. Success: ${successCount}, Failed: ${failedCount}`,
		results,
	})
}

function normalizeKey(key: string) {
	return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
}
