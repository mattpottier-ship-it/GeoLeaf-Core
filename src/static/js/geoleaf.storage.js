/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Storage - Public API
 *
 * Point d'entrée unifié pour tous les modules de stockage :
 * - IndexedDB (cache persistant)
 * - Cache Manager (gestion profils)
 * - Offline Detector (détection connectivité)
 *
 * @module GeoLeaf.Storage
 * @version 3.0.0
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Module Storage principal
     * Agrégateur des sous-modules de stockage
     */
    const Storage = {
        /**
         * Référence au module IndexedDB
         *
         * @type {Object}
         * @example
         * await GeoLeaf.Storage.DB.init();
         * await GeoLeaf.Storage.DB.cacheLayer('layer-id', data, 'tourism');
         */
        get DB() {
            return GeoLeaf._StorageDB;
        },

        /**
         * Référence au module Cache Manager
         *
         * @type {Object}
         * @example
         * await GeoLeaf.Storage.CacheManager.cacheProfile('tourism');
         * const status = await GeoLeaf.Storage.CacheManager.getCacheStatus('tourism');
         */
        get CacheManager() {
            return GeoLeaf.CacheManager || GeoLeaf._CacheManager;
        },

        /**
         * Référence au module Offline Detector
         *
         * @type {Object}
         * @example
         * GeoLeaf.Storage.OfflineDetector.init();
         * const isOnline = GeoLeaf.Storage.OfflineDetector.isOnline();
         */
        get OfflineDetector() {
            return GeoLeaf._OfflineDetector;
        },

        /**
         * Initialise tous les modules de stockage
         *
         * @param {Object} [options] - Options de configuration
         * @param {Object} [options.indexedDB] - Config IndexedDB
         * @param {Object} [options.cache] - Config Cache Manager
         * @param {Object} [options.offline] - Config Offline Detector
         * @returns {Promise<void>}
         * @example
         * await GeoLeaf.Storage.init({
         *   indexedDB: { name: 'geoleaf-db', version: 1 },
         *   cache: { enableProfileCache: true },
         *   offline: { showBadge: true, badgePosition: 'top-right' }
         * });
         */
        async init(options = {}) {
            Log.info("[Storage] Initializing storage modules...");

            const { indexedDB = {}, cache = {}, offline = {}, enableOfflineDetector = false, enableServiceWorker = false } = options;

            try {
                // 1. Initialiser IndexedDB
                if (this.DB) {
                    if (indexedDB.name) this.DB._dbName = indexedDB.name;
                    if (indexedDB.version) this.DB._dbVersion = indexedDB.version;

                    await this.DB.init();
                    Log.info("[Storage] IndexedDB initialized");
                } else {
                    Log.warn("[Storage] IndexedDB module not available");
                }

                // 2. Initialiser Cache Manager
                if (this.CacheManager) {
                    this.CacheManager.init(cache);
                    Log.info("[Storage] Cache Manager initialized");
                } else {
                    Log.warn("[Storage] Cache Manager module not available");
                }

                // 3. Initialiser Offline Detector (si activé)
                if (enableOfflineDetector && this.OfflineDetector) {
                    this.OfflineDetector.init(offline);
                    Log.info("[Storage] Offline Detector enabled and initialized");
                } else if (!enableOfflineDetector) {
                    Log.info("[Storage] Offline Detector disabled (enableOfflineDetector: false)");
                } else {
                    Log.warn("[Storage] Offline Detector module not available");
                }

                // 4. Enregistrer le Service Worker (si activé)
                if (enableServiceWorker && GeoLeaf._SWRegister) {
                    GeoLeaf._SWRegister.register().then(() => {
                        Log.info("[Storage] Service Worker registered");
                    }).catch(err => {
                        Log.warn("[Storage] Service Worker registration failed:", err.message);
                    });
                } else if (!enableServiceWorker) {
                    Log.info("[Storage] Service Worker disabled (enableServiceWorker: false)");
                } else {
                    Log.warn("[Storage] SW Register module not available — include sw-register.js");
                }

                Log.info("[Storage] All storage modules initialized successfully");

                // Émettre événement global
                document.dispatchEvent(new CustomEvent("geoleaf:storage:initialized"));

                return true;

            } catch (error) {
                const errorMsg = `[Storage] Initialization failed: ${error.message}`;
                Log.error(errorMsg);
                throw new Error(errorMsg);
            }
        },

        /**
         * Vérifie si le stockage est disponible et initialisé
         *
         * @returns {boolean}
         */
        isAvailable() {
            return this.DB && this.DB._db !== null;
        },

        /**
         * Vérifie si l'application est en mode offline
         *
         * @returns {boolean}
         */
        isOffline() {
            return this.OfflineDetector ? !this.OfflineDetector.isOnline() : !navigator.onLine;
        },

        /**
         * Obtient des statistiques complètes sur le stockage
         *
         * @returns {Promise<Object>}
         * @example
         * const stats = await GeoLeaf.Storage.getStats();
         * console.log(`Storage: ${stats.storage.used}/${stats.storage.quota} bytes`);
         * console.log(`Cached layers: ${stats.layers.count}`);
         * console.log(`Sync queue: ${stats.sync.pending} pending`);
         */
        async getStats() {
            const stats = {
                storage: {
                    used: 0,
                    quota: 0,
                    percentage: 0
                },
                layers: {
                    count: 0,
                    byProfile: {}
                },
                sync: {
                    pending: 0,
                    failed: 0
                },
                cache: {
                    profiles: []
                },
                online: true
            };

            try {
                // Stats IndexedDB
                if (this.DB) {
                    const dbStats = await this.DB.getStorageStats();
                    stats.storage.used = dbStats.used;
                    stats.storage.quota = dbStats.quota;
                    stats.storage.percentage = dbStats.percentage;
                    stats.layers.count = dbStats.layersCount;
                    stats.sync.pending = dbStats.syncQueueCount;
                }

                // Stats Cache Manager
                if (this.CacheManager) {
                    const cachedProfiles = await this.CacheManager.listCachedProfiles();
                    stats.cache.profiles = cachedProfiles;

                    // Détails par profil
                    for (const profileId of cachedProfiles) {
                        const layers = await this.DB.getLayersByProfile(profileId);
                        stats.layers.byProfile[profileId] = layers.length;
                    }
                }

                // État connexion
                if (this.OfflineDetector) {
                    stats.online = this.OfflineDetector.isOnline();
                }

            } catch (error) {
                Log.error(`[Storage] Failed to get stats: ${error.message}`);
            }

            return stats;
        },

        /**
         * Nettoie complètement le stockage (toutes les données)
         *
         * @returns {Promise<void>}
         * @example
         * await GeoLeaf.Storage.clearAll();
         */
        async clearAll() {
            Log.warn("[Storage] Clearing all storage data...");

            try {
                // Effacer tous les profils en cache
                if (this.CacheManager) {
                    const profiles = await this.CacheManager.listCachedProfiles();
                    for (const profileId of profiles) {
                        await this.CacheManager.clearProfile(profileId);
                    }
                }

                // Effacer toutes les sync queue
                if (this.DB && this.DB._db) {
                    const transaction = this.DB._db.transaction(["sync_queue", "preferences", "metadata"], "readwrite");

                    transaction.objectStore("sync_queue").clear();
                    transaction.objectStore("preferences").clear();
                    transaction.objectStore("metadata").clear();

                    await new Promise((resolve, reject) => {
                        transaction.oncomplete = () => resolve();
                        transaction.onerror = () => reject(transaction.error);
                    });
                }

                Log.info("[Storage] All storage data cleared");

                // Émettre événement
                document.dispatchEvent(new CustomEvent("geoleaf:storage:cleared"));

            } catch (error) {
                Log.error(`[Storage] Failed to clear all: ${error.message}`);
                throw error;
            }
        },

        /**
         * Ferme toutes les connexions de stockage
         */
        close() {
            if (this.DB) {
                this.DB.close();
            }

            if (this.OfflineDetector) {
                this.OfflineDetector.destroy();
            }

            Log.info("[Storage] All connections closed");
        },

        /**
         * Helper : Télécharge un profil pour usage offline
         *
         * @param {string} profileId - ID du profil
         * @param {Function} [onProgress] - Callback progression (percent)
         * @returns {Promise<Object>}
         * @example
         * await GeoLeaf.Storage.downloadProfileForOffline('tourism', (percent) => {
         *   console.log(`Download: ${percent}%`);
         * });
         */
        async downloadProfileForOffline(profileId, onProgress = null) {
            if (!this.isAvailable()) {
                throw new Error("Storage not initialized");
            }

            if (!this.CacheManager) {
                throw new Error("CacheManager not available");
            }

            Log.info(`[Storage] Downloading profile for offline use: ${profileId}`);

            // Estimer la taille
            const estimatedSize = await this.CacheManager.estimateProfileSize(profileId);

            // Vérifier le quota
            const quota = await this.CacheManager.getStorageQuota();
            if (estimatedSize > quota.available) {
                throw new Error(`Not enough storage: need ${(estimatedSize / 1024 / 1024).toFixed(2)} MB, available ${(quota.available / 1024 / 1024).toFixed(2)} MB`);
            }

            // Cacher le profil
            const result = await this.CacheManager.cacheProfile(profileId);

            Log.info(`[Storage] Profile ${profileId} downloaded for offline use`);

            return result;
        },

        /**
         * Helper : Vérifie si un profil est disponible offline
         *
         * @param {string} profileId - ID du profil
         * @returns {Promise<boolean>}
         */
        async isProfileAvailableOffline(profileId) {
            if (!this.isAvailable()) {
                return false;
            }

            return await this.CacheManager.isProfileCached(profileId);
        },

        /**
         * Helper : Obtient les profils disponibles offline
         *
         * @returns {Promise<Array<string>>}
         */
        async getOfflineProfiles() {
            if (!this.isAvailable()) {
                return [];
            }

            return await this.CacheManager.listCachedProfiles();
        }
    };

    /**
     * Exposer le module Storage dans le namespace GeoLeaf
     * Préserver Cache et _DBModules qui ont été créés par les modules
     */
    const existingCache = GeoLeaf.Storage && GeoLeaf.Storage.Cache;
    const existingDBModules = GeoLeaf.Storage && GeoLeaf.Storage._DBModules;
    GeoLeaf.Storage = Storage;
    if (existingCache) {
        GeoLeaf.Storage.Cache = existingCache;
    }
    if (existingDBModules) {
        GeoLeaf.Storage._DBModules = existingDBModules;
    }

    // Log de chargement
    if (Log) {
        Log.debug("[Storage] Module loaded and ready");
    }

})(window);
