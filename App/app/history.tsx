import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StorageService, SyncService } from '../services';
import { LocalScanRecord } from '../types';

export default function HistoryScreen() {
  const [scanHistory, setScanHistory] = useState<LocalScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    const history = await StorageService.getScanHistory();
    setScanHistory(history.sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime()));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScanHistory();
    setRefreshing(false);
  };

  const syncPendingScans = async () => {
    setSyncing(true);
    try {
      const result = await SyncService.syncPendingScans();
      await loadScanHistory();

      Alert.alert(
        'Sync Complete',
        `Synced: ${result.synced}, Failed: ${result.failed}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to sync scans');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: LocalScanRecord['status']) => {
    switch (status) {
      case 'synced': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: LocalScanRecord['status']) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStats = () => {
    const total = scanHistory.length;
    const synced = scanHistory.filter(s => s.status === 'synced').length;
    const pending = scanHistory.filter(s => s.status === 'pending').length;
    const failed = scanHistory.filter(s => s.status === 'failed').length;

    return { total, synced, pending, failed };
  };

  const stats = getStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.synced}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.buttonDisabled]}
        onPress={syncPendingScans}
        disabled={syncing}
      >
        <Text style={styles.syncButtonText}>
          {syncing ? 'Syncing...' : 'Sync Pending Scans'}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.historyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {scanHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No scans recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start scanning QR codes to see your history here
            </Text>
          </View>
        ) : (
          scanHistory.map((scan: LocalScanRecord) => (
            <View key={scan.id} style={styles.scanCard}>
              <View style={styles.scanHeader}>
                <View style={styles.scanInfo}>
                  <Text style={styles.scanName}>{scan.name}</Text>
                  <Text style={styles.scanRollNumber}>{scan.rollNumber}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(scan.status) }]}>
                  <Text style={styles.statusBadgeText}>{getStatusText(scan.status)}</Text>
                </View>
              </View>

              <View style={styles.scanDetails}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue}>{scan.transactionId}</Text>
              </View>

              <View style={styles.scanDetails}>
                <Text style={styles.detailLabel}>QR Type:</Text>
                <Text style={styles.detailValue}>{scan.qrType}</Text>
              </View>

              <View style={styles.scanDetails}>
                <Text style={styles.detailLabel}>Device:</Text>
                <Text style={styles.detailValue}>{scan.deviceName}</Text>
              </View>

              <View style={styles.scanDetails}>
                <Text style={styles.detailLabel}>Scanned At:</Text>
                <Text style={styles.detailValue}>{formatDateTime(scan.scannedAt)}</Text>
              </View>

              {scan.serverResponse && (
                <View style={styles.serverResponse}>
                  <Text style={styles.detailLabel}>Server Response:</Text>
                  <Text style={styles.detailValue}>
                    {scan.serverResponse.alreadyScanned
                      ? `Already scanned by ${scan.serverResponse.scannedBy} at ${scan.serverResponse.scannedAt ? new Date(scan.serverResponse.scannedAt).toLocaleString() : 'unknown time'}`
                      : 'Entry recorded successfully'
                    }
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scanRollNumber: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scanDetails: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  serverResponse: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});