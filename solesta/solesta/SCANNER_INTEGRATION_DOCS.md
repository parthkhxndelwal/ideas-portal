# Scanner Integration Documentation

## Overview

This document describes the integration between the Solesta Scanner Application (Entry Scanning App) and the Solesta Web Application backend. The system allows registrants of Solesta to be verified through QR code scanning during event entry.

## Architecture

### Components

1. **Solesta Web Application** - Main registration and ticket management system
2. **Scanner Application (App/)** - Mobile app for scanning QR codes and verifying entries
3. **Scanner Backend API** - New endpoints in Solesta for scanner operations

### Data Flow

```
Scanner Device
    ↓
Scanner App (React Native/Expo)
    ↓
Scanner API Endpoints (Solesta Backend)
    ↓
MongoDB Database (Registrations with scanned status)
```

## Database Schema Changes

### Registration Model Updates

Added three new fields to the `Registration` model in `prisma/schema.prisma`:

```prisma
scanned              Boolean       @default(false) @map("scanned")
scannedAt            DateTime?     @map("scanned_at")
scannedBy            String?       @map("scanned_by")
```

- **scanned**: Boolean flag indicating if the registration has been scanned
- **scannedAt**: Timestamp of when the scan occurred
- **scannedBy**: Device ID of the scanner that performed the scan

## API Endpoints

### 1. Get Users (Registrations)

**Endpoint:** `GET /api/scanner/users`

**Headers:**
- `x-api-key`: Required API key for authentication

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "registration_id",
      "transactionId": "SOL26-XXXXX",
      "name": "John Doe",
      "email": "john@example.com",
      "rollNumber": "BR123",
      "courseAndSemester": "B.Tech - Year 2",
      "year": "2",
      "isKrmu": true,
      "isFresher": false,
      "scanned": false,
      "scannedAt": null,
      "scannedBy": null
    }
  ],
  "lastUpdated": "2026-04-16T10:00:00Z",
  "totalCount": 150
}
```

**Purpose:** Fetches all eligible (fee-paid) registrations for the scanner device to cache locally.

---

### 2. Record Entry (Scan)

**Endpoint:** `POST /api/scanner/record-entry`

**Headers:**
- `x-api-key`: Required API key for authentication
- `Content-Type`: application/json

**Request Body:**
```json
{
  "transactionId": "SOL26-XXXXX",
  "rollNumber": "BR123",
  "name": "John Doe",
  "qrType": "participant",
  "deviceId": "device_1710345600000_abc123",
  "deviceName": "Scanner Device 1"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Entry recorded successfully",
  "data": {
    "id": "registration_id",
    "referenceId": "SOL26-XXXXX",
    "name": "John Doe",
    "rollNumber": "BR123",
    "scannedAt": "2026-04-16T10:15:00Z",
    "scannedBy": "device_1710345600000_abc123"
  }
}
```

**Response (Already Scanned):**
```json
{
  "success": false,
  "message": "This registration has already been scanned",
  "alreadyScanned": true,
  "scannedAt": "2026-04-16T09:30:00Z",
  "scannedBy": "device_1710345600000_abc123"
}
```

**Purpose:** Records a successful scan/entry for a registrant.

---

### 3. Register Device

**Endpoint:** `POST /api/scanner/register-device`

**Headers:**
- `x-api-key`: Required API key for authentication
- `Content-Type`: application/json

**Request Body:**
```json
{
  "deviceId": "device_1710345600000_abc123",
  "deviceName": "Scanner Device 1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "deviceId": "device_1710345600000_abc123",
    "deviceName": "Scanner Device 1",
    "registeredAt": "2026-04-16T10:00:00Z"
  }
}
```

**Purpose:** Registers a scanner device with the backend for tracking.

---

## Admin API Endpoints

### 1. Manage Scanner API Keys

**Endpoint:** `GET/POST /api/admin/scanner/api-keys`

**GET - List API Keys**
```bash
curl -X GET "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..."
```

**POST - Generate New API Key**
```bash
curl -X POST "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Field Scanner Device 1", "action": "generate"}'
```

**Response:**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "apiKey": "scanner_1710345600000_abc123def456",
  "name": "Field Scanner Device 1"
}
```

**POST - Deactivate API Key**
```bash
curl -X POST "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -H "Content-Type: application/json" \
  -d '{"keyId": "key_id_here", "action": "deactivate"}'
```

---

### 2. Scanner Statistics

**Endpoint:** `GET /api/admin/scanner/statistics`

**Query Parameters:**
- `filter`: "all" | "scanned" | "not-scanned" (default: "all")
- `limit`: Number of records (default: 100)
- `skip`: Pagination offset (default: 0)

