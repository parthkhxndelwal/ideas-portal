# Scanner React Native API - Implementation Summary

## Overview
A complete offline-first QR scanner API built for the Ideas Portal event registration system. Designed for minimal internet usage with batch processing, delta sync, and conflict resolution.

## API Endpoints Created

### 1. `/api/scanner-react/devices/register` (POST)
- **Purpose:** Register new scanner devices
- **Auth:** None required
- **Returns:** Device credentials (deviceId, token, config)
- **File:** `app/api/scanner-react/devices/register/route.ts`

### 2. `/api/scanner-react/registrations` (GET)
- **Purpose:** Download participant registrations for offline validation
- **Auth:** Bearer token (scanner device)
- **Features:** Delta sync support, configurable limits
- **File:** `app/api/scanner-react/registrations/route.ts`

### 3. `/api/scanner-react/scans/batch` (POST)
- **Purpose:** Upload batches of scanned entries
- **Auth:** Bearer token (scanner device)
- **Features:** Idempotency, conflict detection, validation
- **Max Batch Size:** 100 entries
- **File:** `app/api/scanner-react/scans/batch/route.ts`

### 4. `/api/scanner-react/updates` (GET)
- **Purpose:** Fetch server-side updates for conflict resolution
- **Auth:** Bearer token (scanner device)
- **Returns:** Lightweight entry updates from other devices
- **File:** `app/api/scanner-react/updates/route.ts`

## Database Models Added

### ScannerDevice
```typescript
{
  _id?: string
  deviceId: string          // Unique device identifier
  name: string              // Device name
  location: string          // Physical location
  appVersion: string        // App version
  token: string             // JWT auth token
  isActive: boolean         // Device status
  createdAt: Date
  updatedAt: Date
}
```

### ScanRecord
```typescript
{
  _id?: string
  scanId: string            // Client-generated unique ID (for idempotency)
  deviceId: string          // Device that made the scan
  rollNumber: string
  name: string
  qrType: "participant" | "volunteer"
  transactionId?: string
  entryDate: Date
  entryTimestamp: Date
  scannedBy: string
  status: "accepted" | "conflict" | "rejected"
  reason?: string
  appliedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

## Database Methods Added

### Scanner Device Management
- `createScannerDevice()` - Register new device
- `findScannerDevice()` - Find by deviceId
- `findScannerDeviceByToken()` - Find by JWT token
- `updateScannerDevice()` - Update device info

### Registration Sync
- `getConfirmedRegistrations()` - Fetch confirmed participants with delta sync support

### Scan Record Management
- `createScanRecord()` - Create scan with idempotency
- `findScanRecord()` - Find by scanId
- `updateScanRecord()` - Update scan status

### Entry Management (Extended)
- `getEntryUpdates()` - Fetch updates for conflict resolution
- `findEntryByRollNumberAndDate()` - Check for duplicate entries
- `getScanStatistics()` - Get device scan statistics

## Key Features

### 1. Offline-First Architecture
- Client downloads all registrations
- Validates QR codes locally
- Queues scans for batch upload
- No internet required during scanning

### 2. Idempotency
- Client generates unique `scanId` for each scan
- Server checks for duplicate submissions
- Safe retry on network failures
- Guarantees exactly-once processing

### 3. Conflict Resolution
- Detects duplicate entries (same roll number, same date)
- Returns detailed conflict information
- `/updates` endpoint for cross-device sync
- Status codes: accepted, conflict, rejected

### 4. Delta Sync
- Uses `since` timestamps for efficient sync
- Only transfers changed data
- Reduces bandwidth usage
- Keeps clients up-to-date

### 5. Comprehensive Validation
- User existence check
- Registration status verification
- Payment completion check
- Blacklist validation
- QR type validation

### 6. Security
- JWT-based authentication
- Device activation/deactivation
- Token verification on every request
- Cryptographically secure device IDs

## Workflow

```
┌─────────────────┐
│   App Install   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /devices/  │
│    register     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store deviceId  │
│   and token     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GET /registra-  │
│   tions (full)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store locally  │
│  (SQLite/Realm) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Offline Scan   │◄───┐
│   & Validate    │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│  Queue scans    │    │
│  (status:       │    │
│   pending)      │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│  Every N mins   │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│ POST /scans/    │    │
│     batch       │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│ Update local    │    │
│  scan status    │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│ GET /updates    │    │
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────┐    │
│ GET /registra-  │    │
│  tions (delta)  │    │
└────────┬────────┘    │
         │             │
         └─────────────┘
