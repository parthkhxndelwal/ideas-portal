# Quick Reference: Registration System Components

## 1. KEY FILES LOCATION

### Main Modal Component
- **D:\ideas-portal\solesta\solesta\components\RegistrationDialog.tsx** - Main registration modal orchestrator

### Registration Step Components (All in registration/ directory)
- D:\ideas-portal\solesta\solesta\components\registration\WelcomeStep.tsx
- D:\ideas-portal\solesta\solesta\components\registration\InstitutionSelector.tsx
- D:\ideas-portal\solesta\solesta\components\registration\RollNumberInput.tsx (KRMU)
- D:\ideas-portal\solesta\solesta\components\registration\RollNumberConfirm.tsx (KRMU)
- D:\ideas-portal\solesta\solesta\components\registration\NewStudentDetailsForm.tsx (KRMU new)
- D:\ideas-portal\solesta\solesta\components\registration\EmailInput.tsx (External)
- D:\ideas-portal\solesta\solesta\components\registration\OtpInput.tsx (Both)
- D:\ideas-portal\solesta\solesta\components\registration\DetailsInput.tsx (External)
- D:\ideas-portal\solesta\solesta\components\registration\DisplayFeeStep.tsx (Both)
- D:\ideas-portal\solesta\solesta\components\registration\FresherSelector.tsx (KRMU year 1)
- D:\ideas-portal\solesta\solesta\components\registration\ReferenceIdStep.tsx (Both)
- D:\ideas-portal\solesta\solesta\components\registration\PaymentStep.tsx (Both)
- D:\ideas-portal\solesta\solesta\components\registration\CompletedStep.tsx
- D:\ideas-portal\solesta\solesta\components\registration\TicketStep.tsx

### State Management Hook
- **D:\ideas-portal\solesta\solesta\hooks\useRegistration.tsx** - Central React context hook for registration state

### Backend Services (lib/server/)
- **D:\ideas-portal\solesta\solesta\lib\server\registration.ts** - Database operations (create, fetch, update)
- **D:\ideas-portal\solesta\solesta\lib\server\stateMachine.ts** - User state machine and state data management
- **D:\ideas-portal\solesta\solesta\lib\server\studentData.ts** - Student database queries
- **D:\ideas-portal\solesta\solesta\lib\server\otp.ts** - OTP generation and verification
- **D:\ideas-portal\solesta\solesta\lib\server\email.ts** - Email sending
- **D:\ideas-portal\solesta\solesta\lib\server\config.ts** - Configuration (fees, payment links, etc.)

### API Endpoints
- **D:\ideas-portal\solesta\solesta\app\api\v1\registration\route.ts** - Main registration endpoint (ALL paths)
- **D:\ideas-portal\solesta\solesta\app\api\v1\fresher-registration\route.ts** - Fresher competition only

### Frontend API Client
- **D:\ideas-portal\solesta\solesta\lib\api.ts** - Frontend API client functions

### Database Schema
- **D:\ideas-portal\solesta\solesta\prisma\schema.prisma** - Prisma schema with Registration, User, Student models

### Other Registration Modal (Web)
- **D:\ideas-portal\Web\components\confirm-details-modal.tsx** - Separate modal for roll number confirmation (older?)

---

## 2. REGISTRATION DATA STRUCTURE

### Key Fields Required for Registration Creation

```typescript
{
  // Identifiers
  externalAppId: string,        // For web users, generated per session
  
  // Personal Info
  name: string,
  email: string,
  
  // KRMU Only
  rollNumber?: string,          // 10-digit KRMU roll
  
  // External Only
  college?: string,             // College/University name
  
  // Both
  course: string,               // e.g., "B.A. LL.B"
  year: string,                 // "1", "2", "3", "4", "5"
  
  // Flags
  isKrmu: boolean,              // true for KRMU, false for external
  isFresher?: boolean           // Only applicable to KRMU year 1
}
```

### Registration Response

```typescript
{
  referenceId: string,          // Unique ticket reference (e.g., ABC123XYZ789)
  name: string,
  email: string,
  isKrmu: boolean,
  rollNumber?: string,
  course: string,
  year: string,
  isFresher: boolean,
  feeAmount: number,            // 500 or 700
  feePaid: boolean,             // Initially false
  hasQrCode: boolean            // true after payment
}
```

---

## 3. REGISTRATION FLOW AT A GLANCE

