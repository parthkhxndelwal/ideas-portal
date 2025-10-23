# Scanner React Native API

This API is designed for the React Native QR scanner application with offline-first capabilities and minimal internet usage.

## Base URL
```
/api/scanner-react/*
```

## Authentication
All endpoints (except device registration) require Bearer token authentication:
```
Authorization: Bearer <device_token>
```

## Endpoints

### 1. Device Registration
**POST** `/api/scanner-react/devices/register`

Register a new scanner device and receive credentials.

**Request Body:**
```json
{
  "name": "Scanner Device 1",
  "location": "Main Entrance",
  "appVersion": "1.0.0"
}
```

**Response (200):**
```json
{
  "deviceId": "DEVICE_abc123...",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "syncIntervalSeconds": 300,
  "maxBatchSize": 100
}
```

**Notes:**
- No authentication required
- Store the `deviceId` and `token` securely on the device
- Use the token for all subsequent API calls

---

### 2. Fetch Registrations
**GET** `/api/scanner-react/registrations?since=<timestamp>&limit=<number>`

Download participant registrations for offline validation.

**Query Parameters:**
- `since` (optional): ISO 8601 timestamp. Returns only registrations updated after this time.
- `limit` (optional): Maximum number of results (1-1000). Default: all records.

**Response (200):**
```json
{
  "lastSyncAt": "2025-10-22T10:30:00.000Z",
  "registrations": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "student@example.com",
      "role": "participant",
      "isEmailVerified": true,
      "rollNumber": "2021BCS001",
      "name": "John Doe",
      "courseAndSemester": "B.Tech CSE - 7",
      "year": "4th Year",
      "registrationStatus": "confirmed",
      "transactionId": "TXN1234567890",
      "paymentStatus": "completed",
      "createdAt": "2025-10-20T10:00:00.000Z",
      "updatedAt": "2025-10-21T15:30:00.000Z"
    }
  ]
}
```

**Notes:**
- Only returns confirmed participants with completed payments
- First call (no `since`): Download all registrations
- Subsequent calls: Use `lastSyncAt` from previous response as `since` parameter for delta sync
- Store registrations locally for offline QR validation

---

### 3. Upload Batch Scans
**POST** `/api/scanner-react/scans/batch`

Upload a batch of scanned entries to the server.

**Request Body:**
```json
{
  "deviceId": "DEVICE_abc123...",
  "entries": [
    {
      "_id": "LOCAL_SCAN_001",
      "rollNumber": "2021BCS001",
      "name": "John Doe",
      "qrType": "participant",
      "transactionId": "TXN1234567890",
      "entryDate": "2025-10-22",
      "entryTimestamp": "2025-10-22T14:30:00.000Z",
      "scannedBy": "DEVICE_abc123...",
      "createdAt": "2025-10-22T14:30:00.000Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "processedAt": "2025-10-22T14:35:00.000Z",
  "results": [
    {
      "entryId": "LOCAL_SCAN_001",
      "status": "accepted",
      "appliedAt": "2025-10-22T14:35:00.000Z"
    },
    {
      "entryId": "LOCAL_SCAN_002",
      "status": "conflict",
      "reason": "Entry already exists for this date (scanned by: DEVICE_xyz456...)"
    },
    {
      "entryId": "LOCAL_SCAN_003",
      "status": "rejected",
      "reason": "Roll number is blacklisted"
    }
  ]
}
```

**Entry Status:**
- `accepted`: Entry successfully recorded
- `conflict`: Entry already exists (duplicate scan)
- `rejected`: Entry rejected (invalid user, blacklisted, payment pending, etc.)

**Notes:**
- Maximum batch size: 100 entries
- Use client-generated unique `_id` for each scan to ensure idempotency
- Server validates each entry and returns per-entry results
- Mark local scans as synced/conflict based on response status

---

### 4. Fetch Updates
**GET** `/api/scanner-react/updates?since=<timestamp>`

Fetch server-side entry updates for conflict resolution.

**Query Parameters:**
- `since` (required): ISO 8601 timestamp. Returns entries created after this time.