```

## File Structure

```
app/api/scanner-react/
├── README.md                    # API documentation
├── middleware.ts                # Auth helper functions
├── devices/
│   └── register/
│       └── route.ts            # Device registration endpoint
├── registrations/
│   └── route.ts                # Fetch registrations endpoint
├── scans/
│   └── batch/
│       └── route.ts            # Batch upload endpoint
└── updates/
    └── route.ts                # Fetch updates endpoint

lib/
├── models.ts                   # Added ScannerDevice & ScanRecord models
└── database.ts                 # Added scanner-specific methods

scripts/
└── test-scanner-api.js         # API test suite
```

## Response Formats

### Success Response
```json
{
  "lastSyncAt": "2025-10-22T10:30:00.000Z",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### Batch Results
```json
{
  "processedAt": "2025-10-22T10:30:00.000Z",
  "results": [
    {
      "entryId": "LOCAL_SCAN_001",
      "status": "accepted|conflict|rejected",
      "reason": "Optional reason for conflict/rejection",
      "appliedAt": "2025-10-22T10:30:00.000Z"
    }
  ]
}
```

## Testing

Run the test suite:
```bash
node scripts/test-scanner-api.js
```

Tests cover:
- ✅ Device registration
- ✅ Fetch registrations
- ✅ Batch upload
- ✅ Fetch updates
- ✅ Unauthorized access

## Recommended Database Indexes

```javascript
db.scannerDevices.createIndex({ "deviceId": 1 }, { unique: true })
db.scannerDevices.createIndex({ "token": 1 })
db.scanRecords.createIndex({ "scanId": 1 }, { unique: true })
db.scanRecords.createIndex({ "deviceId": 1 })
db.scanRecords.createIndex({ "rollNumber": 1, "entryDate": 1 })
db.entries.createIndex({ "rollNumber": 1, "entryDate": 1 })
db.entries.createIndex({ "entryTimestamp": 1 })
```

## Performance Considerations

- **Lightweight Responses:** Minimal data transfer
- **Delta Sync:** Only fetch changes since last sync
- **Batch Processing:** Up to 100 entries per request
- **Indexed Queries:** Fast database lookups
- **Offline Validation:** No server calls during scanning
- **Configurable Sync:** Client controls sync frequency

## Security Measures

- JWT tokens with 7-day expiration
- Device activation/deactivation support
- Token verification on every protected endpoint
- Secure random device ID generation (crypto.randomBytes)
- Device ownership validation (deviceId must match token)

## Next Steps for Mobile App

1. **Install Dependencies:**
   ```bash
   # React Native
   npm install @react-native-async-storage/async-storage
   npm install react-native-qrcode-scanner
   npm install realm  # or expo-sqlite
   ```

2. **Implement Local Storage:**
   - Store device credentials securely
   - Cache registrations in SQLite/Realm
   - Queue pending scans

3. **Implement QR Scanner:**
   - Scan QR codes
   - Validate against local cache
   - Create scan records with unique IDs

4. **Implement Sync Manager:**
   - Background sync every N minutes
   - Batch upload pending scans
   - Fetch updates and new registrations
   - Handle network failures gracefully

5. **UI Components:**
   - Device registration screen
   - Scanner camera view
   - Scan history list
   - Sync status indicator
   - Conflict resolution UI

## Support

For issues or questions, refer to:
- API Documentation: `app/api/scanner-react/README.md`
- Database Models: `lib/models.ts`
- Test Suite: `scripts/test-scanner-api.js`
