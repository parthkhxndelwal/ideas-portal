# Architecture & Technical Design

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CSV Payment Data                         │
│              (Paytm Export - External & Internal)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   CSV Processor               │
         │ - Parse both files            │
         │ - Extract key columns         │
         │ - Categorize by type          │
         └───────────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │Normalize │   │Validate  │   │Reference ID  │
    │Data      │   │Fields    │   │Lookup/Fuzzy  │
    │          │   │          │   │Match         │
    └────┬─────┘   └────┬─────┘   └──────┬───────┘
         │              │                 │
         └──────────────┼─────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │   MongoDB Registration      │
          │   Database Lookup           │
          │                             │
          │ - Exact/Fuzzy Match         │
          │ - Get stored email          │
          │ - Get roll number           │
          │ - Get KRMU status           │
          └────────────┬────────────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │   Email Resolution          │
          │   (Priority Fallback)       │
          │                             │
          │ KRMU:                       │
          │  1. App email               │
          │  2. Payment email           │
          │  3. Derived @krmu.edu.in    │
          │                             │
          │ External:                   │
          │  1. App email               │
          │  2. Payment email           │
          └────────────┬────────────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │  Test Email (1st record)    │
          │                             │
          │  Send to:                   │
          │  2301350013@krmu.edu.in     │
          │                             │
          │  Wait for confirmation      │
          │  or timeout (30 sec)        │
          │                             │
          │  ON FAIL: ABORT ALL         │
          └────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  QR Code Generation          │
        │                              │
        │  1. Format: RefID:RollNo:RefID│
        │  2. Encrypt (AES-256-CBC)    │
        │  3. Generate PNG (DataURL)   │
        │  4. Store in MongoDB         │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Email Sending               │
        │  (Office365 SMTP)            │
        │                              │
        │  • Embedded QR image         │
        │  • Reference ID              │
        │  • HTML template             │
        │  • Track delivery            │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Database Update             │
        │                              │
        │  feePaid = true              │
        │  qrCode = base64_png         │
        │  qrSentEmail = true          │
        │  paymentDate = now()         │
        │  lastEmailAttempt = now()    │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Error Logging               │
        │  • errors.csv                │
        │  • session.log               │
        │  • Processing summary        │
        └──────────────────────────────┘
