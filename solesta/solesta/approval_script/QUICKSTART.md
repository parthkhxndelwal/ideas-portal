# Quick Start Guide - Solesta QR Approval Script

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd D:\ideas-portal\solesta\solesta\approval_script
npm install
```

**What it installs:**

- `@prisma/client` - Database ORM
- `csv-parser` - CSV file parsing
- `qrcode` - QR code generation
- `nodemailer` - Email sending
- `string-similarity` - Fuzzy matching

### 2. Prepare CSV Files

Place exactly **2 CSV files** in the `approval_script/` folder:

- One containing **external student** payment records (₹700)
- One containing **internal (KRMU) student** payment records (₹500)

**From Paytm exports, ensure these columns exist:**

- `Name` / `Your Reference ID` / `Email ID`
- `Registration Fee.Registration Fee payment amount`
- `Product Code` or similar

### 3. Run the Script

```bash
npm start
```

Or directly:

```bash
node qr-approval.js
```

## What Happens

```
✓ Configuration validated
✓ Found 2 CSV files
  • External: 25 records
  • Internal: 276 records

[TEST EMAIL]
Sending test email to: 2301350013@krmu.edu.in
[Press ENTER when received, or wait for timeout]
✓ Confirmed

[BATCH PROCESSING]
✓ SOL26-E0380 (Bhoomi)... Email sent ✓
✓ SOL26-AD622 (Sneha)... Email sent ✓
⊘ SOL26-C1234 (John)... Already processed, skipped
✗ SOL26-XYZ (Bad ID)... Reference ID not found

[SUMMARY]
Total:      301
Successful: 298
Failed:     3
Skipped:    2

✓ Processing complete!
```

## Key Features

### 1. **Smart Reference ID Matching**

- If exact match not found, shows similar IDs
- User can select correct ID or skip
- Example:
  ```
  Reference ID not found: "SOL26-E1F2"
  Found similar matches:
    [1] SOL26-E1F3 (John Doe, KRMU)
    [2] SOL26-E1F2 (Jane Smith, External)
  Select (1-2) or 'n': 2
  ```

### 2. **Already Processed Detection**

- Records with `feePaid: true` are automatically skipped
- Run script multiple times safely without duplicates

### 3. **Email Priority**

- **KRMU Students**: App email → Payment email → Derived @krmu.edu.in
- **External**: App email → Payment email

### 4. **Test Email Validation**

- Sends test QR to `2301350013@krmu.edu.in` first
- Wait for confirmation (or auto-proceed after 30 sec)
- If test fails, entire batch is aborted
- Prevents mass email failures

### 5. **Comprehensive Error Logging**

- All failures saved to: `logs/errors.csv`
- Session transcript: `logs/2026-04-14_15-30-45.log`

## Output Files

After running successfully:

```
approval_script/
├── logs/
│   ├── errors.csv                    ← Failed records
│   └── 2026-04-14_15-30-45.log       ← Session log
├── data/
│   └── processed.json                ← Tracking (optional)
├── 202604149805600198_1.csv          ← Input (External)
└── 202604149805700187_1.csv          ← Input (Internal)
```

## Checking Results

### View Successful Records

Check the database directly:

```javascript
db.registrations.find({ qrSentEmail: true, feePaid: true }).count()
```

### View Failed Records

Open `logs/errors.csv`:

```
timestamp, reference_id, name, email, student_type, error_type, error_message
2026-04-14T15:30:45.123Z, SOL26-XYZ, BadID, bad@email, EXTERNAL, NOT_FOUND, "Reference ID not found"
```

### Check Session Log

Open `logs/2026-04-14_15-30-45.log` for detailed transcript

## Common Issues

### ❌ "No CSV files found"

**Fix:** Ensure 2 CSV files are in the `approval_script/` folder

### ❌ "Test email failed"

**Fix:**

1. Check `.env` in `solesta_bot/` folder has SMTP credentials
2. Verify email address is correct
3. Test manually: `node -e "require('./lib/email-sender.js').testSmtpConnection()"`

### ❌ "Reference ID not found"

**Fix:**

1. Use fuzzy match option (select from suggestions)
2. Check reference ID in database
3. Verify data wasn't already processed

### ❌ "Email resolution failed"

**Fix:**

1. Ensure email exists in payment CSV
2. Or email is in user's app registration
3. For KRMU students, ensure valid roll number (@krmu.edu.in)

## Next Steps

### After Successful QR Send

1. **Tell users about QR:**
   - Use `/resendall` command on bot to send QR via Telegram too
   - Users can retrieve tickets by scanning QR at event

2. **Monitor:**
   - Check `logs/errors.csv` for any failures
   - Manually process failed records if needed

3. **Event Day:**
   - QR codes are ready to scan at entry point
   - Bot's QR format ensures compatibility with scanner app

## Support Commands

### Check Database Connection

```bash
node -e "require('./config.js').prisma.\$queryRaw\`SELECT 1\`"
```

### Test Email Only

```bash
node -e "require('./lib/email-sender.js').sendTestEmail('test@example.com')"
```

### View First 10 Errors

```bash
head -n 11 logs/errors.csv
```

---

**Ready to run?** → `npm start`
