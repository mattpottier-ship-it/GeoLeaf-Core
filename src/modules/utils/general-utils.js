/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @fileoverview General utility functions for GeoLeaf
 * @description Shared utilities: data manipulation, URL validation, distance, etc.
 */

import { Log } from '../log/index.js';
import { Config } from '../config/config-primitives.js';
import { validateUrl as _secValidateUrl } from '../security/index.js';
import { Core } from '../geoleaf.core.js';

'use strict';

/**
 * Valide et nettoie une URL
 * @param {string} url - URL à valider
 * @param {Array<string>} allowedProtocols - Protocoles autorisés (défaut: http, https, mailto, tel)
 * @returns {string|null} - URL validée ou null si invalide
 */
/**
 * Phase 4 dedup: delegates to Security.validateUrl when available.
 * Wraps the throwing API into a null-on-failure pattern.
 */
export function validateUrl(url, _allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']) {
    if (!url || typeof url !== 'string') return null;
    // Use canonical Security.validateUrl (static ESM import)
    try { return _secValidateUrl(url); } catch { return null; }
}

/**
 * Merge profond d'objets
 * @param {Object} target - Objet cible
 * @param {Object} source - Objet source
 * @returns {Object} - Objet fusionné
 */
export function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
    const output = Object.assign({}, target);

    Object.keys(source).forEach(key => {
        // Prototype pollution protection
        if (DANGEROUS_KEYS.includes(key)) return;

        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    });

    return output;
}

/**
 * Résout la carte Leaflet depuis les options ou GeoLeaf.Core
 * Utilitaire partagé pour éviter duplication dans POI/GeoJSON/Route
 * @param {L.Map|null} explicitMap - Carte passée explicitement
 * @returns {L.Map|null} - Instance de la carte ou null
 */
/**
 * Phase 4 dedup: delegates to MapHelpers.ensureMap (duck-typing) when available
 */
export function ensureMap(explicitMap) {
    // Phase 4 dedup: delegates to MapHelpers.ensureMap (duck-typing) when available
    if (explicitMap) return explicitMap;
    if (Core && typeof Core.getMap === 'function') {
        return Core.getMap();
    }
    return null;
}

/**
 * Merge shallow d'options (pour les modules POI/GeoJSON/Route)
 * @param {Object} defaults - Options par défaut
 * @param {Object} override - Options fournies par l'utilisateur
 * @returns {Object} - Options fusionnées
 */
export function mergeOptions(defaults, override) {
    if (!override || typeof override !== 'object') return defaults;
    return Object.assign({}, defaults, override);
}

/**
 * Émet un événement personnalisé sur la carte Leaflet
 * Phase 4 dedup: thin wrapper — canonical is EventHelpers.dispatchMapEvent
 * @param {L.Map} map - Instance de la carte
 * @param {string} eventName - Nom de l'événement
 * @param {Object} payload - Données à transmettre
 */
export function fireMapEvent(map, eventName, payload) {
    if (!map || typeof map.fire !== 'function') return;
    try {
        map.fire(eventName, payload || {});
    } catch (err) {
        if (Log) Log.warn('[Utils] fireMapEvent error:', eventName, err);
    }
}

/**
 * Debounce — Phase 4 dedup: delegates to EventHelpers.debounce at runtime
 * (EventHelpers version supports `immediate` param)
 * @param {Function} func
 * @param {number} [wait=250]
 * @param {boolean} [immediate=false]
 * @returns {Function}
 */
export function debounce(func, wait = 250, immediate = false) {
    // EventHelpers loaded later via bundle-entry; at runtime it overwrites Utils.debounce
    // This ESM export is kept for any direct import usage
    let timeout;
    return function debounced(...args) {
        const context = this;
        const later = () => { timeout = null; if (!immediate) func.apply(context, args); };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle — Phase 4 dedup: delegates to EventHelpers.throttle at runtime
 * @param {Function} func
 * @param {number} [limit=100]
 * @returns {Function}
 */
export function throttle(func, limit = 100) {
    let lastRan;
    return function throttled(...args) {
        const context = this;
        const now = Date.now();
        if (!lastRan || (now - lastRan >= limit)) {
            func.apply(context, args);
            lastRan = now;
        }
    };
}

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1 (degrés)
 * @param {number} lng1 - Longitude du point 1 (degrés)
 * @param {number} lat2 - Latitude du point 2 (degrés)
 * @param {number} lng2 - Longitude du point 2 (degrés)
 * @returns {number} - Distance en kilomètres
 *
 * @example
 * const distance = getDistance(48.8566, 2.3522, 51.5074, -0.1278);
 * console.log(`Distance: ${distance.toFixed(2)} km`);
 */
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Résout la valeur d'un champ depuis plusieurs chemins possibles dans un objet
 * Élimine les longues chaînes conditionnelles de résolution de champs
 * @param {Object} obj - Objet source
 * @param {...string} paths - Chemins à tester dans l'ordre
 * @returns {*} - Première valeur trouvée ou chaîne vide si rien trouvé
 *
 * @example
 * const title = resolveField(poi,
 *     'label', 'attributes.label', 'properties.label',
 *     'name', 'attributes.name', 'properties.name'
 * );
 */
export function resolveField(obj, ...paths) {
    if (!obj || typeof obj !== 'object') return '';

    for (const path of paths) {
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = null;
                break;
            }
        }

        // Return any truthy value (string, object, array, number, etc.)
        if (value != null) {
            // For strings, ensure they're not empty
            if (typeof value === 'string') {
                if (value.trim()) return value;
            } else {
                // For non-strings (objects, arrays, numbers, booleans), return as-is
                return value;
            }
        }
    }

    return '';
}

/**
 * Comparator for sorting config items by their `order` property.
 * Items without an order field are sorted last (default: 999).
 * Phase 4 dedup — single canonical comparator.
 *
 * @param {Object} a - First item (must have optional `order` number)
 * @param {Object} b - Second item
 * @param {number} [fallback=999] - Default order for items without `order`
 * @returns {number} Negative if a<b, positive if a>b, 0 if equal
 *
 * @example
 * config.sort(compareByOrder);
 * sections.sort((a, b) => compareByOrder(a, b, 0));
 */
export function compareByOrder(a, b, fallback = 999) {
    const orderA = typeof a.order === 'number' ? a.order : fallback;
    const orderB = typeof b.order === 'number' ? b.order : fallback;
    return orderA - orderB;
}

/**
 * Phase 4 dedup: shared getLog() — canonical lazy logger accessor
 * @returns {Object} Logger (GeoLeaf.Log or console)
 */
export function getLog() {
    return Log;
}

/**
 * Phase 4 dedup: shared getActiveProfile() — canonical profile accessor
 * @returns {Object|null} Active profile or null
 */
export function getActiveProfile() {
    if (Config && typeof Config.getActiveProfile === 'function') {
        return Config.getActiveProfile() || null;
    }
    return null;
}

/**
 * Utils facade — groups all general utilities under one object
 * @namespace
 */
export const Utils = {
    validateUrl,
    deepMerge,
    ensureMap,
    mergeOptions,
    fireMapEvent,
    debounce,
    throttle,
    getDistance,
    resolveField,
    compareByOrder,
    getLog,
    getActiveProfile
};


