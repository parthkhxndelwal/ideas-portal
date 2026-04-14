# Error Analysis - Latest Run (09:48 UTC)

## Run Summary
- **Total Records:** 301
- **Skipped (Already Processed):** 273 (90.7%)
- **Successful:** 2 (0.7%)
- **Failed:** 26 (8.6%)

## Important Observation
273 records were skipped because they were already processed in the first run! This means:
- The `feePaid` flag is working correctly (duplicate prevention ✓)
- Only 28 new records were processed
- Of these 28: 2 succeeded, 26 failed

---

## Error Breakdown (26 Total Failures)

### ALL 26 ERRORS ARE NOT_FOUND
**Pattern:** All errors are missing reference IDs not found in the database

**Root Cause:** These reference IDs literally don't exist in the `registrations` table

---

## Detailed Error Categories

### Category 1: Incomplete SOL26 IDs (6 errors)
Missing the full 5-character suffix:

| Original | Normalized | Issue |
|----------|-----------|-------|
| SOL26-58 | SOL26-58 | Incomplete (needs 5 chars, has 2) |
| SOL26-05 | SOL26-05 | Incomplete (needs 5 chars, has 2) |
| SOL26-09 | SOL26-09 | Incomplete (needs 5 chars, has 2) |
| SOL26-E9 | SOL26-E9 | Incomplete (needs 5 chars, has 1) |
| SOL26-AB | SOL26-AB | Incomplete (needs 5 chars, has 2) |
| SOL26-93 | SOL26-93 | Incomplete (needs 5 chars, has 2) |

**Impact:** These will never match valid IDs (SOL26 format requires exactly 5 chars)
**Fix:** Likely data entry errors in CSV - need to verify correct full reference IDs

---

### Category 2: Phone/Roll Numbers (9 errors)
KRMU student IDs (10 digits starting with specific years):

| Original | Normalized | Type |
|----------|-----------|------|
| 2515130041 | 2515130041 | Roll number (10 digits) |
| 2105140008 | 2105140008 | Roll number (10 digits) |
| 2105170051 | 2105170051 | Roll number (10 digits) |
| 2308213006 | 2308213006 | Roll number (10 digits) |
| 2505170008 | 2505170008 | Roll number (10 digits) |
| 2502450009 | 2502450009 | Roll number (10 digits, from 2502450009@krmu.edu.in) |
| 2503220012 | 2503220012 | Roll number (10 digits, from 2503220012@krmu.edu.in) |
| 2501350070 | 2501350070 | Roll number (10 digits) |
| 2402203089 | 2402203089 | Roll number (10 digits) |

**Issue:** These are KRMU roll numbers, not reference IDs
**Why Not Converted:** Phone-to-email conversion only works if input starts with `2` AND is in CSV phone column. These appear to be in the reference ID column instead.
**Current Behavior:** They're treated as reference IDs and fail lookup
**Possible Solution:** 
- These might be internal KRMU students with roll numbers instead of reference IDs
- Could look them up in the `Student` table instead
- Or they're data entry errors - roll numbers mixed with reference IDs

---

### Category 3: Email Addresses (3 errors)
Emails used instead of reference IDs:

| Original | Normalized | Issue |
|----------|-----------|-------|
| Tanishkumar8thd35@gmail.com | TANISHKUMAR8THD35GMAILCOM | Full email used as ref ID |
| Chanchallohia7@gmail.com | CHANCHALLOHIA7GMAILCOM | Full email used as ref ID |
| Sainimanoj5108@gmail.com | SAINIMANOJ5108GMAILCOM | Full email used as ref ID |

**Issue:** Emails are valid contact info but not reference IDs
**Current Behavior:** Normalizes to uppercase, tries lookup, fails
**Possible Solution:** These records might need manual correction - use email to find correct reference ID

---

### Category 4: Truncated/Malformed SOL26 IDs (2 errors)
Partial or corrupted reference IDs:

| Original | Normalized | Issue |
|----------|-----------|-------|
| 70FB7 | 70FB7 | Only 5 chars, missing SOL26- prefix |
| S0L26-3997D | S0L26-3997D | Has "zero" (0) instead of "O" in SOL26 |

