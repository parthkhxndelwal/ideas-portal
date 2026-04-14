# QR Resend Script

## Overview

The resend script allows you to **resend QR codes to all registrations that have already been approved and had their QR generated**.

This is useful for:

- **Re-sending to users who didn't receive the original email**
- **Fixing email delivery issues**
- **Testing email deliverability**
- **Batch resending to specific student types (KRMU or External)**

---

## Usage

```bash
node resend-qr.js
```

### Interactive Options

The script will ask:

1. **Confirmation**: Confirm the number of registrations to resend to
2. **Student Type Filter**: Choose to resend to:
   - `all` - All approved registrations (default)
   - `krmu` - Only KRMU students
   - `external` - Only external students

### Example Run

```
╔════════════════════════════════════════════════════════════╗
║  SOLESTA '26 - QR RESEND SCRIPT                           ║
║  Resend QR Codes to Approved Registrations                ║
╚════════════════════════════════════════════════════════════╝

[INITIALIZATION]
✓ Error logging initialized

[FETCHING REGISTRATIONS]
✓ Found 273 registrations to resend
  • KRMU: 150
  • External: 123

[CONFIRMATION]
About to resend QR codes to 273 registrations.
Continue? (yes/no): yes

[OPTIONS]
Resend to all, KRMU only, or External only? (all/krmu/external): all
Resending to all: 273 registrations

[BATCH RESENDING]
[1/273] SOL26-A1127 (Rashmeet)...
  ✓ QR resent successfully

[2/273] SOL26-E0380 (Bhoomi)...
  ✓ QR resent successfully

...

[SUMMARY]
════════════════════════════════════════════════════════════
Total Registrations:  273
Resend Successful:    271
Resend Failed:        2
════════════════════════════════════════════════════════════

[FAILED RESENDS]
  • SOL26-XXXX1 (John): EMAIL_FAILED - Invalid email format
  • SOL26-XXXX2 (Jane): EMAIL_FAILED - Connection timeout

✓ Resend complete!

Session Log: logs/2026-04-14_12-30-45-123.log
```

---

## What Gets Resent

The script queries for registrations where:

- ✅ `feePaid: true` (Payment has been approved)
- ✅ `qrCode` is not null (QR has been generated)

Each resend includes:

- **Name**: From registration record
- **Email**: From registration record
- **Reference ID**: SOL26-XXXXX format
- **QR Code**: The original generated QR (as attachment)

---

## Features

### ✅ Email Fallback

If the primary email fails, the script tries the user's profile email automatically:

```
[1/300] SOL26-A1127 (Rashmeet)...
  ✗ Email send failed: [error]
  ⚠ Retrying with user email: rashmeet@example.com
  ✓ QR resent successfully (to alternate email)
```

### ✅ Student Type Filtering

Resend only to KRMU students:

```
Resend to all, KRMU only, or External only? (all/krmu/external): krmu
Filtering to KRMU only: 150 registrations
```

Or only to external students:

```
Resend to all, KRMU only, or External only? (all/krmu/external): external
Filtering to External only: 123 registrations
```

### ✅ Detailed Logging

- **Session log**: Full details of each resend attempt
- **Error tracking**: Failed resends with reasons
- **Summary report**: Overall statistics

---

## Error Handling

| Error              | Meaning                                | Action                        |
| ------------------ | -------------------------------------- | ----------------------------- |
| `NO_QR_CODE`       | QR not generated for this registration | Skip (shouldn't happen)       |
| `EMAIL_FAILED`     | Email sending failed                   | Try alternate email, then log |
| `UNEXPECTED_ERROR` | Unexpected system error                | Log error and continue        |

### Failed Resends Log

Failed resends are saved with:

- Reference ID
- Name
- Email attempted
- Reason for failure
- Error message (if any)

Logged to: `logs/[timestamp].log`

---

## Common Scenarios

### Scenario 1: Resend to Everyone

```bash
node resend-qr.js
# Confirm: yes
# Filter: all
```

All 273+ registrations get their QR resent.

### Scenario 2: Resend Only to KRMU Students

```bash
node resend-qr.js
# Confirm: yes
# Filter: krmu
```

Only KRMU students (with feePaid=true and qrCode generated) receive resend.

### Scenario 3: Resend Only to External Students

```bash
node resend-qr.js
# Confirm: yes
# Filter: external
```

Only external students receive resend.

### Scenario 4: Test Resend to Small Group

Use the search tool first to verify emails:

```bash
node search-record.js SOL26-A1127
```

Then resend:

```bash
node resend-qr.js
# The registration will be included automatically
```

---

## Database Requirements

The script requires registrations to have:

- `referenceId` - SOL26-XXXXX format
- `name` - Participant name
- `email` - Email address
- `isKrmu` - Boolean (student type)
- `qrCode` - Base64 data URL of QR image
- `feePaid: true` - Payment approved flag

If a registration is missing `qrCode`, it will be skipped with `NO_QR_CODE` status.

---

## Limitations

- **Only resends existing QRs**: Cannot generate new QRs (use main approval script for that)
- **Respects feePaid flag**: Only resends to approved payments
- **No date filtering**: Resends to all matching registrations (add filter if needed)

---

## Output Files

| File                   | Contents                                 |
| ---------------------- | ---------------------------------------- |
| `logs/errors.csv`      | Cumulative error log with failed resends |
| `logs/[timestamp].log` | Session log with detailed resend info    |

---

## Tips

1. **Dry run first**: Run with a small group to test before full resend
2. **Check email logs**: Review `errors.csv` after resend to see failures
3. **Use filters**: Resend to KRMU or External separately if needed
4. **Verify registrations**: Use search tool before resending to specific users
5. **Monitor session log**: Check `logs/[timestamp].log` for detailed output

---

## Technical Details

### Query Used

```javascript
prisma.registration.findMany({
  where: {
    feePaid: true,
    qrCode: { not: null },
  },
  include: { user: true },
  orderBy: { createdAt: "desc" },
})
```

### Email Format

Same as main approval script:

- ✅ Participant name in greeting
- ✅ QR code as attachment
- ✅ Reference ID displayed
- ✅ Professional HTML template

### Attachment Handling

QR codes are embedded as:

- **Filename**: `qr-ticket.png`
- **Content ID**: `cid:qr-image@solesta26`
- **Format**: PNG image from base64 data

Works across all email clients (Gmail, Outlook, Apple Mail, etc.)