```

## Component Architecture

### 1. **config.js** (Core Configuration)

- Loads environment variables from bot's `.env`
- Initializes Prisma client (MongoDB)
- Exports config object with all settings

**Key Functions:**

- `validateConfig()` - Validates required env vars
- `prisma` - Singleton database client

**Dependencies:** dotenv, @prisma/client

---

### 2. **lib/utils.js** (Utilities & Helpers)

- String normalization (trim, uppercase, remove special chars)
- Validation functions (email, roll number, format)
- Levenshtein distance for fuzzy matching
- CSV parsing helpers

**Key Functions:**

- `normalizeReferenceId(refId)` - Cleans RefID
- `normalizeEmail(email)` - Lowercase/trim
- `levenshteinDistance(str1, str2)` - Similarity score
- `isValidEmail(email)` - Regex validation
- `formatCurrency(amount)` - INR formatting

**Dependencies:** None (pure JS)

---

### 3. **lib/csv-processor.js** (CSV File Handling)

- Discovers CSV files in folder
- Validates exactly 2 files exist
- Parses CSV headers and data rows
- Extracts relevant columns
- Categorizes by student type

**Key Functions:**

- `findCsvFiles()` - Discover files
- `parseCsvFile(filePath)` - Parse single file
- `loadCsvData()` - Load both files, categorize
- `parseDataLine(line)` - Handle quoted fields

**Dependencies:** fs (promises), path

---

### 4. **lib/qr-generator.js** (QR Encryption & Generation)

- **Uses same encryption as bot** (AES-256-CBC)
- Generates QR from encrypted data
- Returns base64 PNG DataURL

**Key Functions:**

- `encryptQR(data)` - AES-256-CBC encryption
- `generateQRCode(encryptedData)` - PNG generation
- `generateQRForRegistration(refId, rollNumber)` - Full flow

**Data Format:**

```
Raw:       SOL26-E0380:2301350013:SOL26-E0380
Encrypted: iv_hex:encrypted_hex
QR Image:  data:image/png;base64,...
```

**Dependencies:** crypto (Node.js), qrcode

---

### 5. **lib/email-sender.js** (Email Delivery)

- Configures Office365 SMTP (nodemailer)
- Sends QR tickets with embedded images
- Sends test emails
- Tests SMTP connectivity

**Key Functions:**

- `testSmtpConnection()` - Verify SMTP
- `sendQREmail(to, name, refId, isKrmu, qrCode)` - Send QR
- `sendTestEmail(to)` - Send test
- `getTransporter()` - Get SMTP connection

**Email Format:**

- HTML template with embedded QR
- Reference ID displayed
- Branded: "Solesta '26"

**Dependencies:** nodemailer

---

### 6. **lib/email-resolver.js** (Email Priority Resolution)

- Different strategies for KRMU vs external
- Priority-based email selection
- Fallback chain with validation

**Key Functions:**

- `resolveKrmuEmail(csvRecord, dbRegistration)` - KRMU priority
- `resolveExternalEmail(csvRecord, dbRegistration)` - External priority
- `resolveEmail(csvRecord, dbRegistration, isKrmu)` - Dispatcher

**Resolution Order:**

**KRMU:**

1. Registration email (app)
2. CSV payment email
3. Derived @krmu.edu.in (rollNumber)

**External:**

1. Registration email (app)
2. CSV payment email

**Dependencies:** utils.js

---

### 7. **lib/reference-validator.js** (ID Lookup & Fuzzy Match)

- Exact lookups in MongoDB
- Fuzzy matching with Levenshtein distance
- Interactive user selection for ambiguous matches
- Handles typos and partial matches

**Key Functions:**

- `lookupReferenceId(normalizedRefId)` - Exact DB lookup
- `fuzzyMatchReferenceId(normalizedRefId)` - Find similar
- `selectFromMatches(matches, originalRefId)` - User prompt
- `validateAndResolveRefId(csvRefId)` - Full resolution

**Fuzzy Match Logic:**

- Calculate Levenshtein distance to all DB records
- Show top 5 matches (distance ≤ 2)
- User selects correct ID or skips
- No silent substitutions

**Dependencies:** utils.js, config.js (Prisma), readline

---

### 8. **lib/error-logger.js** (Error Tracking & Logging)

- Creates errors.csv with failed records
- Session logs with timestamps
- Error categorization
- Processing summary

**Key Functions:**

- `initializeErrorLogging()` - Setup files
- `logError(record, errorType, errorMessage)` - Log to CSV
- `logToSessionFile(message, level)` - Log to session
- `logSummary(summary)` - Final summary

**Error CSV Format:**

```csv
timestamp,reference_id,name,email,student_type,error_type,error_message,raw_data
2026-04-14T15:30:45Z,SOL26-XYZ,John,john@email,EXTERNAL,NOT_FOUND,"No match found",{...}
```

**Dependencies:** fs (promises), path

---

### 9. **qr-approval.js** (Main Orchestrator)

- Entry point with main() function
- Orchestrates entire workflow
- Displays banners and progress
- Handles test email phase
- Processes all records with error handling
- Generates final summary

**Workflow:**

1. Load & validate config
2. Initialize logging
3. Load CSV data
4. FOR EACH record:
   - Validate reference ID (exact/fuzzy)
   - Skip if already processed
   - Resolve email (priority)
   - Send test email (first record only)
   - Generate QR
   - Update DB with QR
   - Send email with QR
   - Mark as processed
5. Log summary & stats

**Key Functions:**

- `main()` - Entry point
- `processRecord(record, index, total, isFirstRecord)` - Single record handler
- `validateRecord(record, dbRegistration)` - Field validation
- `waitForTestConfirmation(address)` - Test email wait
- `runTestEmail()` - Test phase
- `prompt(question)` - User interaction

**Dependencies:** All lib modules, readline

---

## Data Flow

### Input

```
CSV Files (External + Internal)
↓
  • Name, Email ID, Your Reference ID
  • Registration Fee, Phone Number
  • Product Code (determines type)
