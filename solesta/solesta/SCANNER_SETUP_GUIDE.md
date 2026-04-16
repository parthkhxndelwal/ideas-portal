# Scanner Application Setup Guide

## Quick Start

This guide covers setting up the Entry Scanning Application to work with the Solesta backend.

## Prerequisites

- React Native/Expo development environment
- Solesta backend running (Next.js)
- Admin access to Solesta dashboard
- Internet connection for initial setup

## Step 1: Generate Scanner API Key

### Via Admin Dashboard

1. Login to Solesta admin panel
2. Navigate to **Scanner Management** → **API Keys**
3. Click **Generate New Key**
4. Enter a device name (e.g., "Scanner Device 1")
5. Copy the generated key (format: `scanner_XXXX_YYYY`)
6. Store securely (this will not be shown again)

### Via API (cURL)

```bash
curl -X POST "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=your_session_cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Field Scanner Device 1",
    "action": "generate"
  }'
```

Response:
```json
{
  "success": true,
  "apiKey": "scanner_1710345600000_abc123",
  "name": "Field Scanner Device 1"
}
```

## Step 2: Configure Scanner App

### Environment Setup

1. Clone the Scanner App repository
```bash
cd App/
npm install
```

2. The app is pre-configured to use:
   - **Alpha Server**: `https://ideas.parth.engineer`
   - **Beta Server**: `https://icloudems.tech`

You can change the default server by selecting in the app UI.

### First Run Configuration

1. **Launch the app**
```bash
npm start
# or
expo start
```

2. **Initial Setup Screen**:
   - The app will prompt for API key on first run
   - Enter the API key you generated in Step 1
   - Select server (Alpha or Beta)
   - Device name will be auto-generated

3. **Device Registration**:
   - App automatically registers device with backend
   - Check admin dashboard to confirm registration

## Step 3: Download and Cache Data

### Auto-Sync

The app automatically syncs registration data:
- **On app start**: Downloads latest registrations
- **Manual refresh**: Pull-to-refresh in the app
- **Scheduled**: Every 30 minutes (configurable)

### Manual Sync via API

```bash
# Download all registrations (requires API key)
curl -X GET "https://solesta.com/api/scanner/users" \
  -H "x-api-key: scanner_1710345600000_abc123"
```

Response includes all paid registrations with scan status.

## Step 4: Start Scanning

### Scanning Workflow

1. **Open App**: Launch the scanner application
2. **Select Event**: Choose the event from dashboard
3. **Scan QR Code**: Point camera at registration QR code
4. **Confirmation**: App confirms successful scan or shows error
5. **Results**: View scan in history and sync when ready

### Scan States

- **Pending**: Scan recorded locally, waiting to sync
- **Synced**: Scan uploaded to backend successfully
- **Failed**: Scan upload failed, will retry

### Offline Capability

- Scan QR codes even without internet connection
- All scans are stored locally
- Automatically syncs when connection resumes
- Duplicate scan prevention (local cache)

## Step 5: Monitor Scanning Progress

### Via Admin Dashboard

1. Login to Solesta admin panel
2. Navigate to **Scanner Management** → **Statistics**
3. View:
   - Total registrations: 150
   - Total scanned: 45
   - Total pending: 105
   - Scan percentage: 30%

### Via API

```bash
curl -X GET "https://solesta.com/api/admin/scanner/statistics?filter=all&limit=100" \
  -H "Cookie: admin_session=your_session_cookie"
```

## Configuration Files

### App Configuration (App/services.ts)

```typescript
// Modify server endpoints
export const API_SERVERS = {
  ALPHA: 'https://ideas.parth.engineer',
  BETA: 'https://icloudems.tech',
};

// Change cache size
const REGISTRATION_CACHE_SIZE = 10000; // max registrations

// Adjust sync interval
const AUTO_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
```

### Solesta Configuration (solesta/.env)

```env
# Scanner master key (for emergency setup)
SCANNER_MASTER_KEY=scanner_master_key_solesta26

# Database (already configured)
DATABASE_URL=...

# Other settings
OTP_EXPIRY_MINUTES=5
```

## API Key Management