**Issue:** 
- `70FB7` might be the suffix only, needs `SOL26-` prefix
- `S0L26-3997D` has wrong character (zero instead of letter O)
**Possible Solution:** Apply fuzzy matching (script attempts this via user prompt)

---

### Category 5: Text-Wrapped IDs (2 errors)
IDs wrapped in text/emoji:

| Original | Normalized | Issue |
|----------|-----------|-------|
| 📝 Your Reference ID: SOL26-4C | YOURREFERENCEIDSOL26-4C | Pattern extraction didn't work for short ID |
| 📝 Your Reference ID: SOL26-BF | YOURREFERENCEIDSOL26-BF | Pattern extraction didn't work for short ID |

**Issue:** 
- Pattern extraction worked (`SOL26-*` extracted)
- BUT these are incomplete IDs (need 5 chars after dash)
- Normalized version `SOL26-4C` only has 2 chars after dash
**Current Behavior:** Pattern extraction failed because regex looks for `SOL26-[A-Z0-9]{5}` (exactly 5 chars)
**Why Extraction Failed:** The regex pattern `SOL26-[A-Z0-9]{5}` requires EXACTLY 5 characters after the dash

---

### Category 6: Email-formatted Roll Numbers (3 errors)
Roll numbers with @krmu.edu.in domain appended:

| Original | Normalized | Issue |
|----------|-----------|-------|
| 2105170028@krmu.edu.in | 2105170028KRMUEDUIN | Roll number with email domain |
| 2402206004@krmu.edu.in | 2402206004KRMUEDUIN | Roll number with email domain |
| 2502450009@krmu.edu.in | 2502450009KRMUEDUIN | Roll number with email domain |

**Issue:** Mixed format - roll number with email domain tacked on
**Current Behavior:** Normalized to alphanumeric, doesn't match any reference ID pattern
**Possible Solution:** Strip `@krmu.edu.in` and treat as roll number

---

## Root Cause Summary

| Category | Count | Root Cause | Solution |
|----------|-------|-----------|----------|
| Incomplete SOL26 IDs | 6 | CSV data entry error | Verify correct full IDs |
| Phone/Roll Numbers | 9 | CSV has roll number instead of ref ID | Look up in Student table OR data fix |
| Email Addresses | 3 | Email used as reference ID | Find correct ref ID from email |
| Malformed IDs | 2 | Character substitution/truncation | Fuzzy match (user rejected) |
| Text-Wrapped Short IDs | 2 | Extraction pattern too strict | Extract any SOL26 pattern |
| Email-formatted Roll Numbers | 3 | Mixed format in CSV | Strip domain and lookup as roll number |

---

## Why Only 2 Succeeded?

The 2 successful records were likely:
- Valid SOL26 reference IDs that exist in the database
- Valid email addresses for sending
- Passed all validation checks

The 273 skipped records already had `feePaid=true` from the first run, so they were not re-processed.

---

## Recommended Actions

### Immediate (To catch remaining records):
1. **Improve short ID handling** - Modify pattern extraction to match SOL26 with 2+ chars after dash
2. **Handle roll numbers in ref ID column** - Detect 10-digit patterns starting with 2, look up in Student table
3. **Strip email domains** - Remove @krmu.edu.in and lookup remaining number

### Long-term (Data quality):
1. Verify CSV source - why are incomplete IDs, roll numbers, and emails mixed in reference ID column?
2. Database sync - ensure all registrations in payment file exist in database
3. Pre-validation - add CSV validation before processing

---

## Code Changes Needed

### 1. Improve Pattern Extraction (lib/utils.js)
```javascript
// Current: looks for SOL26-[A-Z0-9]{5} (exactly 5 chars)
// Needed: look for SOL26-[A-Z0-9]{2,5} (2-5 chars) or ANY SOL26 pattern
```

### 2. Handle Roll Numbers (lib/reference-validator.js)
```javascript
// If 10-digit pattern detected starting with 2:
// - Strip @krmu.edu.in if present
// - Look up in Student table first
// - Then fall back to fuzzy matching
```

### 3. Email to Reference ID (lib/email-resolver.js)
```javascript
// If reference ID is an email:
// - Log as data quality issue
// - Try to find registration by email
// - Use fuzzy matching as fallback
```

