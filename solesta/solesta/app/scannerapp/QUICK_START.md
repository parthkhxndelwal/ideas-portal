# Quick Start: Using the Scanner App

## Accessing the Scanner

1. **Open in Browser:**

   ```
   http://localhost:3000/scannerapp
   ```

2. **For Production:**
   ```
   https://yourdomain.com/scannerapp
   ```

## Initial Setup

### Step 1: Grant Camera Permission

When you first start the scanner, your browser will prompt for camera access:

```
"solesta is requesting permission to access your camera"
```

Click **"Allow"** to proceed.

### Step 2: Optional - Enter API Key

If your scanner requires API key authentication:

1. Get the key from admin dashboard (`/admin/dashboard`)
2. Paste it in the "Scanner API Key" field
3. The key is optional if using default authentication

### Step 3: Start Scanning

#### Option A: Camera Scanning

1. Click "Start Camera" button
2. Position QR code in the camera frame
3. Hold steady for scanning to complete
4. Result appears immediately

#### Option B: Manual Entry

1. Copy/paste the QR code text
2. Or enter transaction ID directly
3. Click "Submit" or press Enter

## What Happens Next

### Successful Scan

- ✅ Success message appears
- User details displayed (Name, Email, Roll Number, Course)
- Entry added to scan history
- Auto-resets for next scan after 2 seconds

### Duplicate Scan

- ⚠️ "Already scanned" message appears
- Shows original scan timestamp
- No changes to database

### Failed Scan

- ❌ Error message shows reason (not found, fee not paid, etc.)
- Failed entry added to history
- Can retry with manual entry

## Camera Permission Issues?

If you see "Camera Error" or "Video element not found":

### Most Common Fix: HTTPS

- **Development:** Already works with `localhost`
- **Testing on network:** Use HTTPS only
- This is a browser security requirement

### Check Your Browser

1. **Permission Denied?**
   - Click address bar lock icon
   - Change Camera permission from "Block" to "Ask"
   - Reload page

2. **Permission Not Prompting?**
   - Clear site data: Settings → Privacy → Clear browsing data
   - Check if another app is using camera
   - Try a different browser

3. **Still Issues?**
   - See [CAMERA_TROUBLESHOOTING.md](./CAMERA_TROUBLESHOOTING.md)
   - Test at https://test.webrtc.org first

## Features

### 📱 Real-Time Scanning

- Instant QR code detection
- Multiple formats supported
- Works with any smartphone/QR code

### 📋 Scan History

- View last 10 scans
- Shows success/fail status
- Timestamps included
- Clear all history option

### 📊 Live Feedback

- Displays student information
- Shows validation status
- Prevents duplicate entries
- Error messages for issues

### 🔑 Flexible Entry

- Camera OR manual entry
- Paste QR codes or IDs
- Works offline (with manual entry)

## Tips for Best Results

### Camera Scanning

✅ Good lighting on QR code
✅ Hold device steady
✅ QR code 10-20cm from camera
✅ Good contrast on QR code
✅ Clean camera lens

### Manual Entry

✅ Copy entire QR code text
✅ Paste directly into field
✅ Or enter transaction ID
✅ Press Enter to submit

## Keyboard Shortcuts

| Key   | Action                          |
| ----- | ------------------------------- |
| Enter | Submit QR code/transaction ID   |
| Tab   | Move between fields             |
| Esc   | Close camera (on some browsers) |

## Device Requirements

### Minimum

- Modern browser (Chrome, Firefox, Edge, Safari)
- Camera (built-in or USB)
- HTTPS (for production)

### Recommended

- Latest browser version
- USB external camera (more stable)
- Good internet connection (for validation)
- Desktop/laptop (vs mobile) for higher throughput

## Troubleshooting Quick Links

| Problem                  | Solution                            |
| ------------------------ | ----------------------------------- |
| Camera won't start       | See CAMERA_TROUBLESHOOTING.md       |
| "Registration not found" | Verify transaction ID is correct    |
| "Fee not paid"           | Student must complete payment first |
| "Already scanned"        | Student already has entry recorded  |
| Network error            | Check internet connection           |

## Admin Dashboard

Access additional scanner features:

**URL:** `/admin/dashboard`

**Scanner Tab Features:**

- Create/manage API keys
- View scan statistics
- Monitor scanner activity
- Download reports

## Support

For issues or questions:

1. **Check Troubleshooting Guide:** CAMERA_TROUBLESHOOTING.md
2. **Test Camera:** https://test.webrtc.org
3. **Check API Keys:** /admin/dashboard
4. **Contact Support:** Include error message and browser info
