# Scanner App Documentation

## Overview

The Scanner App at `/scannerapp` is a web-based QR code scanning application that validates registrations and records attendance by scanning QR codes. It integrates with the backend approval system to verify fees, prevent duplicate scans, and maintain attendance records.

## Features

### 1. **Camera-Based QR Code Scanning**

- Uses ZXing library for QR code detection
- Real-time camera capture and processing
- Automatic detection when QR code is in frame
- Graceful error handling for camera permission issues

### 2. **Manual QR Code Entry**

- Paste QR codes directly if camera scanning fails
- Enter transaction IDs manually
- Submit via button or Enter key

### 3. **Validation System**

- Validates QR code format via `/api/scanner/validate/[transactionId]`
- Checks if registration fee is paid
- Prevents scanning unpaid registrations
- Returns complete registration details

### 4. **Approval & Recording**

- Records scans via `/api/scanner/record-entry` endpoint
- Updates database with scan timestamp
- Tracks device information (device ID, device name)
- Handles already-scanned cases gracefully

### 5. **Real-Time Feedback**

- Success/error status messages
- Display of scanned user details (name, email, roll number, course)
- Duplicate scan detection with timestamp

### 6. **Scan History**

- Maintains local history of all scans
- Shows last 10 scans with timestamps
- Displays success/error status for each scan
- Clear history option

### 7. **API Key Support**

- Optional API key input for scanner authentication
- Supports authenticated scanner devices
- Fallback to default key if not provided

## File Structure

```
app/scannerapp/
├── page.tsx                          # Main scanner page
└── components/
    ├── QRScanner.tsx                 # QR code detection component
    ├── ScannerResult.tsx             # Result display component
    └── QRCodeHistory.tsx             # Scan history component
```

## How It Works

### Workflow

1. **User opens `/scannerapp`**
   - Page loads with camera and manual entry options
   - User can optionally enter API key

2. **User starts camera or enters QR code**
   - Camera scans QR code OR
   - User pastes transaction ID manually

3. **Validation Phase**
   - Frontend calls `/api/scanner/validate/{transactionId}`
   - API checks if registration exists and fee is paid
   - Returns registration details if valid

4. **Approval Phase**
   - If validation succeeds, frontend calls `/api/scanner/record-entry`
   - Backend records the scan in database
   - Updates `scanned`, `scannedAt`, `scannedBy` fields
   - Returns confirmation or "already scanned" message

5. **Result Display**
   - Shows success/error message
   - Displays scanned user details
   - Adds entry to scan history
   - Auto-resets for next scan after 2 seconds

## API Endpoints Used

### 1. Validate QR Code

**Endpoint:** `GET /api/scanner/validate/[transactionId]`

**Headers:**

```json
{
  "x-api-key": "your-api-key",
  "Content-Type": "application/json"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "registration-id",
    "transactionId": "ref-id",
    "name": "Student Name",
    "email": "student@example.com",
    "rollNumber": "2024001",
    "courseAndSemester": "B.Tech - Year 1",
    "year": 1,
    "isKrmu": false,
    "isFresher": false,
    "scanned": false,
    "scannedAt": null,
    "scannedBy": null
  }
}
```

**Error Response (403/404):**

```json
{
  "success": false,
  "error": "Registration not found | Registration fee not paid"
}
```

### 2. Record Entry (Approve Scan)

**Endpoint:** `POST /api/scanner/record-entry`

**Headers:**

```json
{
  "x-api-key": "your-api-key",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "transactionId": "ref-id",
  "name": "Student Name",
  "rollNumber": "2024001",
  "qrType": "attendance",
  "deviceId": "web-scanner-1234567890",
  "deviceName": "Web Scanner"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Entry recorded successfully",
  "data": {
    "id": "registration-id",
    "referenceId": "ref-id",
    "name": "Student Name",
    "rollNumber": "2024001",
    "scannedAt": "2024-04-17T10:30:45.123Z",
    "scannedBy": "web-scanner-1234567890"
  }
}
```

**Already Scanned Response:**

```json
{
  "success": false,
  "message": "This registration has already been scanned",
  "alreadyScanned": true,
  "scannedAt": "2024-04-17T09:15:30.456Z",
  "scannedBy": "mobile-scanner-1"
}
```

## Security Considerations

1. **API Key Authentication**
   - Both endpoints require valid API key in `x-api-key` header
   - Keys are validated against database
   - Unauthorized requests return 401 status

2. **Fee Validation**
   - Only paid registrations can be scanned
   - Unpaid registrations return 403 Forbidden

3. **Duplicate Prevention**
   - Once scanned, entry cannot be scanned again
   - System prevents double-counting

4. **CORS Support**
   - All scanner endpoints have CORS enabled
   - Supports cross-origin requests

## Environment Setup

### Required Dependencies

```
@zxing/library - QR code scanning
lucide-react - Icons
shadcn/ui - UI components
```

### API Key Setup

1. Get API key from admin dashboard at `/admin/dashboard`
2. Navigate to "Scanner API Keys" tab
3. Create new key or use existing one
4. Enter key in scanner app (optional for default key)

## Browser Compatibility

- Chrome/Chromium: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ iOS 14.5+ (PWA mode recommended)
- Edge: ✅ Full support

### Camera Permissions

- User must grant camera permission
- HTTPS required for camera access
- Will show permission dialog on first use

## Error Handling

### Common Errors

| Error                           | Cause                 | Solution                     |
| ------------------------------- | --------------------- | ---------------------------- |
| "No camera devices found"       | Camera not available  | Check hardware/permissions   |
| "Unauthorized: Invalid API key" | Wrong/missing API key | Verify key in settings       |
| "Registration fee not paid"     | Fee not paid          | Collect fee first            |
| "Registration not found"        | Invalid QR code       | Verify QR code validity      |
| "Registration already scanned"  | Already recorded      | Show timestamp of first scan |

## Usage Tips

1. **For Mobile Users**
   - Use device's native camera for better performance
   - Ensure good lighting on QR code
   - Hold device steady while scanning

2. **For Desktop Users**
   - Use USB camera or built-in webcam
   - Manual entry fallback available
   - Can paste QR content directly

3. **For Bulk Scanning**
   - Keep screen on during event
   - Monitor scan history for issues
   - Clear history periodically if needed

## Development

### Running Locally

```bash
cd solesta
npm run dev
# Visit http://localhost:3000/scannerapp
```

### Component Props

**QRScanner**

- `onScan: (data: string) => void` - Called when QR code is detected
- `onError?: (error: Error) => void` - Called on camera errors

**ScannerResult**

- `status: "idle" | "loading" | "success" | "error"` - Status of scan
- `message: string` - Status message
- `data?: { name, email, rollNumber?, courseAndSemester? }` - User details

**QRCodeHistory**

- `history: HistoryItem[]` - List of scan records
- `onClear: () => void` - Clear history callback

## Future Enhancements

- [ ] Multi-device synchronization
- [ ] Offline mode with sync
- [ ] Advanced statistics dashboard
- [ ] Bulk import/export
- [ ] Batch scanning mode
- [ ] Sound/haptic feedback
- [ ] Barcode support (not just QR)
- [ ] WebSocket real-time updates
