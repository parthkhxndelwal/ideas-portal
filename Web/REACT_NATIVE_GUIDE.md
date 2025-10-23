# React Native Scanner App - Quick Integration Guide

## Overview
This guide helps React Native developers integrate with the Scanner API.

## Prerequisites
- React Native environment set up
- Network access to the API server
- Device with camera access

## Required Libraries

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-qrcode-scanner
npm install react-native-camera
npm install realm  # or @react-native-async-storage/async-storage + sqlite
npm install axios  # or fetch
npm install uuid   # for generating unique scan IDs
```

## 1. Device Registration (First Launch)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://your-domain.com/api/scanner-react';

async function registerDevice() {
  try {
    const response = await fetch(`${API_BASE}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scanner Device 1',
        location: 'Main Entrance',
        appVersion: '1.0.0',
      }),
    });

    const data = await response.json();
    
    // Store credentials securely
    await AsyncStorage.setItem('deviceId', data.deviceId);
    await AsyncStorage.setItem('deviceToken', data.token);
    await AsyncStorage.setItem('syncInterval', data.syncIntervalSeconds.toString());
    await AsyncStorage.setItem('maxBatchSize', data.maxBatchSize.toString());
    
    return data;
  } catch (error) {
    console.error('Device registration failed:', error);
    throw error;
  }
}
```

## 2. Download Registrations

```typescript
interface Registration {
  _id: string;
  email: string;
  rollNumber: string;
  name: string;
  courseAndSemester: string;
  year: string;
  transactionId: string;
  registrationStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

async function downloadRegistrations(since?: string) {
  try {
    const token = await AsyncStorage.getItem('deviceToken');
    const url = since 
      ? `${API_BASE}/registrations?since=${since}`
      : `${API_BASE}/registrations`;
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      },
    });

    const data = await response.json();
    
    // Store lastSyncAt for next delta sync
    await AsyncStorage.setItem('lastRegistrationSync', data.lastSyncAt);
    
    // Save registrations to local database (Realm/SQLite)
    await saveRegistrationsToLocal(data.registrations);
    
    return data.registrations;
  } catch (error) {
    console.error('Failed to download registrations:', error);
    throw error;
  }
}

// Example Realm Schema
const RegistrationSchema = {
  name: 'Registration',
  primaryKey: '_id',
  properties: {
    _id: 'string',
    email: 'string',
    rollNumber: 'string',
    name: 'string',
    courseAndSemester: 'string',
    year: 'string',
    transactionId: 'string',
    registrationStatus: 'string',
    paymentStatus: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },
};
```

## 3. QR Code Scanning

```typescript
import QRCodeScanner from 'react-native-qrcode-scanner';
import { v4 as uuidv4 } from 'uuid';

interface LocalScan {
  _id: string;
  rollNumber: string;
  name: string;
  qrType: 'participant' | 'volunteer';
  transactionId?: string;
  entryDate: string;
  entryTimestamp: string;
  scannedBy: string;
  createdAt: string;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'rejected';
  syncMessage?: string;
}

async function handleQRScan(qrData: string) {
  try {
    // Parse QR code data
    const qrPayload = JSON.parse(qrData);
    const { rollNumber, name, qrType, transactionId } = qrPayload;
    
    // Validate against local database
    const registration = await findLocalRegistration(rollNumber);
    
    if (!registration) {
      alert('Invalid QR Code: User not found');
      return;
    }
    
    if (registration.registrationStatus !== 'confirmed' || 
        registration.paymentStatus !== 'completed') {
      alert('Invalid QR Code: Registration not completed');
      return;
    }
    
    // Check if already scanned today (optional - server also checks)
    const hasScannedToday = await checkLocalScannedToday(rollNumber);
    if (hasScannedToday) {
      alert('Already scanned today!');
      return;
    }
    
    // Create local scan record
    const deviceId = await AsyncStorage.getItem('deviceId');
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const scan: LocalScan = {
      _id: uuidv4(), // Unique scan ID
      rollNumber,
      name,
      qrType,
      transactionId,
      entryDate: today.toISOString().split('T')[0],
      entryTimestamp: now.toISOString(),
      scannedBy: deviceId!,
      createdAt: now.toISOString(),
      syncStatus: 'pending',
    };
    
    // Save to local database
    await saveLocalScan(scan);
    
    alert(`✅ Scanned: ${name} (${rollNumber})`);
    
  } catch (error) {
    console.error('QR Scan error:', error);
    alert('Invalid QR Code format');
  }
}

