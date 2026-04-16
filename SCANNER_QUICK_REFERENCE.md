# Scanner Integration - Quick Reference Card

## 🚀 Quick Start

### 1. Run Migration
```bash
cd solesta/solesta
npx prisma migrate dev --name add_scanner_fields
```

### 2. Generate API Key
```bash
# Via curl
curl -X POST "http://localhost:3000/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -d '{"name": "Device 1", "action": "generate"}'

# Via Admin Dashboard: Scanner Management → API Keys → Generate
```

### 3. Configure Scanner App
```typescript
// In App/main or initialization file
await DeviceService.setApiKey("scanner_1710345600000_abc123");
```

### 4. Start Scanning
- Launch app
- Data auto-syncs
- Point camera at QR
- Confirm scan
- Auto-uploads when online

---

## 📊 API Endpoints

### Public Endpoints (require API key)

```bash
# Get all registrations
GET /api/scanner/users
Header: x-api-key: <key>

# Record a scan
POST /api/scanner/record-entry
Header: x-api-key: <key>
Body: {transactionId, name, rollNumber, qrType, deviceId, deviceName}

# Register device
POST /api/scanner/register-device
Header: x-api-key: <key>
Body: {deviceId, deviceName}
```

### Admin Endpoints (require session)

```bash
# List API keys
GET /api/admin/scanner/api-keys
Header: Cookie: admin_session=<session>

# Generate/deactivate keys
POST /api/admin/scanner/api-keys
Header: Cookie: admin_session=<session>
Body: {name, action: "generate"|"deactivate"}

# View statistics
GET /api/admin/scanner/statistics
Header: Cookie: admin_session=<session>
Query: ?filter=all|scanned|not-scanned&limit=100&skip=0
```

---

## 🗄️ Database Schema

### Registration Model (New Fields)

```prisma
scanned              Boolean       @default(false)
scannedAt            DateTime?
scannedBy            String?       // Device ID
```

### Sample Document
```javascript
{
  _id: ObjectId("..."),
  reference_id: "SOL26-XXXXX",
  name: "John Doe",
  email: "john@example.com",
  roll_number: "BR123",
  scanned: true,
  scanned_at: 2026-04-16T10:30:00Z,
  scanned_by: "device_1234567890_abc123",
  created_at: 2026-04-01T00:00:00Z,
  updated_at: 2026-04-16T10:30:00Z
}
```

---

## 🔑 API Key Management

### Generate New Key
```bash
curl -X POST "http://localhost:3000/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Field Scanner Device 1",
    "action": "generate"
  }'
```

**Response:**
```json
{
  "success": true,
  "apiKey": "scanner_1710345600000_abc123",
  "name": "Field Scanner Device 1"
}
```

### List All Keys
```bash
curl -X GET "http://localhost:3000/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..."
```

### Deactivate Key
```bash
curl -X POST "http://localhost:3000/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..." \
  -d '{
    "keyId": "key_id_here",
    "action": "deactivate"
  }'
```

---

## 📱 Mobile App Integration

### Services Methods

```typescript
// Get API key
const key = await DeviceService.getApiKey();

// Set API key
await DeviceService.setApiKey("scanner_XXXX_YYYY");

// Download registrations
const response = await ApiService.downloadRegistrationData();

// Record a scan
const result = await ApiService.recordEntry({
  transactionId: "SOL26-XXXXX",
  rollNumber: "BR123",
  name: "John Doe",
  qrType: "participant",
  deviceId: "device_123",
  deviceName: "Scanner 1"
});

// Sync pending scans
const status = await SyncService.syncPendingScans();
console.log(`Synced: ${status.synced}, Failed: ${status.failed}`);
```

---

## 📈 Admin Dashboard

### View Statistics
```bash
curl -X GET "http://localhost:3000/api/admin/scanner/statistics" \
  -H "Cookie: admin_session=..."
```

**Response Includes:**
- totalPaid: 150
- totalScanned: 45
- totalNotScanned: 105
- scanPercentage: 30%

### Filter Options
- `?filter=all` - All paid registrations
- `?filter=scanned` - Already scanned
- `?filter=not-scanned` - Pending scan
- `&limit=100` - Results per page
- `&skip=0` - Pagination offset

---

## 🔐 Security

### API Key Format
```
scanner_<timestamp>_<random_string>
scanner_1710345600000_abc123def456ghi789
```

