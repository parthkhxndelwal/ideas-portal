import { decryptQRData } from './crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { ApiResponse, User, MobileUser, LocalScanRecord, DeviceConfig, CachedData, ScanResult, QRData, UsersApiResponse } from './types';

// Configuration
export const API_SERVERS = {
  SOLESTA: 'https://solesta.krmangalam.edu.in',
} as const;

export type ServerType = keyof typeof API_SERVERS;

const STORAGE_KEYS = {
  DEVICE_CONFIG: 'device_config',
  CACHED_USERS: 'cached_users',
  SCAN_HISTORY: 'scan_history',
  LAST_SYNC: 'last_sync',
  API_SERVER: 'api_server',
  API_KEY: 'api_key',
};

// Server Configuration Service
export class ServerConfigService {
  static async getSelectedServer(): Promise<ServerType> {
    try {
      const server = await AsyncStorage.getItem(STORAGE_KEYS.API_SERVER);
      return (server as ServerType) || 'SOLESTA';
    } catch {
      return 'SOLESTA';
    }
  }

  static async setSelectedServer(server: ServerType): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_SERVER, server);
    } catch (error) {
      throw error;
    }
  }

  static async getApiBaseUrl(): Promise<string> {
    const server = await this.getSelectedServer();
    return API_SERVERS[server];
  }
}