```

### Processing

```
Parse → Normalize → Validate Ref ID → Check DB
↓
Resolve Email (priority-based) → Validate fields
↓
Generate QR (AES-256-CBC + PNG) → Update DB
↓
Send Email with QR → Mark as processed
```

### Output

```
Success:
  • records.registrations collection updated
    - feePaid: true
    - qrCode: base64_png
    - qrSentEmail: true
    - paymentDate: timestamp

Errors:
  • logs/errors.csv (all failures)
  • logs/[timestamp].log (session transcript)
```

---

## Database Schema Integration

Uses existing **Registration** model from bot:

```javascript
model Registration {
  // ID & References
  referenceId       String      @unique      // SOL26-XXXXX
  userId            String      @unique
  telegramId        String?

  // User Data
  name              String
  email             String
  rollNumber        String?
  college           String?
  course            String
  year              String

  // Type & Verification
  isKrmu            Boolean
  isFresher         Boolean?

  // Payment Status (SCRIPT UPDATES THESE)
  feePaid           Boolean     @default(false)
  paymentDate       DateTime?
  feeAmount         Int

  // QR Delivery (SCRIPT UPDATES THESE)
  qrCode            String?
  qrSentEmail       Boolean     @default(false)
  qrSentTelegram    Boolean     @default(false)
  emailRetryCount   Int         @default(0)
  lastEmailAttempt  DateTime?

  // Relations
  user              User        @relation(...)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}
```

**Script Updates:**

```javascript
await prisma.registration.update({
  where: { referenceId },
  data: {
    feePaid: true,
    qrCode: base64_png,
    qrSentEmail: true,
    paymentDate: new Date(),
    lastEmailAttempt: new Date(),
  },
})
```

---

## Security Considerations

### ✅ Encryption

- Uses **same AES-256-CBC key** as bot (`QR_ENCRYPTION_KEY`)
- QR data encrypted before conversion to PNG
- Encryption key loaded from `.env` (not hardcoded)

### ✅ Database

- Prisma connection via MongoDB Atlas
- Connection string in `.env`
- No sensitive data in logs (beyond email)

### ✅ Email

- TLS encryption on SMTP port 587
- Credentials in `.env` (never logged)
- Nodemailer handles secure transport

### ✅ Error Handling

- Errors logged without passwords/tokens
- Failed records tracked but not retried automatically
- Test email prevents mass email failures

### ⚠️ File Access

- CSV files read-only
- Error logs written locally
- Ensure `.env` file permissions are restricted

---

## Error Handling Strategy

### Validation Errors (Skip & Log)

- Missing email → Log error, skip record
- Bad reference ID → Show fuzzy matches or skip
- Fee mismatch → Log error, skip record
- Already processed → Skip silently

### Critical Errors (Abort)

- SMTP connection fails → Show error, exit
- Config validation fails → Show missing vars, exit
- Test email fails → Show error, abort batch

### Soft Errors (Log & Continue)

- Telegram send fails → Log warning, continue
- Database update fails → Log error, continue

---

## Testing Checklist

- [ ] CSV files discovered correctly
- [ ] Headers parsed with correct columns
- [ ] Reference ID exact matching works
- [ ] Fuzzy matching shows correct suggestions
- [ ] Email resolution prioritizes correctly
- [ ] QR encryption matches bot's format
- [ ] Test email sends and receives
- [ ] Database updates persist correctly
- [ ] Error CSV created with proper format
- [ ] Session logs contain timestamps
- [ ] Already processed records skipped
- [ ] No duplicate QRs sent

---

## Performance Notes

- **CSV Parsing**: O(n) where n = number of rows
- **Fuzzy Matching**: O(n\*m) where m = pattern length (acceptable for ~300 records)
- **Database Queries**: One lookup per record
- **Email Sending**: Sequential (one per second ~60 req/min)
- **Total Time**: ~5 minutes for 300 records

---

## Version & Compatibility

- **Node.js**: 18+ (uses ES modules)
- **MongoDB**: 4.4+ (Prisma compatible)
- **Bot Version**: Compatible with solesta_bot v5.x

---

**Architecture Last Updated**: April 2026
