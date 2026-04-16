# Expo Go Configuration - Ready to Test

**Status**: ✅ **CONFIGURED AND READY**  
**API URL**: https://solesta.krmangalam.edu.in  
**Default Server**: SOLESTA

---

## Configuration Applied

### App/services.ts Updated

**Added Solesta Server**:
```typescript
export const API_SERVERS = {
  ALPHA: 'https://ideas.parth.engineer',
  BETA: 'https://icloudems.tech',
  SOLESTA: 'https://solesta.krmangalam.edu.in',  // ← NEW
} as const;
```

**Set as Default**:
```typescript
// Default server is now SOLESTA
return (server as ServerType) || 'SOLESTA';
```

---

## Quick Start Guide

### Step 1: Prepare Backend

Before testing with Expo Go, make sure:
- [ ] Backend is deployed to https://solesta.krmangalam.edu.in
- [ ] Backend is running and accessible
- [ ] CORS is enabled (already configured)

Test backend is running:
```bash
curl -I https://solesta.krmangalam.edu.in/api/scanner/users \
  -H "X-API-Key: test"
# Should return 401 (invalid key) but with CORS headers
```

### Step 2: Generate API Key

1. Log in to admin dashboard at solesta.krmangalam.edu.in
2. Go to Scanner Settings
3. Generate new API key
4. Copy the full key (e.g., `scanner_XXXXXXX_XXXXX`)

### Step 3: Start Expo Go

In the App directory:
```bash
npm start
# or
expo start
```

You'll see something like:
```
expo-router-http server running on http://localhost:19000
```

### Step 4: Open in Expo Go

**On Android**:
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code from terminal
4. App loads

**On iOS**:
1. Use Camera app
2. Scan the QR code
3. Tap notification to open in Expo Go
4. App loads

### Step 5: Authenticate

When app opens:
1. You'll see a login/setup screen
2. Enter the API key you generated
3. App will register device
4. You're ready to scan!

---

## API Configuration Details

### Default Server
**Now**: SOLESTA (https://solesta.krmangalam.edu.in)

The app will connect to this server by default.

### Change Server (if needed)

In app, if there's a server selection screen:
- ALPHA: https://ideas.parth.engineer
- BETA: https://icloudems.tech
- SOLESTA: https://solesta.krmangalam.edu.in (default)

Or programmatically:
```typescript
import { ServerConfigService } from './services';

// Set to SOLESTA
await ServerConfigService.setSelectedServer('SOLESTA');

// Get current server
const server = await ServerConfigService.getSelectedServer();
console.log(server); // "SOLESTA"

// Get API URL
const url = await ServerConfigService.getApiBaseUrl();
console.log(url); // "https://solesta.krmangalam.edu.in"
```

---

## Expected Behavior

### On App Start
✅ App connects to https://solesta.krmangalam.edu.in  
✅ Requests API key (first time)  
✅ API key is saved locally  
✅ Device is registered with backend  

### On Scan
✅ Scan QR code  
✅ App decrypts QR code (AES-256-CBC)  
✅ Extracts transaction ID  
✅ Sends to backend with API key  
✅ Backend records scan  
✅ Shows result on screen  

### In Background
✅ Periodically syncs registrations from backend  
✅ Caches locally for offline use  
✅ Logs all scans to history  

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Cause**: Backend not running or not accessible

**Solution**:
1. Verify backend is deployed: `curl https://solesta.krmangalam.edu.in/`
2. Verify network connectivity
3. Check backend logs for errors
4. If on local network, verify device can reach server IP

**Check**:
```bash
# From your phone/device on same network
ping solesta.krmangalam.edu.in
```

### Issue: "Invalid API key"

**Cause**: API key is wrong, expired, or inactive

**Solution**:
1. Generate new API key in admin dashboard
2. Copy full key (no spaces)
3. Enter in app
4. Try again

### Issue: "QR code won't scan"

**Cause**: QR code not generated with AES encryption

**Solution**:
1. Ensure QR code is from new backend (using AES)
2. Check QR code is valid and not damaged
3. Try different lighting
4. Check app console for decryption errors

### Issue: "CORS error" (unlikely)

**Cause**: CORS not configured properly (shouldn't happen)

**Solution**:
1. Verify backend was deployed with CORS changes
2. Check CORS headers in response: `curl -v https://solesta.krmangalam.edu.in/api/scanner/users`
3. Verify production domain matches configuration
4. Check browser/app console for exact error

---

## Network Configuration

### Device on Same Network as Backend
```
Device: 192.168.1.100 (example)
Backend: solesta.krmangalam.edu.in

App connects to: https://solesta.krmangalam.edu.in
✅ Works (DNS resolves, HTTPS works)
```

### Device on Different Network
```
Device: On cellular/different WiFi
Backend: solesta.krmangalam.edu.in

App connects to: https://solesta.krmangalam.edu.in
✅ Works (HTTPS and DNS available)
```

### Local Testing (Before Production)

If backend is running locally (not on production):
```typescript
// Temporarily change in services.ts
export const API_SERVERS = {
  SOLESTA_LOCAL: 'http://192.168.1.X:3000',  // Your machine IP
}

// Then set as server
await ServerConfigService.setSelectedServer('SOLESTA_LOCAL');
```

---

## Testing Checklist

- [ ] Backend deployed and running
- [ ] API key generated
- [ ] Expo Go installed on device
- [ ] App starts with Expo Go
- [ ] App connects to backend without errors
- [ ] API key is accepted
- [ ] Device is registered
- [ ] QR code can be scanned
- [ ] Scan result displayed
- [ ] Scan recorded in database

---

## After Successful Testing

1. ✅ App connects to backend
2. ✅ QR scanning works
3. ✅ Scans recorded in database
4. ✅ Admin dashboard shows scans

**Next**: Generate QR codes for all registrations and send to users

---

## Files Modified

- ✅ `App/services.ts` - Added SOLESTA server, set as default

---

## Summary

✅ API URL configured: https://solesta.krmangalam.edu.in  
✅ Default server set to SOLESTA  
✅ Ready for Expo Go testing  
✅ CORS configured on backend  
✅ Mobile app ready to use  

You can now start Expo Go and test immediately! 🚀

---

**Date Updated**: April 16, 2026  
**Status**: ✅ Ready for Testing
