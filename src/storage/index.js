/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/storage/index.js — SHIM LEGACY
 * Rétrocompatibilité : implémente l'ancienne API localStorage (supprimée lors
 * de la migration vers IndexedDB/Cache) depuis src/storage/ (ancienne structure)
 *
 * Note : ce module est distinct de geoleaf.storage.js (IndexedDB/offline).
 * Il fournit uniquement un wrapper localStorage pour les tests legacy.
 * @module src/storage
 */

export const STORAGE_PREFIX = 'geoleaf_';
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function _key(key) { return STORAGE_PREFIX + key; }

function _parse(raw) {
    try { return raw !== null ? JSON.parse(raw) : null; } catch { return raw; }
}

export function isLocalStorageAvailable() {
    try {
        const t = '__gl_test__';
        localStorage.setItem(t, t);
        localStorage.removeItem(t);
        return true;
    } catch { return false; }
}

export function setItem(key, value, ttlMs = DEFAULT_TTL_MS) {
    if (!isLocalStorageAvailable()) return false;
    try {
        const entry = { value, expires: ttlMs ? Date.now() + ttlMs : null };
        localStorage.setItem(_key(key), JSON.stringify(entry));
        return true;
    } catch { return false; }
}

export function getItem(key, defaultValue = null) {
    if (!isLocalStorageAvailable()) return defaultValue;
    try {
        const raw = localStorage.getItem(_key(key));
        if (raw === null) return defaultValue;
        const entry = JSON.parse(raw);
        if (entry.expires && Date.now() > entry.expires) { localStorage.removeItem(_key(key)); return defaultValue; }
        return entry.value ?? defaultValue;
    } catch { return defaultValue; }
}

export function removeItem(key) {
    if (!isLocalStorageAvailable()) return false;
    try { localStorage.removeItem(_key(key)); return true; } catch { return false; }
}

export function hasItem(key) {
    if (!isLocalStorageAvailable()) return false;
    try { return localStorage.getItem(_key(key)) !== null; } catch { return false; }
}

export function clear() {
    if (!isLocalStorageAvailable()) return;
    try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
}

export function keys() {
    if (!isLocalStorageAvailable()) return [];
    try {
        const result = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) result.push(k.slice(STORAGE_PREFIX.length));
        }
        return result;
    } catch { return []; }
}

export function getStats() {
    const allKeys = keys();
    return { count: allKeys.length, keys: allKeys };
}

export function removeExpired() {
    if (!isLocalStorageAvailable()) return 0;
    let count = 0;
    try {
        for (const key of keys()) {
            const raw = localStorage.getItem(_key(key));
            if (!raw) continue;
            const entry = JSON.parse(raw);
            if (entry.expires && Date.now() > entry.expires) { localStorage.removeItem(_key(key)); count++; }
        }
    } catch { /* noop */ }
    return count;
}

export function setItems(items = {}, ttlMs = DEFAULT_TTL_MS) {
    return Object.entries(items).map(([k, v]) => setItem(k, v, ttlMs)).every(Boolean);
}

export function getItems(keyList = []) {
    return keyList.reduce((acc, k) => { acc[k] = getItem(k); return acc; }, {});
}
