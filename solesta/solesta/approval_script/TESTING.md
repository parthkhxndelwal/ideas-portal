# Testing & Validation Guide

## Pre-Execution Checklist

### ✓ Environment Setup

- [ ] Node.js 18+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Both CSV files in `approval_script/` folder
- [ ] Exactly 2 CSV files (not 1, not 3+)

### ✓ Configuration

- [ ] `.env` exists in `solesta_bot/` folder
- [ ] `DATABASE_URL` set (MongoDB connection)
- [ ] `SMTP_USER` set (email address)
- [ ] `SMTP_PASS` set (email password)
- [ ] `QR_ENCRYPTION_KEY` set (encryption key)

### ✓ Database

- [ ] MongoDB connection working: `mongosh <connection_string>`
- [ ] `registrations` collection exists with sample data
- [ ] At least one reference ID in DB matches CSV data

### ✓ Email

- [ ] Office365 credentials work in bot's email service
- [ ] SMTP port 587 accessible
- [ ] Test address `2301350013@krmu.edu.in` is accessible

---

## Test Scenarios

### Scenario 1: Successful Processing

**Goal:** Verify happy path works end-to-end

**Setup:**

1. Create test CSV with 3 records:
   - 1 KRMU student with valid email
   - 1 External student with valid email
   - 1 student with incomplete data (will error)

2. Ensure all valid reference IDs exist in MongoDB

**Expected Output:**

```
✓ Configuration validated
✓ Found 2 CSV files
✓ Test email sent
✓ Processing record 1... ✓ QR sent
✓ Processing record 2... ✓ QR sent
✓ Processing record 3... ✗ Validation failed
[SUMMARY]
Total:      3
Successful: 2
Failed:     1
```

**Verification:**

- [ ] `logs/[timestamp].log` created with session details
- [ ] `logs/errors.csv` has 1 error entry
- [ ] 2 registrations marked `feePaid: true` in DB
- [ ] 2 registrations have QR code stored

---

### Scenario 2: Fuzzy Matching

**Goal:** Verify reference ID fuzzy matching works

**Setup:**

1. Database has: `SOL26-E0380`
2. CSV has typo: `SOL26-E038O` (letter O instead of zero)

**Expected Output:**

```
Processing SOL26-E038O (John)...
⚠️ Reference ID not found: "SOL26-E038O"
Found similar matches:
  [1] SOL26-E0380 (John Doe, EXTERNAL)
Select (1-1) or 'n': 1
✓ Using SOL26-E0380
Processing... ✓ QR sent
```

**Verification:**

- [ ] Fuzzy match dialog appears
- [ ] User can select correct ID
- [ ] Record processes with selected ID
- [ ] Session log shows "FUZZY" match type

---

### Scenario 3: Already Processed Records

**Goal:** Verify duplicate prevention works

**Setup:**

1. Database has record with `feePaid: true` and `qrSentEmail: true`
2. Same reference ID in CSV

**Expected Output:**

```
Processing SOL26-AD622 (Sneha Joshi)...
⊘ Skipped (already processed with QR)
```

**Verification:**

- [ ] Record silently skipped
- [ ] No error logged
- [ ] Not counted in "Failed"
- [ ] Counted in "Skipped"

---

### Scenario 4: Email Resolution Priority

**Goal:** Verify email fallback priority works correctly

**Test Case A: KRMU - App Email Available**

- Registration email: `valid@personal.com` ✓
- CSV email: `old@personal.com`
- Expected: Use `valid@personal.com`

**Test Case B: KRMU - CSV Email Available**

- Registration email: empty
- CSV email: `payment@personal.com` ✓
- Expected: Use `payment@personal.com`

**Test Case C: KRMU - Derived Email**

- Registration email: empty
- CSV email: invalid
- Roll number: `2301350013` ✓
- Expected: Derive `2301350013@krmu.edu.in`

**Test Case D: External - App Email Available**

- Registration email: `user@personal.com` ✓
- CSV email: `old@email.com`
- Expected: Use `user@personal.com`

**Verification:**

- [ ] Session log shows email source
- [ ] Email delivered to correct address
- [ ] Fallback order respected

---

### Scenario 5: QR Encryption Compatibility

