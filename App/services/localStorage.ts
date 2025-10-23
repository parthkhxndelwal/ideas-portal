import AsyncStorage from '@react-native-async-storage/async-storage';
import { BatchEntry, EntryUpdate, Registration } from './scannerAPI';

const STORAGE_KEYS = {
  REGISTRATIONS: 'registrations',
  PENDING_SCANS: 'pendingScans',
  LAST_SYNC_AT: 'lastSyncAt',
  LAST_UPDATE_SYNC_AT: 'lastUpdateSyncAt',
};

export class LocalStorage {
  // Registrations
  async saveRegistrations(registrations: Registration[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    } catch (error) {
      console.error('Error saving registrations:', error);
      throw error;
    }
  }

  async getRegistrations(): Promise<Registration[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting registrations:', error);
      return [];
    }
  }

  async getRegistrationByRollNumber(rollNumber: string): Promise<Registration | null> {
    const registrations = await this.getRegistrations();
    return registrations.find(reg => reg.rollNumber === rollNumber) || null;
  }

  // Pending scans
  async savePendingScan(scan: BatchEntry): Promise<void> {
    try {
      const pendingScans = await this.getPendingScans();
      pendingScans.push(scan);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SCANS, JSON.stringify(pendingScans));
    } catch (error) {
      console.error('Error saving pending scan:', error);
      throw error;
    }
  }

  async getPendingScans(): Promise<BatchEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SCANS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending scans:', error);
      return [];
    }
  }

  async removePendingScans(scanIds: string[]): Promise<void> {
    try {
      const pendingScans = await this.getPendingScans();
      const filtered = pendingScans.filter(scan => !scanIds.includes(scan._id));
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SCANS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending scans:', error);
      throw error;
    }
  }

  async clearPendingScans(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SCANS);
    } catch (error) {
      console.error('Error clearing pending scans:', error);
    }
  }

  // Sync timestamps
  async saveLastSyncAt(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, timestamp);
    } catch (error) {
      console.error('Error saving last sync at:', error);
    }
  }

  async getLastSyncAt(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
    } catch (error) {
      console.error('Error getting last sync at:', error);
      return null;
    }
  }

  async saveLastUpdateSyncAt(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE_SYNC_AT, timestamp);
    } catch (error) {
      console.error('Error saving last update sync at:', error);
    }
  }

  async getLastUpdateSyncAt(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE_SYNC_AT);
    } catch (error) {
      console.error('Error getting last update sync at:', error);
      return null;
    }
  }

  // Update registrations with new data (merge)
  async updateRegistrations(newRegistrations: Registration[], lastSyncAt: string): Promise<void> {
    try {
      const existing = await this.getRegistrations();
      const existingMap = new Map(existing.map(reg => [reg._id, reg]));

      // Update existing and add new
      newRegistrations.forEach(reg => {
        existingMap.set(reg._id, reg);
      });

      const updated = Array.from(existingMap.values());
      await this.saveRegistrations(updated);
      await this.saveLastSyncAt(lastSyncAt);
    } catch (error) {
      console.error('Error updating registrations:', error);
      throw error;
    }
  }

  // Process entry updates (for conflict resolution)
  async processEntryUpdates(updates: EntryUpdate[]): Promise<void> {
    // This would be used to mark local entries as potentially conflicting
    // For now, just log them
    console.log('Entry updates received:', updates);
    // In a full implementation, you might want to flag local entries that conflict
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}

export const localStorage = new LocalStorage();