**Response (200):**
```json
{
  "lastSyncAt": "2025-10-22T15:00:00.000Z",
  "entryUpdates": [
    {
      "rollNumber": "2021BCS001",
      "lastSeen": "2025-10-22T14:30:00.000Z",
      "sourceDeviceId": "DEVICE_xyz456..."
    }
  ]
}
```

**Notes:**
- Use this endpoint to detect entries made by other devices
- Call periodically to update local cache and avoid conflicts
- Excludes entries from the requesting device
- Use `lastSyncAt` as the next `since` parameter

---

## Typical App Flow

1. **Initial Setup:**
   ```
   POST /devices/register
   → Store deviceId and token
   ```

2. **First Sync:**
   ```
   GET /registrations (no since parameter)
   → Download all confirmed registrations
   → Store locally in SQLite/Realm
   ```

3. **Offline Scanning:**
   - User scans QR codes
   - App validates against local registration data
   - Creates local scan records with status: `pending`
   - No internet required

4. **Periodic Sync (every N minutes):**
   ```
   POST /scans/batch
   → Upload all pending scans
   → Update local scan status based on server response
   
   GET /updates?since=<lastSyncAt>
   → Pull entry updates from other devices
   → Update local cache to prevent conflicts
   
   GET /registrations?since=<lastSyncAt>
   → Fetch new/updated registrations
   → Merge with local data
   ```

---

## Error Handling

**401 Unauthorized:**
```json
{
  "error": "Unauthorized - Invalid or inactive device token"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required fields: name, location, appVersion"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to process batch scans"
}
```

---

## Database Collections

### scannerDevices
Stores registered scanner devices.

### scanRecords
Stores all scan attempts with idempotency support using `scanId`.

### entries
Stores accepted entry records (successful scans).

---

## Security Features

- JWT-based authentication
- Device activation/deactivation support
- Token verification on every request
- Unique device IDs using cryptographically secure random bytes
- Idempotency using client-generated scan IDs

---

## Performance Optimization

- Delta sync using `since` timestamps
- Lightweight responses (minimal data transfer)
- Batch processing (max 100 entries per batch)
- Indexed database queries on `scanId`, `deviceId`, `rollNumber`, and `entryDate`
- Client-side caching for offline operation

---

## Best Practices

1. **Store credentials securely:** Use device keychain/secure storage for token
2. **Implement retry logic:** Handle network failures gracefully
3. **Validate offline:** Check QR against local data before creating scan records
4. **Generate unique scan IDs:** Use UUID/nanoid for client-side scan IDs
5. **Handle conflicts:** Update local UI when server returns conflict status
6. **Sync regularly:** Balance between freshness and network usage
7. **Log errors:** Track failed syncs for troubleshooting

---

## Testing

### Test Device Registration
```bash
curl -X POST http://localhost:3000/api/scanner-react/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device",
    "location": "Test Location",
    "appVersion": "1.0.0"
  }'
```

### Test Fetch Registrations
```bash
curl -X GET "http://localhost:3000/api/scanner-react/registrations" \
  -H "Authorization: Bearer <your_token>"
```

### Test Batch Upload
```bash
curl -X POST http://localhost:3000/api/scanner-react/scans/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "deviceId": "DEVICE_abc123...",
    "entries": [...]
  }'
```

### Test Updates
```bash
curl -X GET "http://localhost:3000/api/scanner-react/updates?since=2025-10-22T00:00:00.000Z" \
  -H "Authorization: Bearer <your_token>"
```

---

## Database Indexes (Recommended)

For optimal performance, create these indexes:

```javascript
// MongoDB indexes
db.scannerDevices.createIndex({ "deviceId": 1 }, { unique: true })
db.scannerDevices.createIndex({ "token": 1 })
db.scanRecords.createIndex({ "scanId": 1 }, { unique: true })
db.scanRecords.createIndex({ "deviceId": 1 })
db.scanRecords.createIndex({ "rollNumber": 1, "entryDate": 1 })
db.entries.createIndex({ "rollNumber": 1, "entryDate": 1 })
db.entries.createIndex({ "entryTimestamp": 1 })
db.users.createIndex({ "rollNumber": 1 })
db.users.createIndex({ "updatedAt": 1 })
```
