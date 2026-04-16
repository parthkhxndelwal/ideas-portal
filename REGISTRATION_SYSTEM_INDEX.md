# Registration System - Complete Documentation Index

## Created Documentation Files

This analysis includes 3 comprehensive documentation files created for the Solesta 2026 registration system:

### 1. **REGISTRATION_FLOW_ANALYSIS.md** (8.0 KB)
**Location:** `D:\ideas-portal\REGISTRATION_FLOW_ANALYSIS.md`

Comprehensive technical documentation covering:
- Complete component architecture and step flow
- Database schema models (User, Registration, Student, OTP)
- TypeScript interfaces and types
- All 14 registration step components explained
- KRMU vs External registration flow differences
- Complete API endpoints documentation
- Fresher registration separate endpoint
- Payment processing workflow
- State persistence and recovery mechanisms
- Duplicate registration prevention
- File structure and organization

**Use this for:** Deep understanding of how the system works, full architecture overview

### 2. **REGISTRATION_FLOW_DIAGRAM.txt** (12 KB)
**Location:** `D:\ideas-portal\REGISTRATION_FLOW_DIAGRAM.txt`

Visual ASCII diagrams showing:
- KRMU Student Registration Flow (with decision trees)
- External Student Registration Flow
- Fresher-Only Registration Flow
- Complete database schema visual representation
- Data model relationships
- Fee configuration overview
- API endpoints overview

**Use this for:** Visual understanding, presentations, quick conceptual overview

### 3. **QUICK_REFERENCE.md** (7.5 KB)
**Location:** `D:\ideas-portal\QUICK_REFERENCE.md`

Quick lookup guide with:
- All file locations (15 key files listed)
- Data structure snippets
- Registration flow at-a-glance
- Key functions and methods
- Configuration values
- Payment flow overview
- OTP verification details
- Validation rules
- Error handling
- Testing checklist
- Common code patterns

**Use this for:** Quick lookups, copy-paste code patterns, debugging

---

## Key Findings Summary

### 1. Main Registration Modal Component
**File:** `D:\ideas-portal\solesta\solesta\components\RegistrationDialog.tsx`
- Single modal orchestrating entire registration flow
- Renders different step components dynamically
- Uses `useRegistration()` hook for centralized state management
- Handles both KRMU and external student paths

### 2. Registration Step Components (14 total)
Located in: `D:\ideas-portal\solesta\solesta\components\registration/`

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | WelcomeStep.tsx | Info and fee display |
| 2 | InstitutionSelector.tsx | Choose KRMU or External |
| 3 | RollNumberInput.tsx | 10-digit KRMU roll entry (KRMU path) |
| 4 | RollNumberConfirm.tsx | Confirm roll number (KRMU path) |
| 5 | NewStudentDetailsForm.tsx | Manual entry if roll not found (KRMU) |
| 6 | EmailInput.tsx | Email entry (External path) |
| 7 | OtpInput.tsx | 6-digit OTP verification (both paths) |
| 8 | DetailsInput.tsx | Name, course, year entry (External path) |
| 9 | DisplayFeeStep.tsx | Fee summary confirmation (both paths) |
| 10 | FresherSelector.tsx | Mr. & Mrs. Fresher opt-in (KRMU year 1) |
| 11 | ReferenceIdStep.tsx | Display and copy reference ID (both) |
| 12 | PaymentStep.tsx | Payment gateway redirect (both) |
| 13 | CompletedStep.tsx | Success message |
| 14 | TicketStep.tsx | QR code ticket display |

### 3. Registration Data Models

**Registration Table** - Stores complete registration info:
- referenceId (unique ticket reference)
- name, email, course, year
- rollNumber (KRMU only), college (external only)
- isKrmu, isFresher flags
- feeAmount, feePaid, paymentDate
- qrCode (encrypted)
- scanned status and timestamp

**User Table** - Tracks registration state:
- externalAppId (unique per web session)
- state (UserState enum tracking current step)
- stateData (JSON storing form progress)
- isVerified, isKrmu flags
- verifiedAt timestamp for email verification

**Student Table** - KRMU student database:
- rollNumber, name, course, year, email

### 4. Registration Creation Process

