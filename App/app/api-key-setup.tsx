import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DeviceService } from '../services';

export default function ApiKeySetupScreen() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkExistingApiKey();
  }, []);

  const checkExistingApiKey = async () => {
    const existingKey = await DeviceService.getApiKey();
    if (existingKey) {
      // API key already configured, go to device setup
      router.replace('/device-setup');
    }
  };

  const handleContinue = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('scanner_')) {
      Alert.alert('Error', 'API key should start with "scanner_"');
      return;
    }

    setLoading(true);
    try {
      // Save the API key
      await DeviceService.setApiKey(apiKey.trim());

      Alert.alert(
        'Success',
        'API key saved successfully!',
        [{ text: 'Continue', onPress: () => router.replace('/device-setup') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>API Key Setup</Text>
        <Text style={styles.subtitle}>
          Enter your Scanner API Key to connect to the Solesta backend
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Where to get your API Key?</Text>
          <Text style={styles.infoText}>
            1. Go to the Admin Dashboard{'\n'}
            2. Navigate to Scanner Settings{'\n'}
            3. Click "Generate API Key"{'\n'}
            4. Copy the full key (starts with "scanner_"){'\n'}
            5. Paste it below
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="scanner_xxxxx_xxxxx"
            placeholderTextColor="#999"
            secureTextEntry={false}
            autoCapitalize="none"
            editable={!loading}
            multiline={true}
          />
          <Text style={styles.helperText}>
            This key authenticates your device with the backend server
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (!apiKey.trim() || loading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!apiKey.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Keep your API key secret. Do not share it with others.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 30,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
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
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
    fontFamily: 'monospace',
    minHeight: 60,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
  },
});
