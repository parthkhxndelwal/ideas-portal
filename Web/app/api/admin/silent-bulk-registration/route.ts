import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, hashPassword } from "@/lib/auth"
import { Database } from "@/lib/database"
import { encrypt } from "@/lib/crypto"

class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message)
	}
}

interface StudentObject {
	transaction: {
		id: string // Transaction ID should always be a string
		amount: number
		time: string
		currency: string
		payment: {
			mode: string
			bankName: string
			gateway: string
		}
	}
	personalDetails: {
		name: string
		fatherMotherName: string
		contactNumber: number | string
		emailID: string
		rollNoEnrollmentNo: string | number // Can come as string or number
		activityParticipationDate: string
	}
	event: {
		name: string
		activityParticipationDate: string
	}
	mailStatus: {
		sent: boolean
		timestamp: string
		senderEmail: string
		receiverEmail: string
	}
}

interface RegisterResult {
	success: boolean
	error?: string
	email: string
	rollNumber: string
}

export async function POST(request: NextRequest) {
	try {
		await requireAdmin(request)

		const body = await request.json()
		const students: StudentObject[] = body.students

		if (!Array.isArray(students) || students.length === 0) {
			throw new ApiError(400, "Invalid input: students array is required")
		}

		// Ensure all transaction IDs are strings (in case JSON parsing converted them)
		students.forEach((student, index) => {
			if (student.transaction && student.transaction.id !== undefined) {
				student.transaction.id = String(student.transaction.id)
			}
		})

		console.log(`\n=== Silent Bulk Registration Started ===`)
		console.log(`Total students to process: ${students.length}`)
		console.log(`Sample transaction IDs from input:`)
		students.slice(0, 3).forEach((s, i) => {
			console.log(`  [${i}] Transaction ID: "${s.transaction?.id}" (type: ${typeof s.transaction?.id})`)
		})
		console.log(`=====================================\n`)

		const results: RegisterResult[] = []

		for (const student of students) {
			const result = await registerStudentSilently(student)
			results.push(result)
		}

		const successCount = results.filter((r) => r.success).length
		const failedCount = results.length - successCount

		console.log(`\n=== Silent Bulk Registration Complete ===`)
		console.log(`Total: ${results.length}, Success: ${successCount}, Failed: ${failedCount}`)
		if (failedCount > 0) {
			console.log(`Failed registrations:`)
			results.filter(r => !r.success).forEach(r => {
				console.log(`  - ${r.email} (${r.rollNumber}): ${r.error}`)
			})
		}
		console.log(`=========================================\n`)

		return NextResponse.json({
			message: `Silent bulk registration complete. Success: ${successCount}, Failed: ${failedCount}`,
			results,
		})
	} catch (error) {
		if (error instanceof ApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status })
		}
		console.error("Silent bulk registration error:", error)
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

async function registerStudentSilently(student: StudentObject): Promise<RegisterResult> {
	const { transaction, personalDetails, event } = student

	const email = String(personalDetails.emailID || "").trim()
	const name = String(personalDetails.name || "").trim()
	const rollNumber = String(personalDetails.rollNoEnrollmentNo || "").trim()
	// Ensure transaction ID is always treated as a string, never converted to number
	const transactionId = String(transaction.id || "").trim()
	const paymentAmount = transaction.amount
	const paymentMethod = transaction.payment.gateway || "Paytm"
	const contactNumber = String(personalDetails.contactNumber)
	const fatherMotherName = String(personalDetails.fatherMotherName || "").trim()
	const activityParticipationDate = personalDetails.activityParticipationDate
	const eventName = event.name

	console.log(`Processing student: ${email} with transaction ID: "${transactionId}" (type: ${typeof transactionId}, length: ${transactionId.length})`)

	// Validate required fields
	if (!email || !name || !rollNumber || !transactionId) {
		return {
			success: false,
			error: "Missing required fields: name, email, roll number, or transaction ID",
			email,
			rollNumber,
		}
	}

	// Generate default password
	const emailUsername = email.split("@")[0]
	const password = `participant#${emailUsername}`

	// Check if user already exists
	const existingUser = await Database.findUserByEmail(email)
	if (existingUser) {
		console.log(`Skipping ${email}: User already exists`)
		return {
			success: false,
			error: "User already exists",
			email,
			rollNumber,
		}
	}

	// Check if transaction ID already exists
	const existingTransaction = await Database.findUserByTransactionId(transactionId)
	if (existingTransaction) {
		console.log(`Skipping ${email}: Transaction ID "${transactionId}" already exists for user ${existingTransaction.email}`)
		return {
			success: false,
			error: `Transaction ID already exists (used by ${existingTransaction.email})`,
			email,
			rollNumber,
		}
	}

	// Determine if from university (KRMU prefix check)
	const isFromUniversity = rollNumber.toLowerCase().startsWith("krmu")

	// Find or use the first active subevent that matches the event name
	const activeSubEvents = await Database.getActiveSubEvents()
	let selectedSubEvent = activeSubEvents.find((se) => se.name === eventName)

	// If no exact match, use the first active subevent
	if (!selectedSubEvent && activeSubEvents.length > 0) {
		selectedSubEvent = activeSubEvents[0]
	}

	if (!selectedSubEvent) {
		return {
			success: false,
			error: "No active subevents available",
			email,
			rollNumber,
		}
	}

	// Check capacity
	if (selectedSubEvent.maxParticipants) {
		const participantCount = await Database.getSubEventParticipantCount(selectedSubEvent.id)
		if (participantCount >= selectedSubEvent.maxParticipants) {
			return {
				success: false,
				error: `Selected subevent "${selectedSubEvent.name}" has reached maximum capacity`,
				email,
				rollNumber,
			}
		}
	}

	try {
		const hashedPassword = await hashPassword(password)

		const userData = {
			email,
			password: hashedPassword,
			role: "participant" as const,
			isEmailVerified: true,
			isFromUniversity,
			rollNumber,
			name,
			courseAndSemester: undefined, // Can be extracted if needed
			year: undefined,
			registrationStatus: "confirmed" as const,
			paymentStatus: "completed" as const,
			transactionId,
			selectedSubEvent: selectedSubEvent.id,
			needsPasswordChange: true,
			// Additional fields from student object
			fatherMotherName,
			contactNumber,
			activityParticipationDate,
		}

		const createdUser = await Database.createUser(userData)

		// Create transaction record
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
			console.error("Failed to record payment for", email, ":", transactionError)
			return {
				success: false,
				error: "Payment record failed",
				email,
				rollNumber,
			}
		}

		console.log(`Silent registration successful for ${email} (${rollNumber})`)

		return {
			success: true,
			email,
			rollNumber,
		}
	} catch (error) {
		console.error("Failed to register student silently:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			email,
			rollNumber,
		}
	}
}
