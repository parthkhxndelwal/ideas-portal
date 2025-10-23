import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Settings {
  vibration: boolean;
  autoOpen: boolean;
  saveHistory: boolean;
  beepOnScan: boolean;
  syncIntervalSeconds: number;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({
    vibration: true,
    autoOpen: false,
    saveHistory: true,
    beepOnScan: false,
    syncIntervalSeconds: 300, // 5 minutes default
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('settings');
      if (settingsStr) {
        setSettings(JSON.parse(settingsStr));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = (key: keyof Settings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings: Settings = {
              vibration: true,
              autoOpen: false,
              saveHistory: true,
              beepOnScan: false,
              syncIntervalSeconds: 300,
            };
            saveSettings(defaultSettings);
          },
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all scan history and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            const defaultSettings: Settings = {
              vibration: true,
              autoOpen: false,
              saveHistory: true,
              beepOnScan: false,
              syncIntervalSeconds: 300,
            };
            setSettings(defaultSettings);
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100)}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SCANNER BEHAVIOR</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="pulse-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Vibration</Text>
                <Text style={styles.settingDescription}>
                  Vibrate on successful scan
                </Text>
              </View>
            </View>
            <Switch
              value={settings.vibration}
              onValueChange={(value) => updateSetting('vibration', value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="musical-note-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Beep on Scan</Text>
                <Text style={styles.settingDescription}>
                  Play beep sound on successful scan
                </Text>
              </View>
            </View>
            <Switch
              value={settings.beepOnScan}
              onValueChange={(value) => updateSetting('beepOnScan', value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AUTOMATIC ACTIONS</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="open-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto Open URLs</Text>
                <Text style={styles.settingDescription}>
                  Automatically open scanned URLs
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoOpen}
              onValueChange={(value) => updateSetting('autoOpen', value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>HISTORY</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="save-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Save History</Text>
                <Text style={styles.settingDescription}>
                  Keep record of scanned codes
                </Text>
              </View>
            </View>
            <Switch
              value={settings.saveHistory}
              onValueChange={(value) => updateSetting('saveHistory', value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SYNC</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="sync-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Sync Interval</Text>
                <Text style={styles.settingDescription}>
                  How often to sync with server (seconds)
                </Text>
              </View>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{settings.syncIntervalSeconds}s</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500)}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ADVANCED</Text>

          <Pressable style={styles.settingItem} onPress={resetSettings}>
            <View style={styles.settingInfo}>
              <Ionicons name="refresh-circle-outline" size={24} color="#FF9500" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Reset Settings</Text>
                <Text style={styles.settingDescription}>
                  Restore default settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={clearAllData}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: '#FF3B30' }]}>
                  Clear All Data
                </Text>
                <Text style={styles.settingDescription}>
                  Delete history and reset settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>QR Scanner App v1.0.0</Text>
        <Text style={styles.footerSubtext}>
          Scan QR codes and barcodes with ease
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    color: '#000000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 17,
    color: '#8E8E93',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#C7C7CC',
  },
});
