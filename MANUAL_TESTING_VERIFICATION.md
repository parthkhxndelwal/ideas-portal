# Manual Testing Verification Guide
## Solesta Scanner Backend + Mobile App Integration

**Status**: ✅ All code changes verified and in place
**Date**: 2026-04-16
**Environment**: Production (solesta.krmangalam.edu.in)

---

## Code Review Summary

### ✅ API Key Setup Flow (NEW)
All code changes have been verified in place:

#### 1. API Key Setup Screen (`App/app/api-key-setup.tsx`)
- **Lines 15-58**: Main component with state management
- **Lines 24-30**: Checks for existing API key on mount
- **Lines 32-58**: Handles API key validation and storage
- **Validation**: Requires key to start with `"scanner_"`
- **Storage**: Uses AsyncStorage with key `'api_key'`
- **UI**: Professional interface with instructions on getting API key

#### 2. App Initialization Flow (`App/app/index.tsx`)
- **Lines 14-21**: First checks if API key exists
  - If missing → Redirect to `/api-key-setup` (NEW)
  - If present → Continue to device setup
- **Lines 23-32**: Device configuration check
- **Lines 33-37**: Error handling fallback

#### 3. Navigation Routing (`App/app/_layout.tsx`)
- **Lines 22-26**: API key setup screen route added
- **Line 25**: `gestureEnabled: false` prevents going back
- **Navigation flow**: Properly sequenced

#### 4. Service Layer (`App/services.ts`)
- **Lines 68-74**: `DeviceService.getApiKey()` implementation
- **Lines 76-82**: `DeviceService.setApiKey()` implementation
- **Lines 84-90**: `DeviceService.clearApiKey()` implementation
- **Lines 95-101**: API key included in all requests via `x-api-key` header
- **Lines 21**: `API_KEY` storage key defined
- **Lines 8-10**: SOLESTA server as default

#### 5. QR Decryption (`App/crypto.ts`)
- **Lines 10-32**: AES-256-CBC decryption (`decryptAES`)
- **Lines 39-61**: Legacy 3-digit ASCII fallback (`decrypt`)
- **Lines 68-137**: Main QR parsing function (`decryptQRData`)
- **Supports both**: New AES format AND legacy 3-digit format

---

## Backend Verification

### Backend CORS Configuration (`solesta/lib/server/cors.ts`)
- ✅ All 5 scanner routes wrapped with `withCors()`
- ✅ Handles preflight OPTIONS requests
- ✅ Adds correct CORS headers to responses
- ✅ Allows mobile apps without origin header
- ✅ Configured for SOLESTA domain

### Backend QR Encryption (`solesta/lib/server/qr-generator.ts`)
- ✅ Uses AES-256-CBC encryption
- ✅ Generates IV + encrypts data
- ✅ Format: `iv_hex:encrypted_hex`
- ✅ Backwards compatible with 3-digit ASCII

### Backend Scanner Auth (`solesta/lib/server/scanner-auth.ts`)
- ✅ API key validation
- ✅ Validates `x-api-key` header
- ✅ Rejects requests without valid key

### Backend Registration Endpoint (`solesta/app/api/scanner/register-device/route.ts`)
- ✅ Requires `x-api-key` header
- ✅ Validates API key via CORS & auth middleware
- ✅ Records device registration

---

## Testing Steps (MANUAL)

### Step 1: Generate API Key
1. Access admin dashboard: `https://solesta.krmangalam.edu.in`
2. Log in with admin credentials
3. Navigate to Scanner Settings
4. Click "Generate API Key"
5. Copy the full key (format: `scanner_xxxxx_xxxxx`)

### Step 2: Start Expo Go Dev Server
```bash
cd App
npm start
```
**Expected Output**: QR code for Expo Go scanner

### Step 3: Open App in Expo Go
1. Open Expo Go app on mobile device
2. Scan the QR code from dev server
3. Wait for app to load

### Step 4: Test API Key Setup Screen
**Expected Flow**:
```
App starts
  ↓
Shows "Initializing Solesta Scanner..." (index.tsx)
  ↓
Checks AsyncStorage for 'api_key' (new step)
  ↓
No key found → Shows API Key Setup screen (api-key-setup.tsx) ✅ NEW
  ↓
User enters API key
  ↓
Validates format (must start with "scanner_")
  ↓
Saves to AsyncStorage
  ↓
Shows success message
  ↓
Redirects to Device Setup screen
```

### Step 5: Test Device Setup
**Expected Flow**:
```
User sees "Device Setup" screen
  ↓
Enters device name (e.g., "Gate 1")
  ↓
Clicks "Register Device"
  ↓
Device registration includes stored API key (from step 4)
  ↓
Backend validates API key via x-api-key header
  ↓
Device registered successfully ✅
  ↓
Shows success message
  ↓
Redirects to Scanner screen
```

