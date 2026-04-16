# Registration System Analysis - Solesta 2026

## Overview
The Solesta registration system consists of two main flows:
1. **KRMU Student Registration** - For KR Mangalam University students
2. **External Student Registration** - For students from other universities

Both flows are implemented as a single dialog-based modal component with state machine management.

---

## 1. CREATE NEW REGISTRATION MODAL COMPONENT

### Main Component: `RegistrationDialog.tsx`
**Location:** `D:\ideas-portal\solesta\solesta\components\RegistrationDialog.tsx`

The `RegistrationDialog` is the main modal container that orchestrates the entire registration flow.

**Architecture:**
- Uses the `useRegistration` hook for state management
- Renders different step components based on the current `step` value
- Step progression is handled by the hook

**Registration Steps Flow:**

```
welcome 
  ↓
select-institution 
  ├→ KRMU path: roll-number
  └→ External path: email
```

**Complete Step Sequence:**

```
1. welcome - Welcome page with registration status info
2. select-institution - Choose KRMU or External
3. roll-number - Enter 10-digit KRMU roll number (KRMU only)
4. roll-number-confirm - Confirm if roll number is correct (KRMU only)
5. new-student-details - Enter name, course, year if roll not found (KRMU only)
6. email - Enter email address (External only)
7. otp - OTP verification (Both)
8. details - Enter name, course, year, college (External only)
9. display-fee - Verify and confirm details before payment (Both)
10. fresher - Mr. & Mrs. Fresher competition opt-in (KRMU 1st year only)
11. reference-id - Display reference ID and fee amount
12. payment - Payment gateway integration
13. completed - Registration success page
14. ticket - QR code ticket display
```

**Dialog Configuration:**
- Max height: 90vh with scrolling enabled
- Modal width: max-w-md (medium responsive)
- Shows header with title and description for most steps
- No header for "completed" and "ticket" steps

---

## 2. REGISTRATION DATA MODELS/TYPES

### Database Model: `Registration` (Prisma)
**Location:** `D:\ideas-portal\solesta\solesta\prisma\schema.prisma`

```typescript
model Registration {
  id                    String        // MongoDB ObjectId
  referenceId          String        @unique // Unique ticket reference
  userId               String        @unique @db.ObjectId
  telegramId           String?
  externalAppId        String?       // For web app users
  
  // Registration Details
  name                 String
  email                String
  rollNumber           String?       // KRMU only
  college              String?       // External only
  course               String        // e.g., "B.A. LL.B"
  year                 String        // "1", "2", "3", "4", "5"
  isKrmu               Boolean
  isFresher            Boolean?      // Mr. & Mrs. Fresher competition
  
  // Payment Information
  feeAmount            Int           // In rupees (500 for KRMU, 700 for External)
  feePaid              Boolean       @default(false)
  paymentDate         DateTime?
  
  // QR Code & Ticket
  qrCode              String?       // Encrypted QR code
  qrSentTelegram     Boolean       @default(false)
  qrSentEmail        Boolean       @default(false)
  
  // Retry Tracking
  telegramRetryCount Int           @default(0)
  emailRetryCount    Int           @default(0)
  lastTelegramAttempt DateTime?
  lastEmailAttempt   DateTime?
  
  // Ticket Management
  ticketSentAt        DateTime?
  manualRegistration  Boolean       @default(false)
  
  // Event Tracking
  scanned              Boolean       @default(false)
  scannedAt            DateTime?
  scannedBy            String?       // Scanner/admin ID
  
  // Timestamps
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  
  user                 User          @relation(fields: [userId], references: [id])
}

model User {
  id                    String        @id @default(auto()) @map("_id") @db.ObjectId
  telegramId            String?       @unique
  externalAppId         String?       @unique // For web app
  username              String?
  firstName             String?
  lastName              String?
  state                 String        @default("START") // UserState enum
  stateData             Json?         // Flexible data storage for current registration step
  isVerified            Boolean       @default(false)
  isKrmu                Boolean       @default(false)
  isAdmin               Boolean       @default(false)
  verifiedAt            DateTime?     // Email verification timestamp
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  
  registration          Registration?
}
```

