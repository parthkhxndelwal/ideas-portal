# Fuzzy Match Cache & Record Search

## Overview

The script now has two new features to make data handling easier:

1. **Fuzzy Match Cache** - Remembers your choices for typos/variations in reference IDs
2. **Record Search Tool** - Find records by email, phone, reference ID, or roll number

---

## Feature 1: Fuzzy Match Cache

### How It Works

When the script encounters a reference ID that doesn't exist but finds a similar match (e.g., `SOLS26-A1127` vs `SOL26-A1127`):

**First Run:**

```
⚠️  Reference ID not found: "SOLS26-A1127"
Found similar matches:
  [1] SOL26-A1127 (RASHMEET KAUR BAGGA, KRMU) - Distance: 1
Select match (1-1) or 'n' to skip: 1
```

Your choice is **automatically saved** to `logs/fuzzy-match-cache.json`

**Subsequent Runs:**
The script uses the cached choice automatically - **no more prompts!**

### Cache File

Location: `logs/fuzzy-match-cache.json`

Example:

```json
{
  "SOLS26-A1127": "SOL26-A1127",
  "SOL26-58": "SOL26-5833",
  "SOL26-AB": "SOL26-AB12"
}
```

### Clearing the Cache

To clear all cached matches and re-prompt for fuzzy matches:

```bash
rm logs/fuzzy-match-cache.json
```

Or the script will prompt again if you delete this file.

---

## Feature 2: Record Search Tool

### Command Syntax

```bash
node search-record.js <search-term>
```

### Search By Reference ID

```bash
node search-record.js SOL26-A1127
```

Output:

```
✓ Record found!

  Reference ID:  SOL26-A1127
  Name:          RASHMEET KAUR BAGGA
  Email:         rashmeet@krmu.edu.in
  Roll Number:   2512345678
  Found via:     Reference ID (exact match)
```

### Search By Email

```bash
node search-record.js rashmeet@krmu.edu.in
```

Supports both KRMU and external emails.

### Search By Roll Number

```bash
node search-record.js 2512345678
```

Looks up the registration by 10-digit KRMU roll number.

### Search Results

If found:

- Reference ID
- Name
- Email
- Roll Number
- How the record was found (exact match, cached choice, etc.)

If not found:

- Error message explaining why
- Original search term

### Important Note

**Phone numbers are NOT stored in the database** - they only exist in payment CSV files. To find a record:

- Use **Email** if you have it
- Use **Roll Number** if available (10-digit)
- Use **Reference ID** if known

---

## Use Cases

### Finding a record with corrupted reference ID

You have `SOLS26-A1127` in your CSV but need to know the correct reference ID:

```bash
node search-record.js SOLS26-A1127
```

The fuzzy matcher will find the closest match (`SOL26-A1127`), you select it once, and it's cached forever.

### Validating payment data

Before running the main script, check if all records exist by searching with emails from the CSV:

```bash
node search-record.js rashmeet@gmail.com
node search-record.js contact@example.com
node search-record.js SOL26-A1127
```

### Finding a student by roll number

A student asks "have I been registered?" - search by their roll number:

```bash
node search-record.js 2512345678
```

Get their reference ID, name, and email instantly.

### Data reconciliation

Match payment data emails to registration data:

```bash
# Found email in payment data
node search-record.js rashmeet@gmail.com

# Now you have their correct reference ID and can update CSV
```

The fuzzy matcher will find the closest match (`SOL26-A1127`), you select it once, and it's cached forever.

### Validating payment data

Before running the main script, check if all records exist:

```bash
node search-record.js rashmeet@gmail.com
node search-record.js 2512345678
node search-record.js SOL26-A1127
```

### Finding a student by roll number

A student asks "have I been registered?" - search by their roll number:

```bash
node search-record.js 2512345678
```

Get their reference ID, name, and email instantly.

### Data reconciliation

Match payment data (which might have email addresses) to registration data:

```bash
# Found email in payment data
node search-record.js rashmeet@gmail.com

# Now you have their correct reference ID and can update CSV
```

---

## Technical Details

### Fuzzy Matching Algorithm

- Uses **Levenshtein distance** to find similar reference IDs
- Default threshold: 3 character differences max
- Shows top 5 matches sorted by similarity
- Exact matches skip this step entirely

### Search Order

The search tool tries multiple strategies in order:

1. **Exact Reference ID match** (SOL26-XXXXX)
2. **Exact email match** (case-insensitive)
3. **Phone number lookup**
4. **Roll number lookup** (10-digit → Student → Registration)

Returns as soon as a match is found.

### Cache Structure

- Format: JSON
- Location: `logs/fuzzy-match-cache.json`
- Persists across script runs
- Can be safely deleted anytime
- Auto-recreated on next fuzzy match

---

## Integration with Main Script

The main `qr-approval.js` script now:

1. **Loads cache on startup** - Instant fuzzy match resolution
2. **Saves choices automatically** - No re-prompting
3. **Shows cache status** - Tells you how many cached matches were loaded
4. **Cleans up successful records** - Removes error entries when fixed

### Example Flow

```
✓ Loaded fuzzy match cache (5 entries)

[1/301] SOLS26-A1127 (RASHMEET KAUR BAGGA)...
  Using cached match: SOL26-A1127
  Email: rashmeet@krmu.edu.in (from registration)
  ✓ QR sent successfully
  ✓ Cleaned up previous errors for this record
```

---

## Troubleshooting

### "Record not found" when searching

- Check spelling: Reference IDs are case-insensitive
- Try searching by email or phone instead
- The record might not exist in the database yet

### Fuzzy match cache not working

- Ensure `logs/` directory exists
- Check permissions on `logs/fuzzy-match-cache.json`
- Delete the cache file and try again

### Want different fuzzy match

- Delete the line from `logs/fuzzy-match-cache.json` for that reference ID
- Next run will re-prompt you

---

## Files Changed

| File                         | Change                                             |
| ---------------------------- | -------------------------------------------------- |
| `qr-approval.js`             | Import & initialize cache                          |
| `lib/reference-validator.js` | Check cache before fuzzy matching, save selections |
| `lib/fuzzy-match-cache.js`   | **NEW** - Cache management                         |
| `lib/record-search.js`       | **NEW** - Search utility                           |
| `lib/utils.js`               | Added `normalizePhoneNumber()`                     |
| `search-record.js`           | **NEW** - Standalone CLI tool                      |
