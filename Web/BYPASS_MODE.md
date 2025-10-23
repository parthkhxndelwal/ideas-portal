# QR Entry Scanner - Bypass Mode

## Overview
The bypass mode allows participants to enter multiple times per day, overriding the default one-entry-per-day restriction.

## Configuration

Add this to your `.env.local` file:

```bash
# Allow multiple entries per day (bypass day check)
BYPASS_DAY_CHECK=true
```

Or set to `false` (or leave unset) to enforce one entry per day:

```bash
BYPASS_DAY_CHECK=false
```

## How It Works

### When BYPASS_DAY_CHECK=true:
1. ✅ Users can scan their QR code multiple times per day
2. ⚠️ Orange warning banner displays at top of scanner page: "BYPASS MODE ACTIVE - Multiple entries per day allowed"
3. 📝 Console logs show: "⚠️ BYPASS_DAY_CHECK enabled - allowing multiple entries per day"
4. 📊 All entries are still recorded in the database with timestamps
5. 📈 Statistics continue to count all entries

### When BYPASS_DAY_CHECK=false (or unset):
1. ❌ Users can only enter once per day
2. 🚫 Second scan attempt shows yellow warning: "Already Entered Today"
3. 📝 Console logs show normal entry check behavior
4. ✅ Enforces standard one-entry-per-day policy

## Use Cases

### Enable Bypass Mode For:
- Testing the scanner functionality
- Events with multiple sessions per day
- VIP or special access scenarios
- Debugging entry issues

### Disable Bypass Mode For:
- Standard event operations
- Production environments
- When strict attendance tracking is required
- Security and audit compliance

## Technical Details

### Files Modified:
- `lib/database.ts` - `hasEnteredToday()` accepts `bypassDayCheck` parameter
- `app/api/scanner/entry/route.ts` - Reads `BYPASS_DAY_CHECK` env variable
- `app/api/scanner/bypass-status/route.ts` - New API to check bypass status
- `app/scanner/iks-ybpm/page.tsx` - Displays bypass warning banner

### API Behavior:
```javascript
// With bypass enabled
BYPASS_DAY_CHECK=true
// Result: hasEnteredToday() always returns false → entry allowed

// With bypass disabled  
BYPASS_DAY_CHECK=false
// Result: hasEnteredToday() checks database → entry allowed only once per day
```

## Security Considerations

⚠️ **WARNING**: Enabling bypass mode disables a critical security feature!

- Only enable in controlled environments
- Monitor all entries when bypass is active
- Disable immediately after testing
- Review audit logs for unusual activity
- Consider temporary time-based bypass instead of permanent

## Monitoring

### Check Current Status:
1. Look for orange banner on scanner page
2. Check server console logs for "BYPASS_DAY_CHECK enabled" message
3. API endpoint: `GET /api/scanner/bypass-status` returns `{ bypassEnabled: true/false }`

### Database Impact:
```javascript
// All entries are recorded regardless of bypass mode
db.entries.find({ rollNumber: "22BCS001" })

// Result shows all entries with timestamps
[
  { rollNumber: "22BCS001", entryTimestamp: "2025-10-22T10:00:00Z", ... },
  { rollNumber: "22BCS001", entryTimestamp: "2025-10-22T14:30:00Z", ... },
  { rollNumber: "22BCS001", entryTimestamp: "2025-10-22T18:45:00Z", ... }
]
```

## Troubleshooting

### Bypass mode not working?
1. Check `.env.local` file exists in root directory
2. Verify exact spelling: `BYPASS_DAY_CHECK=true`
3. Restart the Next.js dev/production server
4. Check server logs for the bypass message

### Bypass mode won't disable?
1. Set `BYPASS_DAY_CHECK=false` in `.env.local`
2. Restart the server
3. Hard refresh browser (Ctrl+Shift+R)
4. Verify orange banner is gone

### Users still can't enter twice?
1. Verify server has been restarted after env change
2. Check server console for "BYPASS_DAY_CHECK enabled" message
3. Test with different user to rule out other issues
4. Check API response for `alreadyEntered` flag

## Example Scenarios

### Scenario 1: Event with Morning and Evening Sessions
```bash
# Enable bypass for multi-session event
BYPASS_DAY_CHECK=true
```
Result: Participants can scan in for both sessions

### Scenario 2: Standard Single-Entry Event
```bash
# Disable bypass for standard event
BYPASS_DAY_CHECK=false
```
Result: Participants can only enter once

### Scenario 3: Testing Before Event
```bash
# Enable bypass for testing
BYPASS_DAY_CHECK=true

# Test multiple scans
# ... testing complete ...

# Disable before event starts
BYPASS_DAY_CHECK=false
# Restart server
```

## Best Practices

1. **Default to Disabled**: Always keep bypass disabled unless specifically needed
2. **Document Usage**: Log when and why bypass mode was enabled
3. **Time-Limited**: Enable only for specific time periods
4. **Communicate**: Inform team when bypass is active
5. **Monitor Closely**: Watch entry logs during bypass periods
6. **Post-Event Review**: Analyze all entries after event
7. **Clear .env**: Remove or comment out after use

## Quick Commands

```bash
# Enable bypass
echo "BYPASS_DAY_CHECK=true" >> .env.local
npm run dev  # or restart production server

# Disable bypass
echo "BYPASS_DAY_CHECK=false" >> .env.local
npm run dev  # or restart production server

# Check current entries
node scripts/check-entries.js  # if such script exists
```
