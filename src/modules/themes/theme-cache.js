/**
 * GeoLeaf Theme Cache
 * Cache léger pour les couches GeoJSON utilisées par les thèmes.
 */
"use strict";

import { Log } from "../log/index.js";

/**
 * Phase 7 — Premium Separation: IndexedDB lives in GeoLeaf-Plugins/plugin-storage.
 * Access it only via GeoLeaf.Storage.DB at runtime (after the plugin is loaded).
 */
function _getIndexedDB() {
    const g = typeof globalThis !== "undefined" ? globalThis : window;
    return g?.GeoLeaf?.Storage?.DB ?? null;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

const ThemeCache = {
    _config: {
        enabled: true,
        maxAge: MAX_AGE_MS,
    },

    /**
     * Récupère une couche depuis le cache si elle est encore valide.
     * @param {string} layerId
     * @param {string} [profileId]
     * @returns {Promise<Object|null>}
     */
    async get(layerId, profileId) {
        if (!this._config.enabled) {
            return null;
        }

        const StorageDB = _getIndexedDB();
        if (!StorageDB) {
            return null;
        }

        try {
            const cached = await StorageDB.getLayer(layerId);
            if (!cached) {
                return null;
            }

            if (profileId && cached.profileId && cached.profileId !== profileId) {
                if (Log) Log.debug(`[ThemeCache] Cache mismatch profil pour ${layerId}`);
                return null;
            }

            const age = Date.now() - cached.timestamp;
            if (age > this._config.maxAge) {
                if (Log) Log.debug(`[ThemeCache] Cache expiré pour ${layerId}`);
                return null;
            }

            if (Log) Log.info(`[ThemeCache] Cache hit pour ${layerId}`);
            return cached.data;
        } catch (err) {
            if (Log)
                Log.warn(`[ThemeCache] Lecture cache impossible pour ${layerId}: ${err.message}`);
            return null;
        }
    },

    /**
     * Stocke une couche dans le cache.
     * @param {string} layerId
     * @param {string} [profileId]
     * @param {Object} data
     * @param {Object} [metadata]
     * @returns {Promise<void>}
     */
    async store(layerId, profileId, data, metadata = {}) {
        if (!this._config.enabled) {
            return;
        }

        const StorageDB = _getIndexedDB();
        if (!StorageDB) {
            return;
        }

        try {
            await StorageDB.cacheLayer(layerId, data, profileId || null, metadata);
            if (Log) Log.debug(`[ThemeCache] Couche mise en cache: ${layerId}`);
        } catch (err) {
            if (Log) Log.warn(`[ThemeCache] Échec mise en cache ${layerId}: ${err.message}`);
        }
    },

    /**
     * Invalide une couche en cache.
     * @param {string} layerId
     * @returns {Promise<void>}
     */
    async invalidate(layerId) {
        const StorageDB = _getIndexedDB();
        if (!StorageDB) {
            return;
        }

        try {
            await StorageDB.removeLayer(layerId);
            if (Log) Log.info(`[ThemeCache] Cache invalidé pour ${layerId}`);
        } catch (err) {
            if (Log) Log.warn(`[ThemeCache] Impossible d'invalider ${layerId}: ${err.message}`);
        }
    },
};

export { ThemeCache };
