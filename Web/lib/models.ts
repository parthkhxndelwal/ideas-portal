export interface User {
  _id?: string
  email: string
  password: string
  role: "participant" | "admin"
  isEmailVerified: boolean
  isFromUniversity?: boolean // Whether user is from KR Mangalam University
  rollNumber?: string
  name?: string
  courseAndSemester?: string
  year?: string
  selectedSubEvent?: string // ID of selected subevent (mandatory for payment)
  registrationStatus: "pending" | "details_confirmed" | "subevent_selected" | "confirmed"
  transactionId?: string // Transaction ID is now the primary identifier for QR codes
  paymentStatus: "pending" | "completed"
  needsPasswordChange?: boolean // Whether user needs to set a password (for manual registrations)
  // Additional fields for silent bulk registration
  fatherMotherName?: string
  contactNumber?: string
  activityParticipationDate?: string
  createdAt: Date
  updatedAt: Date
}

export interface RollNumberData {
  _id?: string
  name: string
  rollnumber: string
  courseAndSemester: string
  year: string
}

export interface BlacklistedRollNumber {
  _id?: string
  rollNumber: string
  name: string
  courseAndSemester: string
  year: string
  blacklistedAt: Date
}

export interface EmailVerification {
  _id?: string
  email: string
  otp: string
  expiresAt: Date
  createdAt: Date
}

export interface PasswordReset {
  _id?: string
  email: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface Transaction {
  _id?: string
  userId: string
  amount: number
  status: "pending" | "completed" | "failed"
  transactionId: string // Our internal transaction ID
  razorpayOrderId?: string // Razorpay order_id
  razorpayPaymentId?: string // Razorpay payment_id
  razorpaySignature?: string // Signature for verification
  paymentMethod?: string // card, netbanking, upi, etc.
  paymentCaptured?: boolean // Whether payment was captured
  errorCode?: string // Error code if payment failed
  errorDescription?: string // Error description if payment failed
  createdAt: Date
  updatedAt?: Date
}

export interface EventConfig {
  _id?: string
  paymentAmount: number
  subEvents: SubEvent[]
  updatedAt: Date
  updatedBy: string
}

export interface SubEvent {
  _id?: string
  id: string // Unique identifier for the subevent
  name: string
  description: string
  venue: string
  maxParticipants?: number // Optional capacity limit
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  participantCount?: number // Current number of participants (added dynamically)
}

export interface EntryRecord {
  _id?: string
  transactionId: string // Primary identifier (was optional, now required)
  rollNumber?: string // Now optional for backward compatibility
  name: string
  qrType: "participant" | "volunteer"
  entryDate: Date // Date only (without time) to track daily entries
  entryTimestamp: Date // Full timestamp of entry
  scannedBy: string // Admin who scanned the QR
  createdAt: Date
}

export interface ScannerDevice {
  _id?: string
  deviceId: string
  name: string
  location: string
  appVersion: string
  token: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ScanRecord {
  _id?: string
  scanId: string // Unique identifier from client for idempotency
  deviceId: string
  transactionId: string // Primary identifier (was optional, now required)
  rollNumber?: string // Now optional for backward compatibility
  name: string
  qrType: "participant" | "volunteer"
  entryDate: Date
  entryTimestamp: Date
  scannedBy: string
  status: "accepted" | "conflict" | "rejected"
  reason?: string
  appliedAt?: Date
  createdAt: Date
  updatedAt: Date
}
