import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { DeviceService } from '../services';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // First check if API key is configured
      const apiKey = await DeviceService.getApiKey();
      if (!apiKey) {
        // No API key, need to setup first
        router.replace('/api-key-setup');
        return;
      }

      // Check if device is configured
      const config = await DeviceService.getDeviceConfig();

      if (config?.isConfigured) {
        // Device is configured, go to scanner
        router.replace('/scanner');
      } else {
        // Device not configured, go to setup
        router.replace('/device-setup');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      // On error, go to API key setup as fallback
      router.replace('/api-key-setup');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>
        Initializing Solesta Scanner...
      </Text>
    </View>
  );
}