// Device Management
export class DeviceService {
  static async getDeviceConfig(): Promise<DeviceConfig | null> {
    try {
      const config = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch {
      return null;
    }
  }

  static async saveDeviceConfig(config: DeviceConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_CONFIG, JSON.stringify(config));
    } catch (error) {
      throw error;
    }
  }

  static async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
    } catch {
      return null;
    }
  }

  static async setApiKey(apiKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    } catch (error) {
      throw error;
    }
  }

  static async clearApiKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_KEY);
    } catch (error) {
      throw error;
    }
  }

  static async registerDevice(deviceId: string, deviceName: string): Promise<{ success: boolean; message: string; device?: any }> {
    try {
      const apiBaseUrl = await ServerConfigService.getApiBaseUrl();
      const apiKey = await this.getApiKey();
      
      const response = await fetch(`${apiBaseUrl}/api/scanner/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify({
          deviceId,
          deviceName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        message: data.message || 'Device registered successfully',
        device: data.device,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  static async tryRegisterWithFallback(deviceId: string, deviceName: string): Promise<{ 
    success: boolean; 
    message: string; 
    device?: any; 
    serverUsed?: ServerType;
  }> {
    // Try current server first (should be SOLESTA)
    let result = await this.registerDevice(deviceId, deviceName);
    if (result.success) {
      const currentServer = await ServerConfigService.getSelectedServer();
      return { ...result, serverUsed: currentServer };
    }

    // Current server failed, try other servers as fallback (dynamic based on API_SERVERS)
    const currentServer = await ServerConfigService.getSelectedServer();
    const allServers: ServerType[] = Object.keys(API_SERVERS) as ServerType[];
    const fallbackServers = allServers.filter(s => s !== currentServer);
    
    // Try each fallback server
    for (const fallbackServer of fallbackServers) {
      await ServerConfigService.setSelectedServer(fallbackServer);
      result = await this.registerDevice(deviceId, deviceName);
      
      if (result.success) {
        return { ...result, serverUsed: fallbackServer };
      }
    }

    // All servers failed - switch back to original
    await ServerConfigService.setSelectedServer(currentServer);
    
    return {
      success: false,
      message: 'Failed to connect to all servers. Please check your internet connection.',
    };
  }

  static generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDeviceInfo() {
    return {
      deviceId: Device.deviceName || Device.modelName || 'Unknown Device',
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    };
  }
}

// API Service
export class ApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const apiBaseUrl = await ServerConfigService.getApiBaseUrl();
      const url = `${apiBaseUrl}${endpoint}`;
      const apiKey = await DeviceService.getApiKey();

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  static async downloadRegistrationData(): Promise<ApiResponse<UsersApiResponse>> {
    return this.makeRequest<UsersApiResponse>('/api/scanner/users');
  }

  static async validateRegistration(
    transactionId: string
  ): Promise<ApiResponse<MobileUser>> {
    return this.makeRequest<MobileUser>(
      `/api/scanner/validate/${encodeURIComponent(transactionId)}`
    );
  }

  static async recordEntry(
    scanData: {
      transactionId: string;
      rollNumber?: string;
      name: string;
      qrType: "participant" | "volunteer";
      deviceId: string;
      deviceName: string;
    }
  ): Promise<ApiResponse<ScanResult>> {
    return this.makeRequest<ScanResult>('/api/scanner/record-entry', {
      method: 'POST',
      body: JSON.stringify(scanData),
    });
  }

  static async getScanUpdates(since: Date): Promise<ApiResponse<LocalScanRecord[]>> {
    return this.makeRequest<LocalScanRecord[]>(`/api/scanner/updates?since=${since.toISOString()}`);
  }
}

// Storage Service
export class StorageService {
  static async saveUserCache(users: MobileUser[]): Promise<void> {
    try {
      const cacheData: CachedData = {
        users,
        lastUpdated: new Date(),
        version: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_USERS, JSON.stringify(cacheData));
    } catch (error) {
      throw error;
    }
  }

  static async getUserCache(): Promise<CachedData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_USERS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async clearUserCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_USERS);
    } catch (error) {
      throw error;
    }
  }

  static async saveScanRecord(record: LocalScanRecord): Promise<void> {
    try {
      const history = await this.getScanHistory();
      history.push(record);
      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
    } catch (error) {
      throw error;
    }
  }

  static async getScanHistory(): Promise<LocalScanRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      const history = data ? JSON.parse(data) : [];
      return history.map((record: any) => ({
        ...record,
        scannedAt: record.scannedAt ? new Date(record.scannedAt) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  static async updateScanRecordStatus(scanId: string, status: LocalScanRecord['status'], serverResponse?: any): Promise<void> {
    try {
      const history = await this.getScanHistory();
      const recordIndex = history.findIndex(record => record.id === scanId);

      if (recordIndex !== -1) {
        history[recordIndex].status = status;
        if (serverResponse) {
          history[recordIndex].serverResponse = serverResponse;
        }
        await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
      }
    } catch (error) {
      throw error;
    }
  }

  static async isTransactionScanned(transactionId: string): Promise<boolean> {
    try {
      const history = await this.getScanHistory();
      return history.some(record =>
        record.transactionId === transactionId &&
        (record.status === 'synced' || record.status === 'pending')
      );
    } catch {
      return false;
    }
  }

  static async findLatestScanByRollNumber(rollNumber?: string): Promise<LocalScanRecord | undefined> {
    if (!rollNumber) {
      return undefined;
    }

    try {
      const history = await this.getScanHistory();
      for (let i = history.length - 1; i >= 0; i--) {
        const record = history[i];
        if (
          record.rollNumber === rollNumber &&
          (record.status === 'synced' || record.status === 'pending')
        ) {
          return record;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  static async saveLastSyncTime(timestamp: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toISOString());
    } catch (error) {
      throw error;
    }
  }

  static async getLastSyncTime(): Promise<Date | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch {
      return null;
    }
  }
}

// QR Code Utilities
export class QRService {
  static parseQRData(qrString: string): QRData | null {
    try {
      const decryptedResult = decryptQRData(qrString);

      if (decryptedResult.isValid) {
        const { transactionId, qrType } = decryptedResult;

        if (!transactionId) {
          return null;
        }

        return {
          type: qrType as "participant" | "volunteer",
          transactionId,
          timestamp: Date.now(),
        };
      }

      const parts = qrString.split('_');
      if (parts.length < 3 || parts[1] !== 'solesta') {
        return null;
      }

      const type = parts[0] as "participant" | "volunteer";
      const transactionId = parts.slice(2).join('_');

      if (!type || !transactionId) {
        return null;
      }

      return {
        type,
        transactionId,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  // Legacy method - kept for backwards compatibility but not used
  static validateQRData(qrData: QRData, users: MobileUser[]): { isValid: boolean; user?: MobileUser; error?: string } {
    const user = users.find(u => u.transactionId === qrData.transactionId);

    if (!user) {
      return {
        isValid: false,
        error: 'QR code not found in registration data. Please ensure data is up to date.',
      };
    }

    return {
      isValid: true,
      user,
    };
  }

  // New method - validates registration directly from server
  static async validateQRDataWithServer(qrData: QRData): Promise<{ isValid: boolean; user?: MobileUser; error?: string }> {
    try {
      const response = await ApiService.validateRegistration(qrData.transactionId);

      if (!response.success) {
        return {
          isValid: false,
          error: response.error || 'Failed to validate registration',
        };
      }

      const user = response.data;
      if (!user) {
        return {
          isValid: false,
          error: 'Invalid registration data received from server',
        };
      }

      return {
        isValid: true,
        user,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate registration',
      };
    }
  }
}

// Data Synchronization
export class SyncService {
  static async downloadAndCacheData(): Promise<{ success: boolean; message: string; userCount?: number }> {
    try {
      const response = await ApiService.downloadRegistrationData();

      if (!response.success) {
        return {
          success: false,
          message: response.error || 'Failed to download registration data',
        };
      }

      const users = response.data?.users || [];

      await StorageService.saveUserCache(users);
      await StorageService.saveLastSyncTime(new Date());

      return {
        success: true,
        message: `Downloaded ${users.length} registrations`,
        userCount: users.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async downloadWithFallback(): Promise<{ 
    success: boolean; 
    message: string; 
    userCount?: number;
    serverUsed?: ServerType;
  }> {
    // Try current server first
    let result = await this.downloadAndCacheData();
    if (result.success) {
      const currentServer = await ServerConfigService.getSelectedServer();
      return { ...result, serverUsed: currentServer };
    }

    // Current server failed, try other servers as fallback (dynamic based on API_SERVERS)
    const currentServer = await ServerConfigService.getSelectedServer();
    const allServers: ServerType[] = Object.keys(API_SERVERS) as ServerType[];
    const fallbackServers = allServers.filter(s => s !== currentServer);
    
    // Try each fallback server
    for (const fallbackServer of fallbackServers) {
      await ServerConfigService.setSelectedServer(fallbackServer);
      result = await this.downloadAndCacheData();
      
      if (result.success) {
        return { ...result, serverUsed: fallbackServer };
      }
    }

    // All servers failed - switch back to original
    await ServerConfigService.setSelectedServer(currentServer);
    
    return {
      success: false,
      message: 'Failed to connect to all servers. Please check your internet connection.',
    };
  }

  static async syncPendingScans(): Promise<{ synced: number; failed: number }> {
    try {
      const history = await StorageService.getScanHistory();
      const pendingScans = history.filter(record => record.status === 'pending');

      let synced = 0;
      let failed = 0;

      for (const scan of pendingScans) {
        try {
          const result = await ApiService.recordEntry({
            transactionId: scan.transactionId,
            rollNumber: scan.rollNumber,
            name: scan.name,
            qrType: scan.qrType,
            deviceId: scan.deviceId,
            deviceName: scan.deviceName,
          });

          if (result.success) {
            await StorageService.updateScanRecordStatus(scan.id, 'synced', result.data);
            synced++;
          } else {
            await StorageService.updateScanRecordStatus(scan.id, 'failed', result);
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return { synced, failed };
    } catch {
      return { synced: 0, failed: 0 };
    }
  }
}
