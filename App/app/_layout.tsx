import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <Stack
          screenOptions={{
            headerShown: false, // Hide default headers since we handle them in screens
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Solesta Scanner",
            }}
          />
          <Stack.Screen
            name="api-key-setup"
            options={{
              title: "API Key Setup",
              gestureEnabled: false, // Prevent going back from setup
            }}
          />
          <Stack.Screen
            name="device-setup"
            options={{
              title: "Device Setup",
              gestureEnabled: false, // Prevent going back from setup
            }}
          />
          <Stack.Screen
            name="scanner"
            options={{
              title: "QR Scanner",
              gestureEnabled: false, // Prevent accidental back navigation
            }}
          />
          <Stack.Screen
            name="history"
            options={{
              title: "Scan History",
              presentation: "modal", // Show history as a modal
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: "Settings",
              presentation: "modal", // Show settings as a modal
            }}
          />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