### KRMU Student Registration (7-12 steps)
1. Welcome → Institution Selector
2. Enter 10-digit Roll Number
3. Roll number found? 
   - YES: Skip to OTP
   - NO: Confirm or enter new student details
4. OTP Verification (to KRMU email)
5. Year = 1? Show Fresher opt-in → Submit preference
6. Display Fee Summary
7. Reference ID (copy to clipboard)
8. Payment (PhonePe/Paytm)
9. Completed + Ticket

**Fee:** ₹500 (KRMU), ₹0 (Fresher)

### External Student Registration (6-9 steps)
1. Welcome → Institution Selector
2. Enter Email Address
3. OTP Verification (to provided email)
4. Enter Name, Course, Year, College
5. Reference ID (copy to clipboard)
6. Payment (PhonePe/Paytm)
7. Completed + Ticket

**Fee:** ₹700

---

## 4. MAIN COMPONENTS EXPLAINED

### RegistrationDialog.tsx
- Wraps all registration steps in a Dialog modal
- Renders appropriate step component based on `useRegistration().step`
- Shows/hides header based on step
- Max-height 90vh with scroll

### useRegistration() Hook
- Manages all state: step, email, referenceId, fees, errors
- Provides methods: startRegistration(), submitRollNumber(), submitEmail(), etc.
- Persists state to localStorage
- Handles step history for back button

### Registration API Routes
All paths in `/api/v1/registration?path=XXX`:
- `start` - Initialize registration
- `roll-number` - Validate KRMU roll
- `email` - Submit external email
- `otp-request` - Send OTP
- `otp-verify` - Verify OTP code
- `details` - Submit external details
- `fresher` - Submit fresher preference
- `confirm-details` - Confirm fee (KRMU)
- `confirm-payment` - Mark payment done

---

## 5. KEY FUNCTIONS

### Backend (registration.ts)

```typescript
// Create a new registration and return reference ID
createRegistration(data: CreateRegistrationData): Promise<string>

// Check if roll number or email already registered
checkDuplicateRegistration(rollNumber?, email?): Promise<{exists, registration?, reason?}>

// Look up registration by reference ID (case-insensitive)
getRegistrationByReferenceId(referenceId): Promise<Registration>

// Look up registration by external app ID
getRegistrationByExternalAppId(externalAppId): Promise<Registration>

// Mark payment complete, generate QR code
markPaymentSuccessful(referenceId): Promise<void>

// Get registration statistics
getStatistics(): Promise<{total, krmu, external, paid, fresher}>
```

### Frontend (lib/api.ts)

```typescript
// Start registration flow
api.startRegistration(externalAppId, institution)

// Submit roll number and get response
api.submitRollNumber(externalAppId, rollNumber)

// Submit email and move to OTP
api.submitEmail(externalAppId, email)

// Request OTP to be sent
api.requestOtp(externalAppId)

// Verify OTP code
api.verifyOtp(externalAppId, otp)

// Submit external student details
api.submitDetails(externalAppId, name, course, year, college?)

// Confirm fresher preference
api.submitFresher(externalAppId, isFresher)

// Mark payment as complete
api.confirmPayment(referenceId)

// Get current registration status
api.getRegistrationStatus(externalAppId)

// Search registration by reference ID
api.searchRegistration(referenceId)
```

---

## 6. CONFIGURATION

### Fees (in lib/server/config.ts)
- `feeKrmu: 500` - KRMU student registration fee
- `feeExternal: 700` - External student registration fee
- `paymentLinkInternal: string` - PhonePe link for KRMU
- `paymentLinkExternal: string` - PhonePe link for external
- `enableExternalRegistration: boolean` - Can disable external registrations

---

## 7. PAYMENT FLOW

**User sees Reference ID** → "Copy & Continue" → **Payment Page opens**

Payment Gateway Integration:
1. User clicks "Continue to Payment" on PaymentStep
2. 3-second countdown auto-redirects to PhonePe/Paytm link
3. User completes payment using reference ID as transaction ID
4. User returns and clicks "I've Paid"
5. API confirms payment
6. QR code generated and encrypted
7. Email sent with ticket
8. Success page shown

---

## 8. OTP & VERIFICATION

### OTP Generation
- 6-digit numeric code
- Sent to email (KRMU: rollNumber@krmu.edu.in, External: provided email)
- 60-second resend timer
- Expires after 15 minut
