# Solesta QR Approval Script

Payment data to entry QR ticket conversion utility for Solesta '26.

## Overview

This script automates the process of:

1. ✅ Validating payment records from CSV exports (Paytm)
2. ✅ Looking up registration data in MongoDB
3. ✅ Resolving participant emails with priority fallback
4. ✅ Generating encrypted QR codes (same format as bot)
5. ✅ Sending QR tickets via email
6. ✅ Tracking successful sends and logging errors

## Features

- **Smart Reference ID Matching**: Fuzzy matching with Levenshtein distance for typos
- **Dual Email Priority**: Different resolution strategies for KRMU vs external students
- **Test Email Verification**: Blocks batch processing until test email confirmed
- **Already Processed Detection**: Skips records with `feePaid: true` to prevent duplicates
- **Comprehensive Error Logging**: All failures saved to `errors.csv`
- **Database Integration**: Direct Prisma/MongoDB queries using same credentials as bot
- **QR Format Compliance**: Uses bot's AES-256-CBC encryption algorithm
- **Session Logging**: Timestamped logs for audit trail

## Installation

### Prerequisites

- Node.js 18+
- MongoDB connection (from bot's .env)
- SMTP credentials (Office365 configured in bot's .env)

### Setup

```bash
# Install dependencies
npm install

# The script will auto-load environment from solesta_bot/.env
# No additional setup needed if bot is configured
```

## Usage

```bash
# Run the script
npm start

# Or directly
node qr-approval.js
```

## How It Works

### 1. CSV Processing

- Scans `approval_script/` folder for CSV files
- Expects exactly 2 files (internal + external)
- Extracts: Reference ID, Name, Email, Fee, Student Type

### 2. Reference ID Validation

- **Exact Match**: Direct lookup in MongoDB
- **Fuzzy Match**: If not found, shows similar IDs (Levenshtein ≤ 2)
- **User Selection**: Interactive CLI to choose correct ID or skip

### 3. Email Resolution

**For KRMU Students:**

1. Try: Email from app registration
2. Fallback: Email from payment CSV
3. Fallback: Derived from roll number (@krmu.edu.in)

**For External Students:**

1. Try: Email from app registration
2. Fallback: Email from payment CSV

### 4. QR Generation & Sending

- Generates QR from: `referenceId:rollNumber:referenceId` (encrypted)
- Uses AES-256-CBC (same key as bot)
- Sends as embedded image in HTML email
- Marks as processed: `feePaid: true, qrSentEmail: true`

### 5. Test Email Phase

- Before batch processing starts, sends test email to `2301350013@krmu.edu.in`
- Waits 30 seconds for user confirmation
- Auto-proceeds on ENTER or timeout
- **Aborts entire batch if test fails**

### 6. Error Handling

- All failures logged to: `approval_script/logs/errors.csv`
- No QR sent if ANY required field fails
- Records are skipped if `feePaid` already true
- Session log created for audit trail

## Data Flow Diagram

```
CSV Files (2)
    ↓
Parse & Extract Data
    ↓
FOR EACH RECORD:
    ├─ Normalize data
    ├─ Check if already processed (feePaid=true)
    │   └─ YES: SKIP
    ├─ Validate Reference ID (exact/fuzzy match)
    ├─ Resolve Email (priority-based)
    ├─ Test Email (first record only)
    ├─ Generate QR (encrypted)
    ├─ Send Email with QR
    └─ Mark as Processed (feePaid=true)
    ↓
Summary & Logs
```

## Error Types

| Code                  | Trigger                     | Action           |
| --------------------- | --------------------------- | ---------------- |
| `ALREADY_PROCESSED`   | `feePaid == true`           | SKIP record      |
| `INVALID_REFID_EXACT` | No exact match + no fuzzy   | ERROR            |
| `INVALID_REFID_FUZZY` | User rejects suggestions    | ERROR            |
| `MISSING_EMAIL`       | No valid email found        | ERROR            |
| `MISSING_NAME`        | Name is empty               | ERROR            |
| `FEE_MISMATCH`        | Fee doesn't match expected  | ERROR            |
| `INVALID_ROLLNO`      | KRMU without 10-digit roll  | ERROR            |
| `QR_GEN_FAILED`       | Encryption/generation error | ERROR (Critical) |
| `EMAIL_SEND_FAILED`   | SMTP delivery failed        | ERROR            |
| `TEST_EMAIL_FAILED`   | Test email didn't send      | ABORT ALL        |

## Output Files

### Successful Run

```
logs/
├── 2026-04-14_15-30-45.log    # Session log
└── errors.csv                   # Failed records

errors.csv columns:
- timestamp
- reference_id
- name
- email
- student_type
- error_type
- error_message
- raw_data
```

## Configuration

Edit environment variables in `solesta_bot/.env`:

```env
# Required
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/krmuticketbot
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=krmuevents@krmangalam.edu.in
SMTP_PASS=<password>
QR_ENCRYPTION_KEY=SOLESTA26SECRETKEY2026XXXX

# Optional
FEE_KRMU=500
FEE_EXTERNAL=700
TEST_EMAIL_ADDRESS=2301350013@krmu.edu.in
```

## Integration with Bot

The script uses:

- Same **database connection** (Prisma/MongoDB)
- Same **QR encryption** (AES-256-CBC)
- Same **email template** (nodemailer/Office365)
- Same **database schema** (Registration model)

After script completes:

- Admin can use `/resendall` command to send QRs via Telegram
- All data persists in same `registrations` collection

## Database Updates

On successful QR send, the script updates:

```javascript
{
  feePaid: true,              // Marks payment as verified
  qrCode: "base64_png_data",  // Stores QR image
  qrSentEmail: true,          // Email delivery confirmed
  paymentDate: now(),         // Records payment timestamp
  lastEmailAttempt: now()     // Tracks attempt time
}
```

## Debugging

### Enable verbose logging:

Check `logs/[timestamp].log` for detailed session transcript

### Check error log:

View `logs/errors.csv` for all failed records with reasons

### Database lookup:

Connect to MongoDB and query `registrations` collection:

```javascript
db.registrations.findOne({ referenceId: "SOL26-XXXXX" })
```

## Troubleshooting

**"No CSV files found"**

- Ensure 2 CSV files are in `approval_script/` folder

**"Expected exactly 2 CSV files"**

- Remove any extra CSV files from folder

**"Test email failed"**

- Check SMTP credentials in `.env`
- Verify email is configured in bot's `.env`
- Run: `node -e "require('./lib/email-sender.js').testSmtpConnection()"`

**"Reference ID not found"**

- Check reference ID format in database
- Common issues: Spaces, wrong case, special characters
- Use fuzzy match option if available

**"Email resolution failed"**

- Verify email exists in either:
  - Registration record (app email)
  - CSV payment data (payment email)
  - KRMU student roll number (@krmu.edu.in)

## Security Notes

- ✅ QR encryption uses same key as bot (AES-256-CBC)
- ✅ Passwords never logged, only in .env
- ✅ Errors logged without sensitive data beyond email
- ✅ All network communication via HTTPS/TLS
- ⚠️ Keep `.env` file secure (contains SMTP password)

## Support

For issues or questions:

1. Check error log in `logs/errors.csv`
2. Review session log in `logs/[timestamp].log`
3. Verify CSV format matches expected columns
4. Ensure database is accessible

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Maintainer**: Solesta Team