// QR Scanner Component
function ScannerScreen() {
  return (
    <QRCodeScanner
      onRead={(e) => handleQRScan(e.data)}
      reactivate={true}
      reactivateTimeout={2000}
      topContent={<Text>Scan QR Code</Text>}
      bottomContent={<Text>Point camera at QR code</Text>}
    />
  );
}
```

## 4. Batch Upload (Periodic Sync)

```typescript
async function uploadPendingScans() {
  try {
    const deviceId = await AsyncStorage.getItem('deviceId');
    const token = await AsyncStorage.getItem('deviceToken');
    const maxBatchSize = parseInt(await AsyncStorage.getItem('maxBatchSize') || '100');
    
    // Get pending scans from local database
    const pendingScans = await getLocalPendingScans(maxBatchSize);
    
    if (pendingScans.length === 0) {
      console.log('No pending scans to upload');
      return;
    }
    
    console.log(`Uploading ${pendingScans.length} scans...`);
    
    const response = await fetch(`${API_BASE}/scans/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId,
        entries: pendingScans,
      }),
    });
    
    const data = await response.json();
    
    // Update local scan status based on results
    for (const result of data.results) {
      await updateLocalScanStatus(result.entryId, {
        syncStatus: result.status === 'accepted' ? 'synced' : result.status,
        syncMessage: result.reason,
      });
    }
    
    console.log('Batch upload complete');
    return data;
    
  } catch (error) {
    console.error('Failed to upload scans:', error);
    throw error;
  }
}
```

## 5. Fetch Updates (Conflict Resolution)

```typescript
async function fetchUpdates() {
  try {
    const token = await AsyncStorage.getItem('deviceToken');
    const lastSync = await AsyncStorage.getItem('lastUpdateSync') || 
                     new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch(`${API_BASE}/updates?since=${lastSync}`, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    const data = await response.json();
    
    // Update local cache with entries from other devices
    for (const update of data.entryUpdates) {
      await markRollNumberAsScanned(
        update.rollNumber,
        update.lastSeen,
        update.sourceDeviceId
      );
    }
    
    // Store last sync time
    await AsyncStorage.setItem('lastUpdateSync', data.lastSyncAt);
    
    return data.entryUpdates;
    
  } catch (error) {
    console.error('Failed to fetch updates:', error);
    throw error;
  }
}
```

## 6. Background Sync Manager

```typescript
import BackgroundFetch from 'react-native-background-fetch';

async function setupBackgroundSync() {
  const syncInterval = parseInt(
    await AsyncStorage.getItem('syncInterval') || '300'
  );
  
  BackgroundFetch.configure(
    {
      minimumFetchInterval: syncInterval / 60, // Convert to minutes
      stopOnTerminate: false,
      startOnBoot: true,
    },
    async (taskId) => {
      console.log('[BackgroundFetch] Running sync task');
      
      try {
        // Upload pending scans
        await uploadPendingScans();
        
        // Fetch updates
        await fetchUpdates();
        
        // Delta sync registrations
        const lastSync = await AsyncStorage.getItem('lastRegistrationSync');
        await downloadRegistrations(lastSync);
        
        console.log('[BackgroundFetch] Sync complete');
      } catch (error) {
        console.error('[BackgroundFetch] Sync failed:', error);
      }
      
      BackgroundFetch.finish(taskId);
    },
    (error) => {
      console.error('[BackgroundFetch] Error:', error);
    }
  );
}
```

## 7. Database Schema (Realm Example)

```typescript
import Realm from 'realm';

const RegistrationSchema = {
  name: 'Registration',
  primaryKey: '_id',
  properties: {
    _id: 'string',
    email: 'string',
    rollNumber: { type: 'string', indexed: true },
    name: 'string',
    courseAndSemester: 'string',
    year: 'string',
    transactionId: 'string',
    registrationStatus: 'string',
    paymentStatus: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },
};

const ScanSchema = {
  name: 'Scan',
  primaryKey: '_id',
  properties: {
    _id: 'string',
    rollNumber: 'string',
    name: 'string',
    qrType: 'string',
    transactionId: 'string?',
    entryDate: 'string',
    entryTimestamp: 'date',
    scannedBy: 'string',
    createdAt: 'date',
    syncStatus: 'string', // 'pending' | 'synced' | 'conflict' | 'rejected'
    syncMessage: 'string?',
  },
};

async function initDatabase() {
  const realm = await Realm.open({
    schema: [RegistrationSchema, ScanSchema],
    schemaVersion: 1,
  });
  
  return realm;
}
```

## 8. Complete Sync Flow

```typescript
async function performFullSync() {
  try {
    console.log('Starting full sync...');
    
    // Step 1: Upload pending scans
    await uploadPendingScans();
    
    // Step 2: Fetch entry updates from other devices
    await fetchUpdates();
    
    // Step 3: Delta sync registrations
    const lastSync = await AsyncStorage.getItem('lastRegistrationSync');
    await downloadRegistrations(lastSync);
    
    console.log('Full sync complete');
    
  } catch (error) {
    console.error('Sync failed:', error);
    // Handle offline gracefully - retry later
  }
}
```

## 9. Error Handling

```typescript
async function apiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 10000, // 10 second timeout
    });
    
    if (response.status === 401) {
      // Token expired - need to re-register device
      throw new Error('Device token expired');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    
    return await response.json();
    
  } catch (error) {
    if (error.message === 'Network request failed') {
      // Offline - handle gracefully
      console.log('Offline mode - will sync later');
      return null;
    }
    
    throw error;
  }
}
```

## 10. UI Components

```typescript
// Scan Status Badge
function ScanStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'orange',
    synced: 'green',
    conflict: 'red',
    rejected: 'red',
  };
  
  return (
    <View style={{ backgroundColor: colors[status] }}>
      <Text>{status.toUpperCase()}</Text>
    </View>
  );
}

// Scan History
function ScanHistoryScreen() {
  const [scans, setScans] = useState<LocalScan[]>([]);
  
  useEffect(() => {
    loadLocalScans().then(setScans);
  }, []);
  
  return (
    <FlatList
      data={scans}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name} ({item.rollNumber})</Text>
          <Text>{new Date(item.entryTimestamp).toLocaleString()}</Text>
          <ScanStatusBadge status={item.syncStatus} />
          {item.syncMessage && <Text>{item.syncMessage}</Text>}
        </View>
      )}
    />
  );
}
```

## Testing Checklist

- [ ] Device registration works
- [ ] Registrations download and save locally
- [ ] QR scanner validates against local data
- [ ] Scans save to local database with 'pending' status
- [ ] Batch upload sends pending scans
- [ ] Server responses update local scan status
- [ ] Updates endpoint detects conflicts
- [ ] Delta sync fetches only new registrations
- [ ] Background sync runs periodically
- [ ] Offline mode works without crashes
- [ ] Token expiration handled gracefully
- [ ] Network errors retry automatically

## Performance Tips

1. **Use indexes** on rollNumber and syncStatus fields
2. **Limit batch size** to 50-100 entries per upload
3. **Debounce QR scans** to prevent duplicate scans
4. **Cache registrations** in memory for fast lookup
5. **Use background tasks** for sync, not foreground
6. **Implement retry logic** with exponential backoff
7. **Show sync progress** to users
8. **Handle offline mode** gracefully

## Security Best Practices

1. Store device token in secure storage (Keychain/Keystore)
2. Validate QR code signatures (if implemented)
3. Use HTTPS for all API calls
4. Don't log sensitive data
5. Implement certificate pinning
6. Clear local data on device unregister

## Support

For API documentation, see: `/api/scanner-react/README.md`
For testing, use: `scripts/test-scanner-api.js`
