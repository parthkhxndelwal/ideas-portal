# Expo Go Testing Setup - Quick Reference

**Ready to test with Expo Go!** ✅

---

## Step 1: Update Backend URL (if testing locally first)

**File**: `App/services.ts`

For **local development testing**:
```typescript
const API_BASE_URL = 'http://YOUR_MACHINE_IP:3000'
// Example: http://192.168.1.100:3000
```

For **production testing** (after deployment):
```typescript
const API_BASE_URL = 'https://solesta.krmangalam.edu.in'
```

---

## Step 2: Generate API Key

1. Log in to admin dashboard
2. Navigate to Scanner Settings
3. Generate new API key (copy the full key)
4. Save it somewhere safe

---

## Step 3: Start Expo Go

**In App directory**:
```bash
npm start
# or
expo start
```

This will show a QR code in the terminal.

---

## Step 4: Open in Expo Go

1. **Android**: Open Expo Go app → Scan QR code
2. **iOS**: Use Camera app → Scan QR code (will prompt to open Expo Go)

The app will load and connect to your backend.

---

## Step 5: Test Scanner Registration

The app should:
1. Connect to backend successfully
2. Register device with API key
3. Show error if API key is invalid
4. Cache API key locally

---

## Step 6: Generate and Test QR Code

1. Generate a QR code through admin dashboard
2. Scan it with the app
3. App should decrypt and parse the QR code
4. Display registration details

---

## What CORS Configuration Enables

✅ **App can communicate with backend** across origins  
✅ **Preflight requests handled automatically**  
✅ **Custom headers (X-API-Key) supported**  
✅ **Mobile app can authenticate securely**  

---

## Expected Network Flow

```
Expo Go App
    ↓
[Check cached API key]
    ↓
[Send request to backend]
Headers: X-API-Key: scanner_xxxxx
    ↓
Backend (solesta.krmangalam.edu.in)
    ↓
[Validate API key]
    ↓
[Add CORS headers to response]
    ↓
[Return data to app]
    ↓
App displays results
```

---

## Troubleshooting

### "Cannot connect to server"
- ✅ CORS is configured, issue is likely network connectivity
- Check if device can reach the domain/IP
- Try ping from terminal: `ping solesta.krmangalam.edu.in`

### "Invalid API key"
- Verify API key is correct (no spaces)
- Regenerate new API key if needed
- Check API key is still active in admin panel

### "CORS error" (unlikely with our config)
- Verify backend was deployed with CORS changes
- Check that all routes use `withCors()` wrapper
- Try clearing Expo app cache

### "QR code won't decrypt"
- Ensure QR code was generated with AES encryption (new method)
- Check console for decryption errors
- Verify crypto-js library is installed in App

---

## Files Ready for Testing

✅ **Backend CORS**: `solesta/lib/server/cors.ts`  
✅ **Scanner Routes**: All updated with CORS support  
✅ **App Crypto**: Enhanced with AES-256-CBC support  
✅ **App Services**: API key handling implemented  

---

## During Testing

**Monitor these logs**:
1. **Expo Console**: `npm start` terminal output
2. **Backend Logs**: Watch for API requests and CORS headers
3. **Device Console**: Expo Go app debug messages

---

## Success Criteria

✅ App connects to backend  
✅ API key authentication works  
✅ QR code scanning succeeds  
✅ Scan is recorded in database  
✅ No CORS errors in console  
✅ Admin dashboard shows scans  

---

## After Successful Testing

1. Deploy backend to `solesta.krmangalam.edu.in`
2. Update App with production domain
3. Generate QR codes for all registrations
4. Send to users for scanning at event
5. Monitor scanning activity

---

**You're ready to test!** 🚀

Contact support if any CORS issues arise (though they shouldn't with our configuration).
