# Camera Permissions Troubleshooting Guide

## Issue: "Video element not found" or Camera Permissions Not Prompting

### Causes & Solutions

#### 1. **HTTPS Required**

The camera permission prompt only works over HTTPS for security reasons.

**Solution:**

- For development: Use `localhost` (automatically treated as secure)
- For production: Ensure your domain has valid SSL/TLS certificate
- For testing: Use a service like ngrok to expose localhost over HTTPS

#### 2. **Browser Security Policy**

Some browsers have strict policies about camera access from certain contexts.

**Solution by Browser:**

**Chrome/Edge:**

- Visit `chrome://flags` (or `edge://flags`)
- Search for "insecure origins treated as secure"
- Add `http://your-local-ip:3000` if not using localhost
- Reload the page

**Firefox:**

- Visit `about:config`
- Search for `permissions.default.camera`
- If value is `-1`, Firefox will ask for permission (correct)
- If value is `2`, change it to `0` to enable prompting

**Safari:**

- Safari requires HTTPS
- Go to Safari → Preferences → Privacy
- Check "Allow privacy-preserving ad measurement"
- Camera access is blocked until you grant it in System Preferences

#### 3. **Camera Not Detected**

If "No camera devices found" appears, the device might not have a camera or it's not accessible.

**Windows:**

```bash
# Check device manager for camera devices
wmic logicaldisk get name  # Verify OS
```

**Mac:**

```bash
# Check for camera
system_profiler SPCameraDataType
```

**Linux:**

```bash
# List video devices
ls -la /dev/video*
```

#### 4. **Camera Already in Use**

Another application might be using the camera.

**Solution:**

- Close other camera apps (Zoom, Discord, OBS, etc.)
- Restart your browser
- Restart your device

#### 5. **Permission Already Denied**

You may have previously blocked camera access.

**Solution:**

**Chrome/Edge:**

1. Click the lock icon in the address bar
2. Find "Camera" permission
3. Change from "Block" to "Ask"
4. Reload the page

**Firefox:**

1. Click the lock icon in the address bar
2. Click "Manage Permissions"
3. Find "Camera" and set to "Allow"
4. Reload the page

**Safari:**

1. Safari → Preferences → Websites → Camera
2. Find your site and change permission
3. Reload the page

#### 6. **Firewall/Antivirus Blocking**

Security software might block browser access to camera.

**Solution:**

- Add your browser to firewall whitelist
- Check antivirus software camera access settings
- Temporarily disable to test

### Step-by-Step Troubleshooting

1. **Check HTTPS/Localhost**

   ```
   ✅ http://localhost:3000/scannerapp
   ✅ https://yourdomain.com/scannerapp
   ❌ http://192.168.x.x:3000/scannerapp
   ```

2. **Check Browser Console**
   - Press F12 to open developer tools
   - Go to Console tab
   - Look for specific error messages
   - Screenshot and note the error

3. **Test Camera Access**
   - Visit https://test.webrtc.org
   - Click "CHECK YOUR CAMERA"
   - If camera works there, issue is app-specific
   - If camera doesn't work there, issue is device/system-level

4. **Try Another Browser**
   - Test with Chrome, Firefox, Edge
   - If works in one but not another, browser-specific issue
   - Update browser to latest version

5. **Check Permissions in System Settings**

   **Windows 10/11:**
   - Settings → Privacy & Security → Camera
   - Ensure browser app is allowed
   - Restart browser

   **Mac:**
   - System Preferences → Security & Privacy → Camera
   - Grant Terminal/browser access
   - Restart browser

   **Linux:**
   - Usually no system-level permissions needed
   - Check browser security settings

### Browser Compatibility Matrix

| Browser | Platform | Status     | Notes                                    |
| ------- | -------- | ---------- | ---------------------------------------- |
| Chrome  | Windows  | ✅ Works   | HTTPS required, localhost OK             |
| Chrome  | Mac      | ✅ Works   | HTTPS required, system permission needed |
| Chrome  | Linux    | ✅ Works   | HTTPS required                           |
| Firefox | Windows  | ✅ Works   | HTTPS required, localhost OK             |
| Firefox | Mac      | ✅ Works   | HTTPS required, system permission needed |
| Firefox | Linux    | ✅ Works   | HTTPS required                           |
| Edge    | Windows  | ✅ Works   | HTTPS required, localhost OK             |
| Safari  | Mac      | ✅ Works   | HTTPS only, system permission needed     |
| Safari  | iOS      | ⚠️ Limited | PWA mode recommended                     |

### Advanced Debugging

**Check Device Enumeration:**
Add this to browser console:

```javascript
navigator.mediaDevices.enumerateDevices().then((devices) => {
  devices.forEach((device) => console.log(device.kind, device.label))
})
```

Expected output:

```
videoinput Camera Name
audioinput Microphone Name
audiooutput Speaker Name
```

If `videoinput` devices don't appear, camera is not accessible.

**Request Camera Directly:**

```javascript
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => console.log("Camera access granted"))
  .catch((err) => console.error("Camera error:", err))
```

This will trigger permission prompt if not already denied.

### Manual Reset

**Complete Browser Reset (Last Resort):**

1. **Clear Site Data:**
   - F12 → Application tab
   - Left sidebar → Cookies
   - Delete your site's data

2. **Clear Browser Permissions:**
   - Clear browsing data (including "Cookies and site data")
   - Restart browser

3. **Reset to Factory Settings:**
   - Chrome: `chrome://settings/reset`
   - Firefox: `about:support` → "Refresh Firefox"
   - Edge: Similar to Chrome

### Getting Help

If still facing issues, please provide:

1. Browser name and version
2. Operating system
3. Error message from console (F12 → Console)
4. Result of test at https://test.webrtc.org
5. Whether other apps can access camera
6. Screenshot of any error dialogs

### Security Note

The scanner requires camera access to function. This is not a privacy risk:

- Camera access is only used during scanning
- No data is recorded or transmitted
- Permission can be revoked anytime
- Browser shows active camera indicator