### View All Keys

```bash
curl -X GET "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=your_session_cookie"
```

### Deactivate Key

```bash
curl -X POST "https://solesta.com/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=your_session_cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "keyId": "key_id_from_list",
    "action": "deactivate"
  }'
```

### Key Rotation

When rotating keys:
1. Generate new key
2. Update app with new key
3. Verify app connects successfully
4. Deactivate old key
5. Monitor for any connection issues

## Troubleshooting

### App Won't Connect

**Problem**: "Failed to connect to server"

**Solutions**:
1. Check internet connection
2. Verify API key is correct
3. Check if server is running
4. Try the alternative server (Alpha/Beta)
5. Regenerate API key if needed

### API Key Invalid Error

**Problem**: "Unauthorized: Invalid or missing API key"

**Solutions**:
1. Verify API key hasn't been deactivated
2. Check for typos in key
3. Regenerate a new key
4. Check key hasn't expired

### Registration Not Found

**Problem**: "QR code not found in registration data"

**Solutions**:
1. Verify QR code is from current event
2. Ensure registrant has paid fees
3. Try manual data sync
4. Check if registration was deleted

### Duplicate Scan Error

**Problem**: "This registration has already been scanned"

**This is expected behavior** and prevents double-scanning. It's a feature, not a bug.

**To override** (if needed):
1. Contact system administrator
2. Can reset scan status in admin panel
3. Use admin override if available

## Database Schema

### Registrations Table

New scanner-related fields:
```
{
  // ... existing fields ...
  scanned: Boolean,        // Whether this registration was scanned
  scannedAt: DateTime,     // When the scan occurred
  scannedBy: String,       // Device ID that performed the scan
}
```

These fields are:
- Indexed for fast queries
- Updated atomically on scan
- Used for statistics and reporting

## Performance Optimization

### Caching

- Registrations cached locally (AsyncStorage)
- Scan history stored locally
- Sync happens in background
- Cache expires after 24 hours (configurable)

### Batch Operations

```typescript
// Batch sync pending scans
const result = await SyncService.syncPendingScans();
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

### Network Optimization

- Minimal payload size (only essential fields)
- Gzip compression for responses
- Retry logic with exponential backoff
- Fallback between Alpha/Beta servers

## Security Best Practices

1. **API Keys**:
   - Never hardcode in code
   - Store in secure app storage
   - Rotate regularly
   - Revoke unused keys

2. **Data**:
   - All API calls use HTTPS
   - API key sent in headers (not URL)
   - Device data encrypted locally

3. **Access**:
   - Admin-only API key generation
   - Device registration verification
   - Audit logging of all scans

## Testing

### Manual Testing

1. **Test Scan Flow**:
   ```bash
   # Generate a test QR code
   curl -X POST "https://solesta.com/api/v1/registration" \
     -d '{"email": "test@example.com", ...}'
   
   # Get QR code from response
   # Scan with app
   # Verify recorded in system
   ```

2. **Test Offline**:
   - Disable network
   - Perform scans
   - Enable network
   - Verify auto-sync

3. **Test Fallback**:
   - Set Alpha server as primary
   - Disable Alpha server
   - Verify app switches to Beta
   - Verify scan works

### Automated Testing

```bash
# Run app tests
npm test

# Test scanner endpoints
npm run test:scanner

# Test integration
npm run test:integration
```

## Performance Metrics

### Expected Performance

- **Sync Time**: 2-5 seconds for 1000 registrations
- **Scan Processing**: <500ms per scan
- **Offline Scans**: Unlimited (until network sync)
- **Memory Usage**: ~50MB for 1000 cached registrations

### Monitoring

Check admin dashboard for:
- Scans per minute
- Average response time
- Failed scans
- Device online status

## Next Steps

1. ✅ Generate API key
2. ✅ Configure app
3. ✅ Download registration data
4. ✅ Start scanning
5. ✅ Monitor progress
6. 📊 Generate reports
7. 🔄 Rotate keys as needed

For detailed API documentation, see [SCANNER_INTEGRATION_DOCS.md](./SCANNER_INTEGRATION_DOCS.md)

