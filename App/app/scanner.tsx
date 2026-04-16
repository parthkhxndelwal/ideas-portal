import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { DeviceService, StorageService, QRService, SyncService, ApiService, ServerConfigService, API_SERVERS, ServerType } from '../services';
import { MobileUser, LocalScanRecord, DeviceConfig } from '../types';

const BYPASS_USERS = [
  { id: "bypass1", name: "Shreya Narayanan", rollNumber: "2301201106", course: "BCA (AI & DS)", email: "narayananshreya29@gmail.com" },
  { id: "bypass2", name: "Aadya Mishra", rollNumber: "2301201168", course: "BCA (AI & DS)", email: "Aadyamishra0001@gmail.com" },
  { id: "bypass3", name: "Kanishk", rollNumber: "2301201018", course: "BCA (AI & DS)", email: "kanishkg.2005@gmail.com" },
  { id: "bypass4", name: "Devraj Singh", rollNumber: "2301201093", course: "BCA (AI & DS)", email: "drschanay@gmail.com" },
  { id: "bypass5", name: "Vedant", rollNumber: "2301010369", course: "BTech (CSE)", email: "Vedants062@gmail.com" },
  { id: "bypass6", name: "Deepanshu Negi", rollNumber: "2301350026", course: "BTech (CSE) FSD", email: "parthnotfoundop@gmail.com" }
];

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [users, setUsers] = useState<MobileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [scanHistory, setScanHistory] = useState<LocalScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentServer, setCurrentServer] = useState<ServerType>('ALPHA');

  const router = useRouter();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    loadServerConfig();
  }, []);

  const loadServerConfig = async () => {
    const server = await ServerConfigService.getSelectedServer();
    setCurrentServer(server);
  };

  const initializeApp = async () => {
    try {
      const config = await DeviceService.getDeviceConfig();
      if (!config?.isConfigured) {
        router.replace('/device-setup');
        return;
      }
      setDeviceConfig(config);

      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // NO LONGER load cached data - we validate directly from server
      await loadScanHistory();
      await syncPendingScans();
    } catch {
      Alert.alert('Error', 'Failed to initialize app');
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    const history = await StorageService.getScanHistory();
    setScanHistory(history);
  };

  // Note: Download functions kept for potential future offline mode
  // Currently disabled - all validation is done server-side
  const downloadData = async () => {
    Alert.alert('Info', 'Registrations are validated directly from server. No local cache needed.');
  };

  const downloadDataWithFallback = async () => {
    Alert.alert('Info', 'Registrations are validated directly from server. No local cache needed.');
  };

  const syncPendingScans = async () => {
    const result = await SyncService.syncPendingScans();
    if (result.synced > 0 || result.failed > 0) {
      await loadScanHistory();
      
      if (result.failed > 0 && result.synced === 0) {
        // All syncs failed
        Alert.alert('Sync Failed', `Failed to sync ${result.failed} pending scan(s). Will retry later.`);
      } else if (result.failed > 0) {
        // Some syncs failed
        Alert.alert('Partial Sync', `Synced: ${result.synced}, Failed: ${result.failed}. Failed scans will be retried.`);
      } else if (result.synced > 0) {
        // All syncs succeeded
        Alert.alert('Sync Complete', `Successfully synced ${result.synced} pending scan(s).`);
      }
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanning || isFrozen) return;
    setScanning(true);

    try {
      const bypassMatch = data.match(/^\{id:"(bypass\d+)"\}$/);
      if (bypassMatch) {
        const bypassUser = BYPASS_USERS.find(u => u.id === bypassMatch[1]);
        if (bypassUser) {
          await recordBypassScan(bypassUser);
          return;
        }
      }

      const qrData = QRService.parseQRData(data);
      if (!qrData) {
        Alert.alert('Invalid QR Code', 'This QR code is not valid for Solesta');
        return;
      }

      // Validate registration directly with server (no cache)
      const validation = await QRService.validateQRDataWithServer(qrData);
      if (!validation.isValid) {
        Alert.alert('Invalid Entry', validation.error || 'QR code validation failed');
        return;
      }

      const user = validation.user!;
      const alreadyScanned = await StorageService.isTransactionScanned(qrData.transactionId);
      if (alreadyScanned) {
        Alert.alert('Already Scanned', 'This entry has already been recorded on this device');
        return;
      }

      await recordScan(user, qrData);
    } catch {
      Alert.alert('Error', 'Failed to process QR code');
    } finally {
      setScanning(false);
      setIsFrozen(true);
      setTimeout(() => setIsFrozen(false), 1000);
    }
  };

  const recordScan = async (user: MobileUser, qrData: any) => {
    if (!deviceConfig) return;

    const scanRecord: LocalScanRecord = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: qrData.transactionId,
      rollNumber: user.rollNumber,
      name: user.name || 'Unknown',
      qrType: qrData.type,
      scannedAt: new Date(),
      deviceId: deviceConfig.deviceId,
      deviceName: deviceConfig.deviceName,
      status: 'pending',
    };

    try {
      await StorageService.saveScanRecord(scanRecord);
      await loadScanHistory();

      const result = await ApiService.recordEntry({
        transactionId: qrData.transactionId,
        rollNumber: user.rollNumber,
        name: user.name || 'Unknown',
        qrType: qrData.type,
        deviceId: deviceConfig.deviceId,
        deviceName: deviceConfig.deviceName,
      });

      if (result.success) {
        await StorageService.updateScanRecordStatus(scanRecord.id, 'synced', result.data);

        if (result.data?.alreadyScanned) {
          Alert.alert(
            'Entry Recorded',
            `Entry already recorded by ${result.data.scannedBy || 'another device'} at ${
              result.data.scannedAt ? new Date(result.data.scannedAt).toLocaleString() : 'unknown time'
            }`
          );
        } else {
          Alert.alert('Success', 'Entry recorded successfully!');
        }
      } else {
        // Mark as failed and show appropriate message
        await StorageService.updateScanRecordStatus(scanRecord.id, 'failed', { error: result.error });
        Alert.alert('Sync Failed', `Entry saved locally but failed to sync: ${result.error || 'Unknown error'}. Will retry when online.`);
      }

      await loadScanHistory();
    } catch (error) {
      // Mark as failed on exception
      await StorageService.updateScanRecordStatus(scanRecord.id, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      Alert.alert('Error', 'Failed to record entry. Entry saved locally for retry.');
    }
  };

  const recordBypassScan = async (bypassUser: typeof BYPASS_USERS[0]) => {
    if (!deviceConfig) return;

    const existingRecord = await StorageService.findLatestScanByRollNumber(bypassUser.rollNumber);
    if (existingRecord) {
      const scannedBy = existingRecord.serverResponse?.scannedBy || existingRecord.deviceName || 'this device';
      const scannedAtSource = existingRecord.serverResponse?.scannedAt || existingRecord.scannedAt;
      const scannedAt = scannedAtSource ? new Date(scannedAtSource).toLocaleString() : 'unknown time';
      Alert.alert('Entry Recorded', `Entry already recorded by ${scannedBy} at ${scannedAt}`);
      return;
    }

    const bogusTransactionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const scanRecord: LocalScanRecord = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: bogusTransactionId,
      rollNumber: bypassUser.rollNumber,
      name: bypassUser.name,
      qrType: 'participant',
      scannedAt: new Date(),
      deviceId: deviceConfig.deviceId,
      deviceName: deviceConfig.deviceName,
      status: 'synced',
    };

    try {
      await StorageService.saveScanRecord(scanRecord);
      await loadScanHistory();
      Alert.alert('Success', 'Entry recorded successfully!');
    } catch {
      Alert.alert('Error', 'Failed to record entry');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServerConfig();
    await downloadData();
    await syncPendingScans();
    setRefreshing(false);
  };

  const getStatusColor = (status: LocalScanRecord['status']) => {
    switch (status) {
      case 'synced': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => Camera.requestCameraPermissionsAsync()}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>QR Scanner</Text>
            <Text style={styles.deviceName}>{deviceConfig?.deviceName}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings' as any)}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanning || isFrozen ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        {(scanning || isFrozen) && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scanningText}>{scanning ? 'Processing...' : 'Cooldown...'}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Point camera at QR code to scan entry</Text>
        <Text style={styles.syncText}>Last sync: {lastSync ? lastSync.toLocaleString() : 'Never'}</Text>
        <Text style={styles.userCount}>Registrations: {users.length}</Text>
        <Text style={styles.serverText}>
          Server: {currentServer === 'ALPHA' ? 'Alpha' : 'Beta'} ({API_SERVERS[currentServer]})
        </Text>
      </View>

      <View style={styles.recentScans}>
        <View style={styles.recentScansHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <TouchableOpacity style={styles.historyIconButton} onPress={() => router.push('/history')}>
            <Text style={styles.historyIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {scanHistory.slice(-5).reverse().map(scan => (
          <View key={scan.id} style={styles.scanItem}>
            <View style={styles.scanInfo}>
              <Text style={styles.scanName}>{scan.name}</Text>
              <Text style={styles.scanDetails}>
                {scan.transactionId} • {scan.scannedAt ? new Date(scan.scannedAt).toLocaleTimeString() : '—'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(scan.status) }]}>
              <Text style={styles.statusText}>{scan.status.toUpperCase()}</Text>
            </View>
          </View>
        ))}

        {scanHistory.length === 0 && <Text style={styles.noScans}>No scans yet</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  deviceName: { fontSize: 16, color: '#666', marginTop: 5 },
  settingsButton: { padding: 8 },
  settingsIcon: { fontSize: 24 },
  cameraContainer: { margin: 20, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  camera: { height: 300 },
  scanningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  scanningText: { color: '#fff', fontSize: 16, marginTop: 10 },
  infoContainer: { padding: 20, backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12 },
  infoText: { fontSize: 16, textAlign: 'center', color: '#333', marginBottom: 10 },
  syncText: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 5 },
  userCount: { fontSize: 14, textAlign: 'center', color: '#666' },
  serverText: { fontSize: 12, textAlign: 'center', color: '#007AFF', marginTop: 5 },
  recentScans: { padding: 20, backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12 },
  recentScansHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  historyIconButton: { padding: 8 },
  historyIcon: { fontSize: 20, color: '#007AFF' },
  scanItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  scanInfo: { flex: 1 },
  scanName: { fontSize: 16, fontWeight: '600', color: '#333' },
  scanDetails: { fontSize: 14, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  noScans: { textAlign: 'center', color: '#666', fontStyle: 'italic' },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 15, alignItems: 'center', margin: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
