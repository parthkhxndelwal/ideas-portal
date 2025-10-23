import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = "http://192.168.1.7:3000/api/";

export interface DeviceRegistration {
  deviceId: string;
  token: string;
  syncIntervalSeconds: number;
  maxBatchSize: number;
}

export interface Registration {
  _id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  rollNumber: string;
  name: string;
  courseAndSemester: string;
  year: string;
  registrationStatus: string;
  transactionId?: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchEntry {
  _id: string; // client-generated scan ID
  rollNumber: string;
  name: string;
  qrType: 'participant' | 'volunteer';
  transactionId?: string;
  entryDate: string;
  entryTimestamp: string;
  scannedBy: string;
  createdAt: string;
}

export interface BatchResult {
  entryId: string;
  status: 'accepted' | 'conflict' | 'rejected';
  reason?: string;
  appliedAt?: string;
}

export interface EntryUpdate {
  rollNumber: string;
  lastSeen: string;
  sourceDeviceId: string;
}

class ScannerAPI {
  private token: string | null = null;
  private deviceId: string | null = null;

  constructor() {
    this.loadCredentials();
  }

  private async loadCredentials() {
    try {
      const token = await AsyncStorage.getItem('deviceToken');
      const deviceId = await AsyncStorage.getItem('deviceId');
      this.token = token;
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }

  private async saveCredentials(token: string, deviceId: string) {
    try {
      await AsyncStorage.setItem('deviceToken', token);
      await AsyncStorage.setItem('deviceId', deviceId);
      this.token = token;
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async registerDevice(name: string, location: string, appVersion: string): Promise<DeviceRegistration> {
    try {
      const response = await fetch(`${API_BASE_URL}/scanner-react/devices/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name,
          location,
          appVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      await this.saveCredentials(data.token, data.deviceId);
      return data;
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }

  async getRegistrations(since?: string, limit?: number): Promise<{
    lastSyncAt: string;
    registrations: Registration[];
  }> {
    try {
      const params = new URLSearchParams();
      if (since) params.append('since', since);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/scanner-react/registrations?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch registrations');
      }

      return await response.json();
    } catch (error) {
      console.error('Get registrations error:', error);
      throw error;
    }
  }

  async uploadBatchScans(entries: BatchEntry[]): Promise<{
    processedAt: string;
    results: BatchResult[];
  }> {
    if (!this.deviceId) {
      throw new Error('Device not registered');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/scanner-react/scans/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          deviceId: this.deviceId,
          entries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Batch upload error:', error);
      throw error;
    }
  }

  async getUpdates(since: string): Promise<{
    lastSyncAt: string;
    entryUpdates: EntryUpdate[];
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/scanner-react/updates?since=${encodeURIComponent(since)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch updates');
      }

      return await response.json();
    } catch (error) {
      console.error('Get updates error:', error);
      throw error;
    }
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  getToken(): string | null {
    return this.token;
  }

  isRegistered(): boolean {
    return !!(this.token && this.deviceId);
  }

  async healthCheck(): Promise<boolean> {
    console.log('Attempting health check...');
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }
      return false;
    } catch (error) {
      console.log('Health check error:', error);
      return false;
    }
  }
}

export const scannerAPI = new ScannerAPI();