**Request:**
```bash
curl -X GET "https://solesta.com/api/admin/scanner/statistics?filter=all&limit=100" \
  -H "Cookie: admin_session=..."
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "registration_id",
      "referenceId": "SOL26-XXXXX",
      "name": "John Doe",
      "email": "john@example.com",
      "rollNumber": "BR123",
      "scanned": true,
      "scannedAt": "2026-04-16T10:15:00Z",
      "scannedBy": "device_1710345600000_abc123"
    }
  ],
  "stats": {
    "totalPaid": 150,
    "totalScanned": 45,
    "totalNotScanned": 105,
    "scanPercentage": "30.00"
  },
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0
  }
}
```

---

## Authentication

### API Key Management

The scanner system uses API key-based authentication:

1. **Master Key**: For initial setup (stored in `SCANNER_MASTER_KEY` env variable)
2. **Generated Keys**: Individual keys for each scanner device

#### Generating Scanner Keys

1. Access the admin dashboard
2. Navigate to Scanner Management → API Keys
3. Click "Generate New Key"
4. Enter a descriptive name (e.g., "Field Scanner Device 1")
5. Copy the generated key and store securely
6. Provide the key to the scanner app configuration

#### Key Security

- Never commit keys to version control
- Rotate keys periodically
- Deactivate unused keys
- Monitor key usage via the admin panel

---

## Scanner App Configuration

### Initial Setup

1. **Start Scanner App**: Launch the Solesta Scanner mobile app
2. **Configure Server**: 
   - Select appropriate server (Alpha/Beta)
   - Or manually enter server URL
3. **Enter API Key**: 
   - Input the generated API key
   - This is stored securely in app storage
4. **Register Device**: 
   - App automatically registers with the backend
   - Device ID is generated locally

### Workflow

1. **Sync Data**: App downloads all eligible registrations from backend
2. **Cache Locally**: Data stored offline for scanning without internet
3. **Scan QR**: Use device camera to scan QR codes
4. **Local Recording**: Scans recorded locally first
5. **Sync Results**: When connection available, upload scan results to backend

---

## Technical Implementation

### Scanner App Services (App/services.ts)

#### DeviceService
- `getApiKey()` - Retrieve stored API key
- `setApiKey(key)` - Store API key securely
- `registerDevice()` - Register device with backend

#### ApiService
- `downloadRegistrationData()` - Fetch users for scanning
- `recordEntry()` - Submit scan results
- `getScanUpdates()` - Retrieve scan updates

### Solesta Backend Services (solesta/lib/server/scanner-auth.ts)

- `validateScannerApiKey()` - Verify API key authenticity
- `generateScannerApiKey()` - Create new scanner keys
- `deactivateScannerApiKey()` - Disable scanner keys

---

## Workflow Examples

### Example 1: Download and Cache Registrations

```typescript
// Scanner App
const response = await ApiService.downloadRegistrationData();
if (response.success) {
  await StorageService.saveUserCache(response.data.users);
  console.log(`Cached ${response.data.totalCount} registrations`);
}
```

### Example 2: Record a Scan

```typescript
// Scanner App
const scanResult = await ApiService.recordEntry({
  transactionId: 'SOL26-XXXXX',
  rollNumber: 'BR123',
  name: 'John Doe',
  qrType: 'participant',
  deviceId: 'device_id',
  deviceName: 'Field Scanner 1',
});

if (scanResult.success) {
  console.log('Entry recorded successfully');
} else if (scanResult.alreadyScanned) {
  console.log(`Already scanned at ${scanResult.scannedAt}`);
}
```

### Example 3: Generate API Key (Admin)

```bash
# Using curl
curl -X POST "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Field Scanner Device 1",
    "action": "generate"
  }'
```

---

## Environment Variables

Add these to your `.env` file:

```env
# Scanner Master Key (for setup)
SCANNER_MASTER_KEY=scanner_master_key_solesta26
```

---

## Monitoring & Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify key hasn't been deactivated
   - Check key formatting
   - Regenerate if necessary

2. **Registration Not Found**
   - Ensure registration exists and is paid
   - Check transaction ID format (SOL26-XXXXX)
   - Verify data is synced

3. **Already Scanned Error**
   - This is expected behavior - prevents duplicate scans
   - Can be tracked in scan history locally

### Monitoring

- View scan statistics from admin dashboard
- Track API key usage and last accessed timestamps
- Monitor failed scan attempts
- Generate reports on scan coverage

---

## Future Enhancements

1. **Batch Scanning**: Support for multiple simultaneous scanners
2. **Offline Sync**: Enhanced offline capability with conflict resolution
3. **Geo-tagging**: Track scan locations for verification
4. **QR Type Validation**: Enforce participant/volunteer restrictions
5. **Advanced Analytics**: Detailed scanning patterns and hotspots
6. **Mobile Notifications**: Real-time notifications for scan events
7. **Webhook Events**: Push scan events to external systems

---

## Support

For issues or questions:
1. Check this documentation
2. Review API error messages
3. Check admin dashboard statistics
4. Contact system administrators

