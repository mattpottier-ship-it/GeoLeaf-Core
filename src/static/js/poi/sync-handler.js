/**
 * POI Synchronization Handler Module
 * Manages offline/online POI synchronization with conflict resolution
 * @module poi/sync-handler
 */

(function (global) {
  'use strict';

  const GeoLeaf = global.GeoLeaf || {};
  if (!GeoLeaf.POI) GeoLeaf.POI = {};

  /**
   * POI Sync Handler
   * Manages synchronization of POI operations (add, update, delete) with server
   */
  GeoLeaf.POI.SyncHandler = {
    _config: null,
    _syncing: false,
    _currentBackupId: null,

    /**
     * Initialize sync handler
     * @param {Object} config - Configuration from geoleaf.config.json
     */
    init(config) {
      this._config = config || {
        enabled: true,
        endpoints: {
          addPoi: '/api/pois',
          updatePoi: '/api/pois/{id}',
          deletePoi: '/api/pois/{id}'
        },
        conflictResolution: 'timestamp',
        retryAttempts: 3,
        retryDelay: 2000
      };

      // Clean old backups on init
      if (GeoLeaf.Storage && GeoLeaf.Storage.DB) {
        const retentionDays = config.storage?.sync?.backupRetentionDays || 5;
        GeoLeaf.Storage.DB.cleanOldBackups(retentionDays).catch(err => {
          console.error('[SyncHandler] Failed to clean old backups:', err);
        });
      }

      // Listen for online event to auto-sync - avec cleanup tracking
      const events = GeoLeaf.Utils?.events;
      if (events) {
        this._eventCleanups = this._eventCleanups || [];
        this._eventCleanups.push(
          events.on(
            document,
            'geoleaf:online',
            () => this.autoSync(),
            false,
            'SyncHandler.online'
          )
        );
      } else {
        console.warn('[SyncHandler] EventListenerManager not available - listener will not be cleaned up');
        document.addEventListener('geoleaf:online', () => {
          this.autoSync();
        });
      }

      const Log = GeoLeaf.Log || console;
      Log.debug('[SyncHandler] Module initialized', this._config);
    },

    /**
     * Cleanup event listeners
     */
    destroy() {
      // Cleanup event listeners
      if (this._eventCleanups && this._eventCleanups.length > 0) {
        this._eventCleanups.forEach(cleanup => {
          if (typeof cleanup === 'function') cleanup();
        });
        this._eventCleanups = [];
        const Log = GeoLeaf.Log || console;
        Log.debug('[SyncHandler] Event listeners cleaned up');
      }
    },

    /**
     * Queue a POI operation for synchronization
     * @param {string} type - Operation type: 'add_poi' | 'update_poi' | 'delete_poi'
     * @param {Object} poiData - POI data
     * @returns {Promise<string>} - Queue entry ID
     */
    async queueOperation(type, poiData) {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        throw new Error('Storage not available');
      }

      const profile = GeoLeaf.Config ? GeoLeaf.Config.getActiveProfile() : null;
      const profileId = profile ? profile.id : 'default';

      const entry = {
        type: type,
        layerId: poiData._layerConfig ? poiData._layerConfig.id : null,
        poiData: poiData,
        profileId: profileId
      };

      const entryId = await GeoLeaf.Storage.DB.addToSyncQueue(entry);

      const Log = GeoLeaf.Log || console;
      Log.debug(`[SyncHandler] Queued ${type} for POI ${poiData.id}`);

      // Emit event
      document.dispatchEvent(new CustomEvent('geoleaf:poi:queued', {
        detail: { type, poiId: poiData.id, entryId }
      }));

      return entryId;
    },

    /**
     * Get summary of pending operations
     * @returns {Promise<Object>} - Summary with counts by operation type
     */
    async getSyncSummary() {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        return { total: 0, add: 0, update: 0, delete: 0 };
      }

      return await GeoLeaf.Storage.DB.getSyncQueueSummary();
    },

    /**
     * Auto-sync when coming online (if enabled)
     */
    async autoSync() {
      if (!this._config.enabled) return;

      const summary = await this.getSyncSummary();

      if (summary.pending > 0) {
        const Log = GeoLeaf.Log || console;
        Log.info('[SyncHandler] Auto-sync triggered, pending operations:', summary.pending);

        // Optional: Show notification
        if (GeoLeaf.UI && GeoLeaf.UI.notify) {
          GeoLeaf.UI.notify.info(`${summary.pending} opération(s) en attente de synchronisation`);
        }

        // Don't auto-sync immediately, let user decide
        // await this.processSyncQueue();
      }
    },

    /**
     * Process all pending operations in sync queue
     * @param {Object} options - Processing options
     * @param {boolean} options.createBackup - Create backup before syncing (default: true)
     * @param {Function} options.progressCallback - Progress callback
     * @returns {Promise<Object>} - Sync results
     */
    async processSyncQueue(options = {}) {
      if (this._syncing) {
        throw new Error('Synchronisation déjà en cours');
      }

      if (!navigator.onLine) {
        throw new Error('Aucune connexion Internet disponible');
      }

      this._syncing = true;
      const createBackup = options.createBackup !== false;
      const progressCallback = options.progressCallback || null;

      try {
        // Get pending operations
        const pending = await GeoLeaf.Storage.DB.getPendingSyncQueue();
        const Log = GeoLeaf.Log || console;

        if (pending.length === 0) {
          Log.debug('[SyncHandler] No pending operations');
          this._syncing = false;
          return { success: true, total: 0, synced: 0, failed: 0, skipped: 0 };
        }

        Log.info(`[SyncHandler] Processing ${pending.length} pending operations`);

        // Create backup before syncing
        if (createBackup) {
          await this._createBackup(pending);
        }

        // Process each operation
        const results = {
          total: pending.length,
          synced: 0,
          failed: 0,
          skipped: 0,
          errors: []
        };

        for (let i = 0; i < pending.length; i++) {
          const entry = pending[i];

          try {
            // Update progress
            if (progressCallback) {
              progressCallback({
                current: i + 1,
                total: pending.length,
                operation: entry.type,
                poiId: entry.poiData.id
              });
            }

            // Process operation
            const result = await this._processOperation(entry);

            if (result.success) {
              results.synced++;
              await GeoLeaf.Storage.DB.updateSyncQueueStatus(entry.id, 'synced');
            } else if (result.skipped) {
              results.skipped++;
              await GeoLeaf.Storage.DB.updateSyncQueueStatus(entry.id, 'skipped', result.reason);
            } else {
              results.failed++;
              await GeoLeaf.Storage.DB.updateSyncQueueStatus(entry.id, 'failed', result.error);
              results.errors.push({
                entryId: entry.id,
                poiId: entry.poiData.id,
                error: result.error
              });
            }

          } catch (error) {
            console.error(`[SyncHandler] Error processing entry ${entry.id}:`, error);
            results.failed++;
            results.errors.push({
              entryId: entry.id,
              poiId: entry.poiData.id,
              error: error.message
            });
          }
        }

        // Clean up synced entries
        for (const entry of pending) {
          const status = await GeoLeaf.Storage.DB.getSyncQueueEntry(entry.id);
          if (status && status.status === 'synced') {
            await GeoLeaf.Storage.DB.removeSyncQueueEntry(entry.id);
          }
        }

        console.log('[SyncHandler] Sync completed:', results);

        // Emit completion event
        document.dispatchEvent(new CustomEvent('geoleaf:poi:sync-completed', {
          detail: results
        }));

        // Show notification
        if (GeoLeaf.UI && GeoLeaf.UI.notify) {
          if (results.failed === 0) {
            GeoLeaf.UI.notify.success(`✓ ${results.synced} opération(s) synchronisée(s)`);
          } else {
            GeoLeaf.UI.notify.warning(`${results.synced} synchronisée(s), ${results.failed} échouée(s)`);
          }
        }

        this._syncing = false;
        return { success: true, ...results };

      } catch (error) {
        console.error('[SyncHandler] Sync failed:', error);
        this._syncing = false;

        // Try to restore backup if critical error
        if (this._currentBackupId && createBackup) {
          console.warn('[SyncHandler] Critical error, backup available for restoration');
        }

        throw error;
      }
    },

    /**
     * Process a single operation
     * @private
     */
    async _processOperation(entry) {
      const { type, poiData } = entry;

      switch (type) {
        case 'add_poi':
          return await this._syncAddPoi(poiData);

        case 'update_poi':
          return await this._syncUpdatePoi(poiData);

        case 'delete_poi':
          return await this._syncDeletePoi(poiData);

        default:
          return { success: false, error: `Unknown operation type: ${type}` };
      }
    },

    /**
     * Sync add POI operation
     * @private
     */
    async _syncAddPoi(poiData) {
      try {
        const endpoint = this._config.endpoints.addPoi;

        // Prepare headers with CSRF token protection
        const headers = {
          'Content-Type': 'application/json'
        };

        // Add CSRF token if available
        const CSRFToken = GeoLeaf.Security?.CSRFToken;
        if (CSRFToken) {
          CSRFToken.addTokenToHeaders(headers);
        }

        // Sprint 3.3: Use unified FetchHelper for POI sync operations
        const FetchHelper = GeoLeaf.Utils?.FetchHelper;
        let response;

        if (FetchHelper) {
          response = await FetchHelper.fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              poi: poiData,
              timestamp: poiData.lastModified
            }),
            timeout: 12000, // POI sync may take longer
            retries: 2,
            parseResponse: false // Handle response parsing manually
          });
        } else {
          // Fallback to raw fetch
          response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              poi: poiData,
              timestamp: poiData.lastModified
            })
          });
        }

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Update temporary ID with permanent ID from server
        if (result.id && poiData.id.startsWith('temp_')) {
          console.log(`[SyncHandler] Updating temp ID ${poiData.id} -> ${result.id}`);
          // Update POI in map
          if (GeoLeaf.POI && GeoLeaf.POI.updatePoiId) {
            GeoLeaf.POI.updatePoiId(poiData.id, result.id);
          }
        }

        return { success: true, newId: result.id };

      } catch (error) {
        console.error('[SyncHandler] Add POI failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Sync update POI operation
     * @private
     */
    async _syncUpdatePoi(poiData) {
      try {
        const endpoint = this._config.endpoints.updatePoi.replace('{id}', poiData.id);

        // Prepare headers with CSRF token protection
        const headers = {
          'Content-Type': 'application/json'
        };

        // Add CSRF token if available
        const CSRFToken = GeoLeaf.Security?.CSRFToken;
        if (CSRFToken) {
          CSRFToken.addTokenToHeaders(headers);
        }

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify({
            poi: poiData,
            timestamp: poiData.lastModified
          })
        });

        // Handle conflict (409)
        if (response.status === 409) {
          const conflict = await response.json();
          return await this._handleConflict(poiData, conflict);
        }

        // Handle not found (404) - POI deleted on server
        if (response.status === 404) {
          console.warn(`[SyncHandler] POI ${poiData.id} not found on server, adding as new`);
          return await this._syncAddPoi(poiData);
        }

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        return { success: true };

      } catch (error) {
        console.error('[SyncHandler] Update POI failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Sync delete POI operation
     * @private
     */
    async _syncDeletePoi(poiData) {
      try {
        const endpoint = this._config.endpoints.deletePoi.replace('{id}', poiData.id);

        // Prepare headers with CSRF token protection
        const headers = {
          'Content-Type': 'application/json'
        };

        // Add CSRF token if available
        const CSRFToken = GeoLeaf.Security?.CSRFToken;
        if (CSRFToken) {
          CSRFToken.addTokenToHeaders(headers);
        }

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: headers,
          body: JSON.stringify({
            id: poiData.id,
            timestamp: poiData.lastModified || Date.now()
          })
        });

        // 404 is acceptable for delete (already deleted)
        if (response.status === 404) {
          console.log(`[SyncHandler] POI ${poiData.id} already deleted on server`);
          return { success: true };
        }

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        return { success: true };

      } catch (error) {
        console.error('[SyncHandler] Delete POI failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Handle sync conflict
     * @private
     */
    async _handleConflict(localPoi, conflict) {
      const serverPoi = conflict.serverData;
      const serverTimestamp = conflict.serverLastModified;
      const localTimestamp = localPoi.lastModified;

      console.warn('[SyncHandler] Conflict detected:', {
        poiId: localPoi.id,
        localTimestamp: new Date(localTimestamp).toISOString(),
        serverTimestamp: new Date(serverTimestamp).toISOString()
      });

      // Auto-resolve based on config
      if (this._config.conflictResolution === 'timestamp') {
        // Local is source of truth, force update
        return await this._forceUpdate(localPoi);
      }

      // Prompt user (would need UI implementation)
      // For now, just force update as per requirements
      return await this._forceUpdate(localPoi);
    },

    /**
     * Force update on server (local overwrites server)
     * @private
     */
    async _forceUpdate(poiData) {
      try {
        const endpoint = this._config.endpoints.updatePoi.replace('{id}', poiData.id);

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Force-Update': 'true' // Tell server to overwrite
          },
          body: JSON.stringify({
            poi: poiData,
            timestamp: poiData.lastModified,
            force: true
          })
        });

        if (!response.ok) {
          throw new Error(`Force update failed: ${response.status}`);
        }

        console.log(`[SyncHandler] Forced update for POI ${poiData.id}`);
        return { success: true, forced: true };

      } catch (error) {
        console.error('[SyncHandler] Force update failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Create backup before syncing
     * @private
     */
    async _createBackup(pendingOperations) {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        console.warn('[SyncHandler] Storage not available, skipping backup');
        return;
      }

      try {
        // Get current POI layers data
        const profile = GeoLeaf.Config ? GeoLeaf.Config.getActiveProfile() : null;
        const allPois = GeoLeaf.POI && GeoLeaf.POI.getAllPois ? GeoLeaf.POI.getAllPois() : [];

        const backup = {
          profileId: profile ? profile.id : 'default',
          layersSnapshot: allPois,
          syncQueueSnapshot: pendingOperations,
          operationsCount: pendingOperations.length,
          description: `Backup avant sync de ${pendingOperations.length} opération(s)`
        };

        this._currentBackupId = await GeoLeaf.Storage.DB.createBackup(backup);

        console.log(`[SyncHandler] Backup created: #${this._currentBackupId}`);

      } catch (error) {
        console.error('[SyncHandler] Failed to create backup:', error);
        // Don't fail the sync just because backup failed
      }
    },

    /**
     * Restore from backup
     * @param {number} backupId - Backup ID to restore
     * @returns {Promise<boolean>} - Success status
     */
    async restoreBackup(backupId) {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        throw new Error('Storage not available');
      }

      try {
        const backup = await GeoLeaf.Storage.DB.getBackup(backupId);

        if (!backup) {
          throw new Error(`Backup #${backupId} not found`);
        }

        const confirmed = confirm(
          `Voulez-vous restaurer la sauvegarde du ${new Date(backup.timestamp).toLocaleString()} ?\n\n` +
          `Cela annulera les modifications synchronisées et restaurera ${backup.operationsCount} opération(s).`
        );

        if (!confirmed) {
          return false;
        }

        console.log(`[SyncHandler] Restoring backup #${backupId}...`);

        // Restore POI data
        if (backup.layersSnapshot && Array.isArray(backup.layersSnapshot)) {
          // Clear current POIs and restore from backup
          if (GeoLeaf.POI && GeoLeaf.POI.clearAllPois && GeoLeaf.POI.loadPois) {
            GeoLeaf.POI.clearAllPois();
            backup.layersSnapshot.forEach(poi => {
              GeoLeaf.POI.addPoi(poi);
            });
          }
        }

        // Restore sync queue
        if (backup.syncQueueSnapshot && Array.isArray(backup.syncQueueSnapshot)) {
          // Clear current queue and restore
          const currentQueue = await GeoLeaf.Storage.DB.getPendingSyncQueue();
          for (const entry of currentQueue) {
            await GeoLeaf.Storage.DB.removeSyncQueueEntry(entry.id);
          }

          // Re-add backup entries
          for (const entry of backup.syncQueueSnapshot) {
            await GeoLeaf.Storage.DB.addToSyncQueue({
              type: entry.type,
              layerId: entry.layerId,
              poiData: entry.poiData,
              profileId: entry.profileId
            });
          }
        }

        if (GeoLeaf.UI && GeoLeaf.UI.notify) {
          GeoLeaf.UI.notify.success('✓ Sauvegarde restaurée avec succès');
        }

        console.log('[SyncHandler] Backup restored successfully');

        // Reload map
        if (GeoLeaf.Core && GeoLeaf.Core.refreshMap) {
          GeoLeaf.Core.refreshMap();
        }

        return true;

      } catch (error) {
        console.error('[SyncHandler] Restore failed:', error);

        if (GeoLeaf.UI && GeoLeaf.UI.notify) {
          GeoLeaf.UI.notify.error('Erreur lors de la restauration: ' + error.message);
        }

        return false;
      }
    },

    /**
     * Get list of available backups
     * @returns {Promise<Array>} - List of backups
     */
    async getAvailableBackups() {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        return [];
      }

      return await GeoLeaf.Storage.DB.getBackups(10); // Last 10 backups
    },

    /**
     * Delete a backup
     * @param {number} backupId - Backup ID
     * @returns {Promise<void>}
     */
    async deleteBackup(backupId) {
      if (!GeoLeaf.Storage || !GeoLeaf.Storage.DB) {
        throw new Error('Storage not available');
      }

      await GeoLeaf.Storage.DB.deleteBackup(backupId);

      console.log(`[SyncHandler] Deleted backup #${backupId}`);
    },

    /**
     * Check if currently syncing
     * @returns {boolean}
     */
    isSyncing() {
      return this._syncing;
    }
  };

  // Expose to global
  global.GeoLeaf = GeoLeaf;

  console.log('[SyncHandler] Module loaded');

})(window);
