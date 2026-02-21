/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/helpers/index.js — SHIM LEGACY
 * Rétrocompatibilité : expose les helpers depuis src/helpers/ (ancienne structure)
 * → src/modules/geoleaf.helpers.js + src/modules/utils/general-utils.js
 * @module src/helpers
 */
import { Helpers } from '../modules/geoleaf.helpers.js';
import { debounce, throttle } from '../modules/utils/general-utils.js';

// Fonctions disponibles dans l'objet Helpers
export const {
    getElementById,
    querySelector,
    querySelectorAll,
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    removeElement,
    requestFrame,
    cancelFrame,
    createAbortController,
    lazyLoadImage,
    lazyExecute,
    clearObject,
    createFragment,
    addEventListener,
    addEventListeners,
    delegateEvent,
    deepClone,
    isEmpty,
    wait,
    retryWithBackoff
} = Helpers;

// Fonctions disponibles dans utils
export { debounce, throttle };

// Fonctions absentes — stubs minimaux pour ne pas bloquer le chargement
/**
 * @stub fetchWithTimeout — ancienne API, remplacée par FetchHelper
 */
export function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * @stub batchDomOperations — ancienne API, exécute chaque fn
 */
export function batchDomOperations(operations = []) {
    if (Array.isArray(operations)) operations.forEach(fn => typeof fn === 'function' && fn());
}

export { Helpers };
