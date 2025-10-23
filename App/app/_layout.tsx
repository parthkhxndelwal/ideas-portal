import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { localStorage } from "../services/localStorage";
import { scannerAPI } from "../services/scannerAPI";
import { syncService } from "../services/syncService";
import NetworkNeeded from "./NetworkNeeded";

export default function RootLayout() {
  const [isHealthy, setIsHealthy] = useState(false);

  useEffect(() => {
    const checkHealthAndInitialize = async () => {
      const healthy = await scannerAPI.healthCheck();
      if (healthy) {
        setIsHealthy(true);
        initializeApp();
      } else {
        setIsHealthy(false);
        // start polling
        const interval = setInterval(async () => {
          const healthy = await scannerAPI.healthCheck();
          if (healthy) {
            setIsHealthy(true);
            clearInterval(interval);
            initializeApp();
          }
        }, 5000);
      }
    };

    checkHealthAndInitialize();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if device is registered
      if (!scannerAPI.isRegistered()) {
        console.log('Device not registered, registering...');
        // Get device info
        const deviceName = 'Ideas Scanner App';
        const location = 'Mobile Device';
        const appVersion = '1.0.0'; // You might want to get this from package.json

        const registration = await scannerAPI.registerDevice(deviceName, location, appVersion);
        console.log('Device registered:', registration.deviceId);

        // Save sync interval
        await AsyncStorage.setItem('syncIntervalSeconds', registration.syncIntervalSeconds.toString());
      }

      // Download initial registrations
      console.log('Downloading registrations...');
      const response = await scannerAPI.getRegistrations();
      await localStorage.updateRegistrations(response.registrations, response.lastSyncAt);
      console.log(`Downloaded ${response.registrations.length} registrations`);

      // Get sync interval from settings or use default
      const savedInterval = await AsyncStorage.getItem('syncIntervalSeconds');
      const syncInterval = savedInterval ? parseInt(savedInterval, 10) : 300; // 5 minutes default

      // Start periodic sync
      syncService.startPeriodicSync(syncInterval);
      console.log(`Started sync service with ${syncInterval}s interval`);

    } catch (error) {
      console.error('App initialization failed:', error);
      // Continue without sync for offline mode
      console.log('Continuing in offline mode');
    }
  };

  if (!isHealthy) {
    return <NetworkNeeded />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
