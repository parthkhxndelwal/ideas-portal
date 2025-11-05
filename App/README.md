# IDEAS 3.0 QR Scanner Mobile App

A React Native mobile application for scanning QR codes at IDEAS 3.0 events. This app provides offline-first functionality for entry management with server synchronization.

## Features

- **Offline-First**: Download registration data and scan QR codes without internet connection
- **QR Code Scanning**: Real-time QR code detection and validation
- **Duplicate Prevention**: Prevents multiple scans of the same QR code per day
- **Multi-Device Support**: Multiple devices can scan simultaneously with proper synchronization
- **Device Management**: Configurable device names for tracking scan sources
- **Scan History**: View all scanned entries with sync status
- **Data Synchronization**: Automatic sync of pending scans when online

## Architecture

### Core Components

- **Device Setup Screen**: Initial device configuration
- **Scanner Screen**: Main QR scanning interface
- **History Screen**: Scan history and statistics

### Services

- **DeviceService**: Manages device configuration and identification
- **ApiService**: Handles communication with the web backend
- **StorageService**: Local data persistence using AsyncStorage
- **QRService**: QR code parsing and validation
- **SyncService**: Data synchronization between local and server

## Setup Instructions

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Install dependencies:**
   ```bash
   cd App
   npm install
   ```

2. **Configure API endpoint:**
   Edit `services.ts` and update `API_BASE_URL` to point to your server:
   ```typescript
   const API_BASE_URL = 'https://your-server-url.com'; // Production
   // or
   const API_BASE_URL = 'http://localhost:3000'; // Development
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/emulator:**
   - For Android: `npm run android`
   - For iOS: `npm run ios`
   - For web: `npm run web`

## Usage

### First Time Setup

1. **Launch the app** - It will automatically check device configuration
2. **Device Setup** - If not configured, enter a device name (e.g., "Main Gate", "Side Entrance")
3. **Download Data** - The app will download registration data from the server
4. **Start Scanning** - Begin scanning QR codes

### Scanning Process

1. **Point camera** at a participant's QR code
2. **App validates** the QR code against cached registration data
3. **Checks for duplicates** - prevents scanning the same QR code twice per day
4. **Records entry** - saves locally and syncs with server when online
5. **Shows result** - displays success/failure with details

### Managing Scans

- **View History**: Access scan history from the main scanner screen
- **Sync Data**: Manually sync pending scans or download fresh registration data
- **Statistics**: View scan counts by status (synced, pending, failed)

## API Endpoints

The mobile app communicates with these backend endpoints:

### GET `/api/scanner/users`
Downloads all registered users with completed payments.

**Response:**
```json
{
  "success": true,
  "users": [...],
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "totalCount": 150
}
```

### POST `/api/scanner/record-entry`
Records a new scan entry.

**Request:**
```json
{
  "transactionId": "TXN_123456",
  "rollNumber": "CS20B001",
  "name": "John Doe",
  "qrType": "participant",
  "deviceId": "device_123",
  "deviceName": "Main Gate"
}
```

**Response:**
```json
{
  "success": true,
  "alreadyScanned": false,
  "scannedBy": null,
  "scannedAt": null,
  "data": {...},
  "message": "Entry recorded successfully"
}
```

## QR Code Format

The app expects QR codes in the format:
```
participant_ideas3.0_TRANSACTIONID
volunteer_ideas3.0_TRANSACTIONID
```

## Data Flow

1. **Initial Setup**: Device configuration → Data download → Ready to scan
2. **Scanning**: QR detection → Validation → Local storage → Server sync
3. **Offline Operation**: All scans stored locally, synced when connection restored
4. **Conflict Resolution**: Server prevents duplicate entries, app shows appropriate messages

## Error Handling

- **Network Issues**: Scans saved locally, retry sync automatically
- **Invalid QR Codes**: Clear error messages with validation details
- **Device Issues**: Graceful fallback with user-friendly error states
- **Data Sync**: Comprehensive sync status tracking and manual retry options

## Security Considerations

- QR codes contain encrypted transaction IDs
- Device authentication required for scanning
- Server-side validation prevents unauthorized entries
- Local data encrypted in AsyncStorage

## Troubleshooting

### Common Issues

1. **Camera not working**: Ensure camera permissions granted in device settings
2. **Data not syncing**: Check internet connection and server availability
3. **QR not recognized**: Ensure QR code follows correct format
4. **App crashes**: Clear app data and reinstall

### Logs

Enable debug logging by setting `console.log` levels in the app for troubleshooting.

## Development

### Project Structure

```
App/
├── app/
│   ├── _layout.tsx          # Navigation layout
│   ├── index.tsx           # App entry point
│   ├── device-setup.tsx    # Device configuration
│   ├── scanner.tsx         # Main scanner interface
│   └── history.tsx         # Scan history
├── services.ts             # Business logic services
├── types.ts               # TypeScript interfaces
└── package.json
```

### Adding New Features

1. Update types in `types.ts`
2. Implement service methods in `services.ts`
3. Create new screens in `app/` directory
4. Update navigation in `_layout.tsx`

## Deployment

### Building for Production

1. **Configure production API URL** in `services.ts`
2. **Build the app:**
   ```bash
   expo build:android  # For Android APK
   expo build:ios      # For iOS IPA
   ```

3. **Submit to app stores** following platform guidelines

### Environment Variables

Create environment-specific configurations for different deployment targets.

## Support

For issues or questions:
- Check the troubleshooting section
- Review server logs for API errors
- Ensure device has necessary permissions
- Verify QR code format compliance