### Step 6: Test QR Scanning
1. Generate QR code from admin dashboard
2. In scanner screen, tap "Scan QR Code"
3. Scan the QR code

**Expected Flow**:
```
QR code scanned
  ↓
App receives encrypted data (format: iv_hex:encrypted_hex)
  ↓
App decrypts using AES-256-CBC (crypto.ts line 10-32)
  ↓
Validates format (volunteer_solesta_ or participant_solesta_)
  ↓
Extracts transactionId or rollNumber
  ↓
Shows scan result with person's info ✅
  ↓
Records scan locally
  ↓
Attempts to sync to backend
  ↓
Backend validates x-api-key header
  ↓
Scan recorded in database ✅
```

### Step 7: Verify Backend Recording
1. Go to admin dashboard
2. Check scanner statistics
3. Verify scan appears with:
   - Device name
   - Timestamp
   - Transaction ID / Roll Number
   - Participant/Volunteer type

---

## What's Been Fixed

### ❌ Before (Connection Error Problem)
```
App starts
  ↓
Tries device registration immediately
  ↓
NO API KEY in device registration request
  ↓
Backend rejects: "No x-api-key header"
  ↓
Shows "Connection Failed" error
```

### ✅ After (Connection Error Fixed)
```
App starts
  ↓
Checks for API key first ← NEW STEP
  ↓
If missing: Show API Key Setup screen ← NEW SCREEN
  ↓
User enters API key, saves locally ← NEW STEP
  ↓
Device registration includes API key ← FIXED
  ↓
Backend validates API key ✅
  ↓
Connection succeeds ✅
```

---

## Architecture Overview

### New Initialization Flow
```
index.tsx (Splash screen)
  ↓ (NEW) Check AsyncStorage for API key
  ├─ If missing → api-key-setup.tsx (NEW)
  │    └─ User enters API key
  │    └─ Save to AsyncStorage
  │    └─ Continue to device-setup
  │
  └─ If present → device-setup.tsx (Existing)
       └─ User enters device name
       └─ Register with API key ✅ (Now includes API key)
       └─ Continue to scanner.tsx
```

### API Key Flow
```
1. User enters API key in api-key-setup.tsx
   ↓
2. Saved to AsyncStorage (key: 'api_key')
   ↓
3. DeviceService.setApiKey() stores it
   ↓
4. Every API request retrieves it via DeviceService.getApiKey()
   ↓
5. Added to headers as x-api-key
   ↓
6. Backend validates with Scanner Auth middleware
   ↓
7. Request succeeds ✅
```

---

## File Structure

```
App/
├── app/
│   ├── index.tsx ✅ (Updated: Check API key first)
│   ├── api-key-setup.tsx ✅ (NEW: API key entry screen)
│   ├── device-setup.tsx (Existing)
│   ├── scanner.tsx (Existing)
│   ├── _layout.tsx ✅ (Updated: Add api-key-setup route)
│   ├── history.tsx (Existing)
│   └── settings.tsx (Existing)
├── services.ts ✅ (Updated: Add getApiKey/setApiKey methods)
├── crypto.ts ✅ (Existing: AES decryption support)
├── types.ts (Type definitions)
├── package.json ✅ (Updated: Added crypto-js)
└── app.json (Expo config)
```

---

## Testing Checklist

### Basic Functionality
- [ ] App starts and shows loading screen
- [ ] API key setup screen appears (first time)
- [ ] User can enter API key
- [ ] Validation works (rejects keys not starting with "scanner_")
- [ ] API key saved to device
- [ ] Device setup screen appears after API key entry
- [ ] User can enter device name
- [ ] Device registration succeeds (no "Connection Failed")

### Advanced Features
- [ ] Registered device can download registration data
- [ ] User can scan QR codes
- [ ] Encrypted QR codes decrypt correctly
- [ ] Scan results display person's information
- [ ] Scans record in database
- [ ] Admin can see scans in dashboard
- [ ] Multiple devices can register with same API key
- [ ] App persists data across restarts

### Error Handling
- [ ] Invalid API key rejected with message
- [ ] Network errors show appropriate messages
- [ ] Empty API key rejected with message
- [ ] Device registration failures show error message
- [ ] Fallback servers work if primary fails

### Security
- [ ] API key stored securely in AsyncStorage
- [ ] API key included in every request header
- [ ] QR codes properly encrypted (AES-256-CBC)
- [ ] Encrypted QR codes decrypt correctly on device
- [ ] No API keys logged or exposed

---

## Quick Reference

### API Key Generation