**Goal:** Verify QR format matches bot's format

**Setup:**

1. Generate QR with script
2. Compare with bot-generated QR

**Expected:**

- Same encryption format: `iv_hex:encrypted_hex`
- Same raw data format: `refId:rollNumber:refId`
- Same QR code image dimensions
- Bot can decrypt script's QR and vice versa

**Test Code:**

```javascript
// In bot's context
const { decryptQR } = require("./src/utils/crypto")
const scriptQrEncrypted = "iv_hex:encrypted_hex"
const decrypted = decryptQR(scriptQrEncrypted)
// Should output: SOL26-XXXXX:2301350013:SOL26-XXXXX
```

**Verification:**

- [ ] Decryption successful
- [ ] Raw data matches expected format
- [ ] No encryption errors

---

### Scenario 6: Test Email Phase

**Goal:** Verify test email blocks batch processing on failure

**Test A: Successful Test Email**

```
[TEST EMAIL]
Sending test email to: 2301350013@krmu.edu.in
✓ Test email sent successfully
Waiting for confirmation (30 seconds)...
[Press ENTER when received]

[Auto-proceed after 30 sec or manual ENTER]
✓ Proceeding with batch...
```

**Test B: Failed Test Email**

```
[TEST EMAIL]
Sending test email to: 2301350013@krmu.edu.in
✗ Test email failed: SMTP connection refused
Aborting batch processing
```

**Verification:**

- [ ] Test email sent before batch starts
- [ ] Batch processing waits for confirmation
- [ ] Timeout works (30 seconds)
- [ ] Failures abort batch (no partial processing)

---

### Scenario 7: Error Logging

**Goal:** Verify all errors properly categorized and logged

**Test Various Error Types:**

1. **ALREADY_PROCESSED**
   - CSV: Valid record with `feePaid: true`
   - Expected: Skipped silently