**Files Involved:**
- Frontend: `D:\ideas-portal\solesta\solesta\hooks\useRegistration.tsx` (state management)
- Backend: `D:\ideas-portal\solesta\solesta\lib\server\registration.ts` (DB operations)
- API: `D:\ideas-portal\solesta\solesta\app\api\v1\registration\route.ts` (endpoints)

**Process:**
1. User selects KRMU or External
2. Collects relevant data based on path
3. Validates and verifies email via OTP
4. Calls `createRegistration()` function
5. Generates unique reference ID
6. Stores registration in database
7. Returns reference ID for payment
8. After payment confirmation, generates QR code

### 5. KRMU vs External Student Flows

**KRMU Flow (7-12 steps):**
- Enter 10-digit roll number
- If not found: enter name, course, year to create new student
- OTP verification to KRMU email
- Optional fresher competition opt-in (year 1 only)
- Display fee confirmation (₹500)
- Payment and ticket

**External Flow (6-9 steps):**
- Enter email address
- OTP verification to that email
- Enter name, course, year, college (optional)
- Display fee confirmation (₹700)
- Payment and ticket

### 6. Key Technologies & Patterns

**Frontend:**
- React Context API for state management
- Custom hooks (useRegistration)
- Component composition (step components)
- localStorage for session persistence
- Fetch API for backend communication

**Backend:**
- Next.js API routes
- Prisma ORM with MongoDB
- Email service integration
- OTP generation and hashing
- QR code generation and encryption
- State machine pattern (UserState enum)

**Database:**
- MongoDB (via Prisma)
- User ↔ Registration relationship (1:1)
- Student lookup by rollNumber
- OTP tracking for verification

### 7. Fee Configuration

```
KRMU Student:      ₹500
External Student:  ₹700
Fresher (KRMU):    ₹0 (free)
```

Payment gateway: PhonePe/PaytmPayments
- KRMU link: https://p.ppsl.io/PYTMPS/Ro1Qfk
- External link: https://p.ppsl.io/PYTMPS/UYrQfk

### 8. Important Features

**Duplicate Prevention:**
- Checks by roll number (KRMU)
- Checks by email (external)
- Returns existing reference ID if found

**Device Tracking:**
- Device token generated per browser/device
- Email verification valid for 48 hours on same device
- Prevents OTP re-entry on same device

**State Recovery:**
- Session ID stored in localStorage
- Step progress restored on page refresh
- Partial form data preserved

**Validation:**
- Roll number: exactly 10 digits
- Email: valid format, no duplicates
- Name/Course: minimum 2 characters
- Year: 1-5 only
- College: optional for external

### 9. API Endpoint Summary

All registration endpoints under `/api/v1/registration`:
- `?path=start` - Initialize registration
- `?path=roll-number` - Validate KRMU roll
- `?path=roll-number-confirm` - Confirm or edit roll
- `?path=new-student-details` - Create new student
- `?path=email` - Submit external email
- `?path=otp-request` - Send OTP
- `?path=otp-verify` - Verify OTP
- `?path=details` - Submit external details
- `?path=fresher` - Submit fresher preference
- `?path=confirm-details` - Confirm fee (KRMU)
- `?path=confirm-payment` - Mark payment done
- `?externalAppId=xxx` (GET) - Check status
- `?referenceId=xxx` (GET) - Search by reference

Separate endpoint: `/api/v1/fresher-registration`
- Alternative standalone fresher registration flow

### 10. Important Files Reference

**Core Registration Logic:**
- `D:\ideas-portal\solesta\solesta\lib\server\registration.ts` - createRegistration(), checkDuplicateRegistration()
- `D:\ideas-portal\solesta\solesta\lib\server\stateMachine.ts` - UserState enum, state transitions
- `D:\ideas-portal\solesta\solesta\lib\server\studentData.ts` - Student database queries

**API Handlers:**
- `D:\ideas-portal\solesta\solesta\app\api\v1\registration\route.ts` - Main endpoints (1240 lines)
- `D:\ideas-portal\solesta\solesta\app\api\v1\fresher-registration\route.ts` - Fresher endpoint (353 lines)

**Frontend State:**
- `D:\ideas-portal\solesta\solesta\hooks\useRegistration.tsx` - Registration context and hooks (600 lines)
- `D:\ideas-portal\solesta\solesta\lib\api.ts` - Frontend API client

**Database:**
- `D:\ideas-portal\solesta\solesta\prisma\schema.prisma` - Complete