### Best Practices
- ✅ Use unique key per device
- ✅ Rotate keys monthly
- ✅ Disable unused keys
- ✅ Store securely in app
- ✅ Monitor usage timestamps
- ❌ Never commit to Git
- ❌ Never use master key in production
- ❌ Never share keys via email

---

## 🛠️ Troubleshooting

### Issue: API Key Invalid
**Solution**: 
1. Check key hasn't been deactivated
2. Verify correct key copied
3. Generate new key if needed

### Issue: Registration Not Found
**Solution**:
1. Verify registration exists
2. Check if fees are paid
3. Manually sync data
4. Verify transaction ID format

### Issue: Already Scanned
**Solution**: This is expected behavior. Prevents duplicate scans.
- Check admin dashboard for timestamp
- Contact admin to reset if needed

### Issue: Connection Failed
**Solution**:
1. Check internet connection
2. Verify server is running
3. Try alternate server (Alpha/Beta)
4. Check firewall/VPN settings

---

## 📝 File Locations

### Backend Files
```
solesta/solesta/
├── app/api/scanner/
│   ├── users/route.ts
│   ├── record-entry/route.ts
│   └── register-device/route.ts
├── app/api/admin/scanner/
│   ├── api-keys/route.ts
│   └── statistics/route.ts
├── lib/server/scanner-auth.ts
└── prisma/schema.prisma (MODIFIED)

.env (MODIFIED - added SCANNER_MASTER_KEY)
```

### Mobile App Files
```
App/
├── services.ts (MODIFIED - API key support)
└── types.ts
```

### Documentation
```
solesta/solesta/
├── SCANNER_README.md
├── SCANNER_SETUP_GUIDE.md
└── SCANNER_INTEGRATION_DOCS.md

Project root:
├── SCANNER_IMPLEMENTATION_SUMMARY.md
└── DEPLOYMENT_CHECKLIST.md
```

---

## 🚦 Status Indicators

### Scan Status
- **pending**: Locally recorded, waiting to sync
- **synced**: Successfully uploaded to backend
- **failed**: Upload failed, will retry

### Device Status
- **registered**: Device verified with backend
- **online**: Currently connected
- **offline**: No connection, using cache

---

## 📊 Monitoring Commands

### Check Scan Progress
```bash
curl "http://localhost:3000/api/admin/scanner/statistics" \
  -H "Cookie: admin_session=..."
```

### Monitor API Key Usage
```bash
curl "http://localhost:3000/api/admin/scanner/api-keys" \
  -H "Cookie: admin_session=..."
# Check last_used_at timestamp
```

### Test Device Connectivity
```bash
curl -X POST "http://localhost:3000/api/scanner/register-device" \
  -H "x-api-key: <key>" \
  -d '{"deviceId": "test_device", "deviceName": "Test"}'
```

---

## 🎯 Common Workflows

### Admin Setup Workflow
1. Access admin dashboard
2. Navigate to Scanner Management
3. Generate new API key
4. Copy and send to operator
5. Monitor statistics in real-time
6. Deactivate keys when done

### Scanner Operator Workflow
1. Launch app
2. Enter API key (first time only)
3. Select server if needed
4. Wait for data sync (~2-5 seconds)
5. Point camera at QR codes
6. Confirm each scan
7. Syncs automatically when online

### Data Sync Workflow
1. Download all registrations
2. Cache locally
3. Scan offline
4. When online, auto-sync results
5. Backend marks scanned=true
6. Admin sees real-time updates

---

## 💾 Environment Variables

```env
# Required
DATABASE_URL=mongodb+srv://...
SCANNER_MASTER_KEY=scanner_master_key_solesta26

# Existing (unchanged)
SMTP_HOST=...
SMTP_PORT=...
# ... other variables
```

---

## 📞 Support Resources

**Documentation:**
- Setup Guide: `SCANNER_SETUP_GUIDE.md`
- API Docs: `SCANNER_INTEGRATION_DOCS.md`
- Overview: `SCANNER_README.md`

**Quick Fixes:**
- Invalid key → Generate new key
- Sync failed → Check internet
- Not found → Verify registration paid
- Wrong server → Switch in settings

**Emergency:**
- Critical issue → Use master key (development only)
- Data corruption → Restore from backup
- Security breach → Deactivate all keys

---

**Last Updated:** 2026-04-16  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