2. **INVALID_REFID_EXACT**
   - CSV: `SOL26-XXXXX` (doesn't exist)
   - Expected: "Reference ID not found"

3. **INVALID_REFID_FUZZY**
   - CSV: `SOL26-XXXXX` (typo exists)
   - User: Select 'n' to reject
   - Expected: "User rejected fuzzy matches"

4. **MISSING_EMAIL**
   - DB: Empty email
   - CSV: Invalid email
   - Expected: "No valid email found"

5. **FEE_MISMATCH**
   - CSV Fee: ₹700 (external)
   - DB Expected: ₹500 (KRMU)
   - Expected: "Fee mismatch"

6. **QR_GEN_FAILED** (simulate)
   - Corrupt encryption key in .env
   - Expected: "QR generation failed"

**Verification:**

- [ ] errors.csv has all 6 entries
- [ ] Correct error_type for each
- [ ] Error messages are descriptive
- [ ] raw_data field populated

---

### Scenario 8: Performance & Scalability

**Goal:** Verify script handles realistic data volume

**Test with Data Volume:**

- [ ] 10 records: ~10 seconds
- [ ] 100 records: ~1 minute
- [ ] 300 records: ~5 minutes
- [ ] No memory leaks after completion

**Monitoring:**

```bash
# Monitor during run
node --inspect qr-approval.js
# Then use Chrome DevTools
```

---

## Integration Tests

### Test 1: Bot/Script Compatibility

**Goal:** Verify bot can work with script-generated QR codes

**Steps:**

1. Run script, generate QRs
2. In bot's context, call: `decryptQR(scriptQREncrypted)`
3. Verify output matches format

**Expected:**

- Decryption succeeds
- Format: `SOL26-XXXXX:2301350013:SOL26-XXXXX`

---

### Test 2: Database Consistency

**Goal:** Verify DB updates persist correctly

**Before:**

```javascript
db.registrations.findOne({ referenceId: "SOL26-E0380" })
// { feePaid: false, qrCode: null }
```

**Run script**

**After:**

```javascript
db.registrations.findOne({ referenceId: "SOL26-E0380" })
// { feePaid: true, qrCode: "base64_png", qrSentEmail: true, paymentDate: <date> }
```

---

### Test 3: Email Delivery

**Goal:** Verify emails actually arrive

**Steps:**

1. Run script
2. Check mailbox of test email
3. Verify QR image attached/embedded

**Expected:**

- Email arrives within 5 seconds
- HTML formatting correct
- QR image displays properly
- Reference ID visible

---

## Manual Testing Commands

### Check Database Connection

```bash
node -e "
require('dotenv').config({ path: '../solesta_bot/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.registration.count();
  console.log('Total registrations:', count);
  await prisma.\$disconnect();
})();
"
```

### Test SMTP Connection

```bash
node -e "
const lib = require('./lib/email-sender.js');
lib.testSmtpConnection().then(result => {
  console.log('SMTP test:', result ? 'PASSED' : 'FAILED');
  process.exit(result ? 0 : 1);
});
"
```

### Parse Single CSV File

```bash
node -e "
const lib = require('./lib/csv-processor.js');
lib.parseCsvFile('./202604149805600198_1.csv').then(records => {
  console.log('Parsed records:', records.length);
  console.log('First record:', records[0]);
});
"
```

### Test QR Generation

```bash
node -e "
const lib = require('./lib/qr-generator.js');
lib.generateQRForRegistration('SOL26-TEST', '2301350013').then(qr => {
  console.log('QR Generated:', qr.encryptedData.length, 'bytes');
  console.log('Raw data:', qr.rawData);
});
"
```

### Test Email Resolution

```bash
node -e "
const lib = require('./lib/email-resolver.js');
const csvRecord = { email: 'payment@email.com' };
const dbRecord = { email: 'app@email.com', rollNumber: '2301350013', isKrmu: true };
lib.resolveKrmuEmail(csvRecord, dbRecord).then(result => {
  console.log('Resolved email:', result.email, 'from', result.source);
});
"
```

---

## Performance Baseline

| Operation               | Expected Time | Notes                 |
| ----------------------- | ------------- | --------------------- |
| CSV Parse (300 records) | <1 sec        | In-memory             |
| DB Lookup (1 record)    | <100ms        | MongoDB query         |
| Fuzzy Match (1 record)  | <500ms        | Levenshtein distance  |
| QR Generation (1)       | <1 sec        | Crypto + PNG encode   |
| Email Send (1)          | <2 sec        | SMTP roundtrip        |
| **Total (300 records)** | **~10 min**   | Sequential processing |

---

## Troubleshooting Guide

### Script Won't Start

```bash
# Check Node version
node --version  # Should be 18+

# Check syntax
node -c qr-approval.js

# Check file permissions
ls -l qr-approval.js

# Check dependencies installed
npm list

# Try installing again
npm install
```

### CSV Not Found

```bash
# Check folder
ls -la ./

# Verify exactly 2 files
ls -la *.csv

# Check filenames
file *.csv  # Should be "ASCII text"
```

### Database Connection Failed

```bash
# Check connection string
echo $DATABASE_URL

# Test MongoDB connection
mongosh $DATABASE_URL

# Check Prisma
npx prisma db pull  # Should succeed
```

### Email Send Failed

```bash
# Test SMTP
telnet smtp.office365.com 587

# Check credentials
echo "SMTP_USER=$SMTP_USER"
echo "SMTP_PASS length=$(echo -n $SMTP_PASS | wc -c)"

# Verify email in .env
grep "SMTP_USER" ../solesta_bot/.env
```

### Reference ID Not Found

```bash
# Search database
db.registrations.find({ referenceId: "SOL26-XXXXX" })

# Check all IDs
db.registrations.distinct("referenceId")

# Count
db.registrations.count()
```

---

## Final Validation Checklist

Before going to production:

- [ ] All syntax checks pass: `node -c qr-approval.js`
- [ ] Database connection verified
- [ ] SMTP connection verified
- [ ] Test email successfully sent/received
- [ ] Sample CSV processed without errors
- [ ] QR codes generated correctly
- [ ] Database updates visible
- [ ] Error logging working
- [ ] Already-processed detection working
- [ ] Fuzzy matching interactive selection working
- [ ] Email resolution prioritization verified
- [ ] Session logs created
- [ ] No hardcoded secrets in code
- [ ] Ready for production use

---

**Last Updated**: April 2026
