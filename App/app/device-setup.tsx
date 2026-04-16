import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DeviceService } from '../services';
import { DeviceConfig } from '../types';

export default function DeviceSetupScreen() {
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkExistingConfig();
  }, []);

  const checkExistingConfig = async () => {
    const config = await DeviceService.getDeviceConfig();
    if (config?.isConfigured) {
      router.replace('/scanner');
    }
  };

  const handleSaveConfig = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = DeviceService.getDeviceInfo();
      const config: DeviceConfig = {
        deviceId: DeviceService.generateDeviceId(),
        deviceName: deviceName.trim(),
        isConfigured: true,
      };

      // Try to register device with server (with automatic fallback)
      const registrationResult = await DeviceService.tryRegisterWithFallback(config.deviceId, config.deviceName);

      if (!registrationResult.success) {
        // Both servers failed - don't allow user to proceed
        Alert.alert(
          'Connection Failed',
          'Unable to connect to any server. This could be due to:\n\n• No internet connection\n• Servers are currently unavailable\n\nPlease check your connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

       // Registration successful - save config and proceed
       await DeviceService.saveDeviceConfig(config);
       
       const serverName = registrationResult.serverUsed === 'ALPHA' ? 'Alpha' : registrationResult.serverUsed === 'BETA' ? 'Beta' : 'Solesta';
       Alert.alert(
         'Success',
         `Device registered successfully on ${serverName} server!`,
         [{ text: 'Continue', onPress: () => router.replace('/scanner') }]
       );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Device Setup</Text>
        <Text style={styles.subtitle}>
          Configure your device for QR code scanning
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Enter device name (e.g., Entrance Gate 1)"
            placeholderTextColor="#666"
            maxLength={50}
          />
          <Text style={styles.helperText}>
            This name will be visible when tracking scan records
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (!deviceName.trim() || loading) && styles.buttonDisabled]}
          onPress={handleSaveConfig}
          disabled={!deviceName.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});