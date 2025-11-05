import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ServerConfigService, SyncService, StorageService, DeviceService, API_SERVERS, ServerType } from '../services';

export default function SettingsScreen() {
  const [selectedServer, setSelectedServer] = useState<ServerType>('ALPHA');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCurrentServer();
  }, []);

  const loadCurrentServer = async () => {
    try {
      const server = await ServerConfigService.getSelectedServer();
      setSelectedServer(server);
    } catch (error) {
      console.error('Error loading server config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerSwitch = async (server: ServerType) => {
    if (server === selectedServer) {
      return;
    }

    Alert.alert(
      'Switch Server',
      `Are you sure you want to switch to ${server === 'ALPHA' ? 'Alpha' : 'Beta'} server?\n\n${API_SERVERS[server]}\n\nThis will refresh all registration data.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: () => performServerSwitch(server),
        },
      ]
    );
  };

  const performServerSwitch = async (server: ServerType) => {
    setSwitching(true);
    try {
      // Save the new server selection
      await ServerConfigService.setSelectedServer(server);
      setSelectedServer(server);

      // Get device config
      const deviceConfig = await DeviceService.getDeviceConfig();
      
      if (deviceConfig) {
        // Try to register device with the new server
        const registrationResult = await DeviceService.registerDevice(
          deviceConfig.deviceId,
          deviceConfig.deviceName
        );

        if (!registrationResult.success) {
          Alert.alert(
            'Registration Warning',
            `Switched to ${server === 'ALPHA' ? 'Alpha' : 'Beta'} server but device registration failed: ${registrationResult.message}. You can still use offline mode.`
          );
        }
      }

      // Clear existing user cache
      await StorageService.clearUserCache();

      // Download fresh data from the new server
      const result = await SyncService.downloadAndCacheData();

      if (result.success) {
        Alert.alert(
          'Server Switched',
          `Successfully switched to ${server === 'ALPHA' ? 'Alpha' : 'Beta'} server.\n\n${result.message}`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Warning', `Server switched but failed to download data: ${result.message}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to switch server. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Server</Text>
        <Text style={styles.sectionDescription}>
          Select which server to connect to for registration data
        </Text>

        <TouchableOpacity
          style={[
            styles.serverOption,
            selectedServer === 'ALPHA' && styles.serverOptionSelected,
            switching && styles.serverOptionDisabled,
          ]}
          onPress={() => handleServerSwitch('ALPHA')}
          disabled={switching}
        >
          <View style={styles.serverOptionContent}>
            <View style={styles.serverOptionHeader}>
              <Text style={styles.serverOptionTitle}>Alpha Server</Text>
              {selectedServer === 'ALPHA' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.serverOptionUrl}>{API_SERVERS.ALPHA}</Text>
          </View>
          {selectedServer === 'ALPHA' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.serverOption,
            selectedServer === 'BETA' && styles.serverOptionSelected,
            switching && styles.serverOptionDisabled,
          ]}
          onPress={() => handleServerSwitch('BETA')}
          disabled={switching}
        >
          <View style={styles.serverOptionContent}>
            <View style={styles.serverOptionHeader}>
              <Text style={styles.serverOptionTitle}>Beta Server</Text>
              {selectedServer === 'BETA' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.serverOptionUrl}>{API_SERVERS.BETA}</Text>
          </View>
          {selectedServer === 'BETA' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        {switching && (
          <View style={styles.switchingIndicator}>
            <ActivityIndicator color="#007AFF" />
            <Text style={styles.switchingText}>Switching server and refreshing data...</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          ℹ️ Switching servers will clear cached registration data and download fresh data from the selected server.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  serverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  serverOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  serverOptionDisabled: {
    opacity: 0.6,
  },
  serverOptionContent: {
    flex: 1,
  },
  serverOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  serverOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  serverOptionUrl: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginTop: 10,
  },
  switchingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    margin: 20,
    padding: 15,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});
