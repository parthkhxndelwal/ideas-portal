export interface User {
  _id?: string
  email: string
  password: string
  role: "participant" | "admin"
  isEmailVerified: boolean
  rollNumber?: string
  name?: string
  courseAndSemester?: string
  year?: string
  registrationStatus: "pending" | "details_confirmed" | "confirmed"
  transactionId?: string
  paymentStatus: "pending" | "completed"
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
  updatedAt: Date
  updatedBy: string
}
