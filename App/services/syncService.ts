import { localStorage } from './localStorage';
import { BatchEntry, scannerAPI } from './scannerAPI';

export class SyncService {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  async startPeriodicSync(intervalSeconds: number = 300) { // Default 5 minutes
    this.stopPeriodicSync();

    this.syncInterval = setInterval(async () => {
      try {
        await this.performFullSync();
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, intervalSeconds * 1000);

    // Perform initial sync
    await this.performFullSync();
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performFullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('Starting full sync...');

      // 1. Sync registrations
      await this.syncRegistrations();

      // 2. Upload pending scans
      await this.uploadPendingScans();

      // 3. Get updates for conflict resolution
      await this.syncUpdates();

      console.log('Full sync completed');
    } catch (error) {
      console.error('Full sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncRegistrations(): Promise<void> {
    try {
      const lastSyncAt = await localStorage.getLastSyncAt();
      const response = await scannerAPI.getRegistrations(lastSyncAt || undefined);

      if (response.registrations.length > 0) {
        await localStorage.updateRegistrations(response.registrations, response.lastSyncAt);
        console.log(`Synced ${response.registrations.length} registrations`);
      } else {
        console.log('No new registrations to sync');
      }
    } catch (error) {
      console.error('Registration sync failed:', error);
      throw error;
    }
  }

  private async uploadPendingScans(): Promise<void> {
    try {
      const pendingScans = await localStorage.getPendingScans();

      if (pendingScans.length === 0) {
        console.log('No pending scans to upload');
        return;
      }

      console.log(`Uploading ${pendingScans.length} pending scans...`);

      const response = await scannerAPI.uploadBatchScans(pendingScans);

      // Process results
      const acceptedIds: string[] = [];
      const rejectedIds: string[] = [];

      response.results.forEach(result => {
        if (result.status === 'accepted') {
          acceptedIds.push(result.entryId);
        } else {
          console.warn(`Scan ${result.entryId} ${result.status}: ${result.reason}`);
          // For rejected/conflict, we might want to keep them or remove based on policy
          // For now, remove all processed ones
          if (result.status === 'conflict') {
            acceptedIds.push(result.entryId); // Treat conflicts as accepted
          } else {
            rejectedIds.push(result.entryId);
          }
        }
      });

      // Remove processed scans
      await localStorage.removePendingScans(acceptedIds);

      console.log(`Uploaded ${acceptedIds.length} scans successfully`);

      if (rejectedIds.length > 0) {
        console.warn(`${rejectedIds.length} scans were rejected`);
        // Optionally, remove rejected ones or keep for manual review
        await localStorage.removePendingScans(rejectedIds);
      }
    } catch (error) {
      console.error('Pending scans upload failed:', error);
      throw error;
    }
  }

  private async syncUpdates(): Promise<void> {
    try {
      const lastUpdateSyncAt = await localStorage.getLastUpdateSyncAt();
      if (!lastUpdateSyncAt) {
        // First time, skip updates
        await localStorage.saveLastUpdateSyncAt(new Date().toISOString());
        return;
      }

      const response = await scannerAPI.getUpdates(lastUpdateSyncAt);

      if (response.entryUpdates.length > 0) {
        await localStorage.processEntryUpdates(response.entryUpdates);
        console.log(`Received ${response.entryUpdates.length} entry updates`);
      }

      await localStorage.saveLastUpdateSyncAt(response.lastSyncAt);
    } catch (error) {
      console.error('Updates sync failed:', error);
      throw error;
    }
  }

  async recordScan(scan: BatchEntry): Promise<void> {
    try {
      // Save locally first
      await localStorage.savePendingScan(scan);

      // Try to upload immediately if online
      try {
        await this.uploadPendingScans();
      } catch (uploadError) {
        console.log('Immediate upload failed, will retry in next sync');
      }
    } catch (error) {
      console.error('Failed to record scan:', error);
      throw error;
    }
  }

  getSyncStatus(): { isSyncing: boolean } {
    return { isSyncing: this.isSyncing };
  }
}

export const syncService = new SyncService();