/**
 * GeoLeaf Performance Profiler – Baseline Storage
 * Pure storage helpers extracted from performance-profiler.js (Phase 8.2.5)
 *
 * @module utils/performance/baseline-storage
 */
"use strict";

const STORAGE_KEY = "geoleaf_performance_baseline";

/**
 * Loads the profile de baseline from the storage browser.
 * Returns the baseline ou null si absente / invalid.
 *
 * @param {'localStorage'|'sessionStorage'} storageType
 * @returns {Object|null}
 */
export function loadBaselineFromStorage(storageType: any) {
    try {
        const storage = storageType === "localStorage" ? localStorage : sessionStorage;
        const saved = storage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (_) {
        // Storage non available ou data corrompues
    }
    return null;
}

/**
 * Sauvegarde the profile de baseline in the storage browser.
 *
 * @param {Object} baseline     - Object baseline to sauvegarder
 * @param {'localStorage'|'sessionStorage'} storageType
 */
export function saveBaselineToStorage(baseline: any, storageType: any) {
    try {
        const storage = storageType === "localStorage" ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(baseline));
    } catch (_) {
        // Storage non available
    }
}
