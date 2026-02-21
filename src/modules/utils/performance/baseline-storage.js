/**
 * GeoLeaf Performance Profiler – Baseline Storage
 * Pure storage helpers extracted from performance-profiler.js (Phase 8.2.5)
 *
 * @module utils/performance/baseline-storage
 */
"use strict";

const STORAGE_KEY = 'geoleaf_performance_baseline';

/**
 * Charge le profil de baseline depuis le storage navigateur.
 * Retourne la baseline ou null si absente / invalide.
 *
 * @param {'localStorage'|'sessionStorage'} storageType
 * @returns {Object|null}
 */
export function loadBaselineFromStorage(storageType) {
    try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        const saved = storage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (_) {
        // Storage non disponible ou données corrompues
    }
    return null;
}

/**
 * Sauvegarde le profil de baseline dans le storage navigateur.
 *
 * @param {Object} baseline     - Objet baseline à sauvegarder
 * @param {'localStorage'|'sessionStorage'} storageType
 */
export function saveBaselineToStorage(baseline, storageType) {
    try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(baseline));
    } catch (_) {
        // Storage non disponible
    }
}