### TypeScript Interfaces

#### CreateRegistrationData
**Location:** `D:\ideas-portal\solesta\solesta\lib\server\registration.ts`

```typescript
export interface CreateRegistrationData {
  telegramId?: string;
  externalAppId?: string;
  name: string;
  email: string;
  rollNumber?: string;              // KRMU only
  college?: string;                 // External only
  course: string;
  year: string;
  isKrmu: boolean;
  isFresher?: boolean;
}
```

#### StateData (User State Machine)
**Location:** `D:\ideas-portal\solesta\solesta\lib\server\stateMachine.ts`

```typescript
export interface StateData {
  institution?: "krmu" | "external";
  rollNumber?: string;
  email?: string;
  name?: string;
  course?: string;
  year?: string;
  college?: string;
  collegeRoll?: string;
  isFresher?: boolean;
  feeAmount?: number;
  referenceId?: string;
  otpSent?: boolean;
  isNewStudent?: boolean;
  deviceToken?: string;
}

export enum UserState {
  START = "START",
  SELECT_INSTITUTION = "SELECT_INSTITUTION",
  ENTER_ROLL_NUMBER = "ENTER_ROLL_NUMBER",
  ROLL_NUMBER_CONFIRM = "ROLL_NUMBER_CONFIRM",
  NEW_STUDENT_DETAILS = "NEW_STUDENT_DETAILS",
  OTP_VERIFICATION = "OTP_VERIFICATION",
  MANUAL_DETAILS = "MANUAL_DETAILS",
  ENTER_EMAIL = "ENTER_EMAIL",
  ENTER_NAME = "ENTER_NAME",
  FRESHER_SELECTION = "FRESHER_SELECTION",
  DISPLAY_FEE = "DISPLAY_FEE",
  REFERENCE_ID = "REFERENCE_ID",
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
  COMPLETED = "COMPLETED",
}
```

#### RegistrationContextType (React Context)
**Location:** `D:\ideas-portal\solesta\solesta\hooks\useRegistration.tsx`

```typescript
interface RegistrationContextType {
  step: RegistrationStep;
  externalAppId: string;
  email: string;
  referenceId: string;
  paymentLink: string;
  isKrmu: boolean;
  isFresher: boolean | null;
  feeAmount: number;
  isLoading: boolean;
  error: string | null;
  registrationStatus: RegistrationStatus | null;
  userDetails: {
    name: string;
    email: string;
    rollNumber?: string;
    course: string;
    year: string;
  } | null;
  
  // Methods
  goBack: () => void;
  startRegistration: (institution: "krmu" | "external") => Promise<void>;
  submitRollNumber: (rollNumber: string) => Promise<void>;
  submitRollNumberConfirm: (confirmed: boolean) => Promise<void>;
  submitNewStudentDetails: (name: string, course: string, year: string) => Promise<void>;
  submitEmail: (email: string) => Promise<void>;
  requestOtp: () => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  submitDetails: (name: string, course: string, year: string, college?: string) => Promise<void>;
  confirmDetails: () => Promise<void>;
  submitFresher: (isFresher: boolean) => Promise<void>;
  confirmPayment: () => Promise<void>;
  checkStatus: () => Promise<void>;
  reset: () => void;
  restart: () => void;
}
```

---

## 3. REGISTRATION COMPONENTS

### Step-by-Step Components

**1. WelcomeStep.tsx**
- Displays info about registration closure and on-the-spot registration
- Shows fee amounts (KRMU: ₹500, External: ₹700)
- Warning for KRMU hostellers about ICloudEMS payment

**2. InstitutionSelector.tsx**
- Two buttons: "KRMU Student" and "Other University"
- Fetches config to check if external registration is enabled
- Initiates the registration flow

**3. RollNumberInput.tsx** (KRMU Path)
- 10-digit numeric input fields (individual i
