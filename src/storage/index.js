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
export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (legacy test expectation)

const UNDEFINED_SENTINEL = '__geoleaf_undefined__';

function _key(key) { return STORAGE_PREFIX + key; }

export function isLocalStorageAvailable() {
    try {
        const t = '__gl_test__';
        localStorage.setItem(t, t);
        localStorage.removeItem(t);
        return true;
    } catch { return false; }
}

export function setItem(key, value, ttlMs) {
    if (!isLocalStorageAvailable()) return false;
    try {
        const expires = (ttlMs !== undefined && ttlMs != null && ttlMs > 0)
            ? Date.now() + (typeof ttlMs === 'number' ? ttlMs : DEFAULT_TTL_MS)
            : null;
        const payload = value === undefined ? UNDEFINED_SENTINEL : value;
        const entry = { value: payload, expires };
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
        if (entry.expires && Date.now() > entry.expires) {
            localStorage.removeItem(_key(key));
            return defaultValue;
        }
        const v = entry.value;
        return v === UNDEFINED_SENTINEL ? undefined : (v ?? defaultValue);
    } catch { return defaultValue; }
}

export function removeItem(key) {
    if (!isLocalStorageAvailable()) return false;
    try { localStorage.removeItem(_key(key)); return true; } catch { return false; }
}

export function hasItem(key) {
    if (!isLocalStorageAvailable()) return false;
    try {
        const raw = localStorage.getItem(_key(key));
        if (raw === null) return false;
        const entry = JSON.parse(raw);
        if (entry.expires && Date.now() > entry.expires) {
            localStorage.removeItem(_key(key));
            return false;
        }
        return true;
    } catch { return false; }
}

export function clear() {
    if (!isLocalStorageAvailable()) return 0;
    try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
        return toRemove.length;
    } catch { return 0; }
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

function _estimateUsed() {
    let used = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
                const v = localStorage.getItem(k);
                used += (k.length + (v ? v.length : 0)) * 2; // UTF-16
            }
        }
    } catch { /* noop */ }
    return used;
}

const DEFAULT_QUOTA = 5 * 1024 * 1024; // 5MB fallback

export function getStats() {
    const allKeys = keys();
    const used = _estimateUsed();
    const total = typeof localStorage.length === 'number' ? DEFAULT_QUOTA : DEFAULT_QUOTA;
    const available = isLocalStorageAvailable();
    const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    return {
        count: allKeys.length,
        keys: allKeys,
        items: allKeys.length,
        used,
        total,
        available,
        percentage
    };
}

export function removeExpired() {
    if (!isLocalStorageAvailable()) return 0;
    let count = 0;
    try {
        for (const key of keys()) {
            const raw = localStorage.getItem(_key(key));
            if (!raw) continue;
            const entry = JSON.parse(raw);
            if (entry.expires && Date.now() > entry.expires) {
                localStorage.removeItem(_key(key));
                count++;
            }
        }
    } catch { /* noop */ }
    return count;
}

export function setItems(items, ttlMs) {
    if (items == null || typeof items !== 'object' || Array.isArray(items)) return 0;
    let n = 0;
    for (const [k, v] of Object.entries(items)) {
        if (setItem(k, v, ttlMs)) n++;
    }
    return n;
}

export function getItems(keyList, defaultValue = null) {
    if (keyList == null || !Array.isArray(keyList)) return {};
    return keyList.reduce((acc, k) => {
        acc[k] = getItem(k, defaultValue);
        return acc;
    }, {});
}

export default {
    STORAGE_PREFIX,
    DEFAULT_TTL_MS,
    isLocalStorageAvailable,
    setItem,
    getItem,
    removeItem,
    hasItem,
    clear,
    keys,
    getStats,
    removeExpired,
    setItems,
    getItems
};
