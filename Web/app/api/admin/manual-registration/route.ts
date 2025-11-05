import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, hashPassword } from "@/lib/auth"
import { Database } from "@/lib/database"
import { sendManualRegistrationEmail } from "@/lib/email"
import { generateRegistrationPDF } from "@/lib/pdf-generator"
import { encrypt } from "@/lib/crypto"
import QRCode from "qrcode"

// Transaction ID prefix for manual registrations
const MANUAL_TRANSACTION_PREFIX = "MANUAL_"

class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message)
	}
}

interface RegisterInput {
	name?: string
	rollNumber?: string
	email?: string
	password?: string // Optional - will be auto-generated if not provided
	course?: string
	semester?: string
	courseAndSemester?: string
	transactionId?: string
	isFromUniversity?: boolean
	selectedSubEvent?: string
	paymentMethod?: string
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
			transactionId: body.transactionId,
			isFromUniversity: body.isFromUniversity,
			selectedSubEvent: body.selectedSubEvent,
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
	const { name, rollNumber, email, course, semester, isFromUniversity = true, selectedSubEvent, paymentMethod = "Paytm" } = input
	const courseAndSemester = input.courseAndSemester || [course, semester].filter(Boolean).join(" ").trim()

	// Validate required fields
	if (!email || !name) {
		return { success: false, error: "Name and email are required", status: 400 }
	}

	// Generate password if not provided: participant#emailBefore@
	let password = input.password
	if (!password) {
		const emailUsername = email.split('@')[0]
		password = `participant#${emailUsername}`
	}

	if (!password) {
		return { success: false, error: "Unable to generate password", status: 500 }
	}

	const plainPassword = password

	// Roll number is always required
	if (!rollNumber) {
		return { success: false, error: "Roll number is required", status: 400 }
	}

	// For KR Mangalam University students, validate roll number exists in database
	if (isFromUniversity) {
		const rollNumberData = await Database.findRollNumberData(rollNumber)
		if (!rollNumberData) {
			return { success: false, error: "Roll number not found in KR Mangalam University database. Please verify the roll number or uncheck 'From KR Mangalam University' if this is an external participant.", status: 400 }
		}
	}

	// Transaction ID is required and must be unique
	if (!input.transactionId) {
		return { success: false, error: "Transaction ID is required", status: 400 }
	}

	// Check if transaction ID already exists
	const existingTransaction = await Database.findUserByTransactionId(input.transactionId)
	if (existingTransaction) {
		return { success: false, error: "Transaction ID already exists. Please use a unique transaction ID.", status: 400 }
	}

	// For university students, course and semester are required
	if (isFromUniversity && !courseAndSemester) {
		return { success: false, error: "Course and semester are required for university students", status: 400 }
	}

	// Validate selected subevent - REQUIRED for all participants
	if (!selectedSubEvent) {
		return { success: false, error: "Subevent selection is required for all participants", status: 400 }
	}

	const activeSubEvents = await Database.getActiveSubEvents()
	const subEvent = activeSubEvents.find(se => se.id === selectedSubEvent)
	
	if (!subEvent) {
		return { success: false, error: "Selected subevent is not available", status: 400 }
	}

	// Check capacity
	if (subEvent.maxParticipants) {
		const participantCount = await Database.getSubEventParticipantCount(selectedSubEvent)
		if (participantCount >= subEvent.maxParticipants) {
			return { success: false, error: "Selected subevent has reached maximum capacity", status: 400 }
		}
	}

	const selectedSubEventData = selectedSubEvent
	const registrationStatus: "confirmed" = "confirmed"

	const existingUser = await Database.findUserByEmail(email)
	if (existingUser) {
		return { success: false, error: "User already exists", status: 400 }
	}

	const eventConfig = await Database.getEventConfig()
	const paymentAmount = Number(eventConfig?.paymentAmount ?? 0)

	const hashedPassword = await hashPassword(plainPassword)
	const transactionId = input.transactionId
	const paymentStatus = "completed" as const

	const userData = {
		email,
		password: hashedPassword,
		role: "participant" as const,
		isEmailVerified: true,
		isFromUniversity,
		rollNumber,
		name,
		courseAndSemester: courseAndSemester || undefined,
		year: input.course ? undefined : undefined, // Year can be extracted or left empty
		registrationStatus,
		paymentStatus,
		transactionId,
		selectedSubEvent: selectedSubEventData,
		needsPasswordChange: true, // Manually registered users need to set their password
	}

	const createdUser = await Database.createUser(userData)

	try {
		await Database.createTransaction({
			userId: createdUser._id!,
			amount: paymentAmount,
			status: "completed",
			transactionId,
			paymentMethod: paymentMethod.toLowerCase(),
			paymentCaptured: true,
		})
	} catch (transactionError) {
		console.error("Failed to record manual payment:", transactionError)
		return { success: false, error: "Payment record failed", status: 500 }
	}

	// QR code now uses only transaction ID (standardized format)
	const rawQrData = `participant_ideas3.0_${transactionId}`
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
			transactionId,
			paymentAmount,
			qrCodeBuffer,
			pdfBuffer,
			subeventName: subEvent.name,
			venue: subEvent.venue,
			paymentMethod,
			temporaryPassword: plainPassword,
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
	const requiredHeaders = ["name", "roll_number", "email", "transaction_id", "selected_sub_event"]

	const hasAllHeaders = requiredHeaders.every((header) => headers.includes(header))
	if (!hasAllHeaders) {
		throw new ApiError(400, "Invalid CSV header. Required: Name, Roll Number, Email, Transaction ID, Selected Sub Event. Please download the sample template.")
	}

	const results: Array<{ email: string; success?: boolean; error?: string }> = []

	for (let index = 1; index < lines.length; index++) {
		const values = lines[index].split(",")
		const row: Record<string, string> = {}

		headers.forEach((header, headerIndex) => {
			row[header] = (values[headerIndex] ?? "").trim()
		})

		const isFromUniversity = row["is_from_university"] ? row["is_from_university"].toLowerCase() === "true" : true
		
		// Password is optional in CSV - will be auto-generated if empty
		const registerResult = await registerParticipant({
			name: row["name"],
			rollNumber: row["roll_number"],
			email: row["email"],
			password: row["password"], // Optional - will be auto-generated if empty
			course: row["course"],
			semester: row["semester"],
			transactionId: row["transaction_id"],
			isFromUniversity,
			selectedSubEvent: row["selected_sub_event"],
			paymentMethod: row["payment_method"] || "Paytm", // Default to Paytm if not provided
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
