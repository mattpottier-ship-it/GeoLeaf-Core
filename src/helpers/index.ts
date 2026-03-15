/*!
 * GeoLeaf Core — © 2026 Mattieu Pottier — MIT License — https://geoleaf.dev
 */
/**
 * src/helpers/index.js — SHIM LEGACY
 * Backward compatibility : expose les helpers from src/helpers/ (old structure)
 * → src/modules/geoleaf.helpers.js + src/modules/utils/general-utils.js
 * @module src/helpers
 */
import { Helpers as HelpersBase } from "../modules/geoleaf.helpers.js";
import { debounce, throttle } from "../modules/utils/general-utils.js";

// Fonctions availables dans the object Helpers
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
    retryWithBackoff,
} = HelpersBase;

// Fonctions availables dans utils
export { debounce, throttle };

// Fonctions absentes — stubs minimaux pour ne pas bloquer le loading
/**
 * @stub fetchWithTimeout — old API, replaced by FetchHelper
 */
export function fetchWithTimeout(url: any, options: any = {}, timeout: any = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * @stub batchDomOperations — accepte un callback unique ou un array de fonctions
 */
export function batchDomOperations(operations: any) {
    if (typeof operations === "function") {
        return operations();
    }
    if (Array.isArray(operations)) {
        operations.forEach((fn: any) => typeof fn === "function" && fn());
    }
    return null;
}

// Extended helpers for test/consumer compatibility (debounce, throttle, stubs)
export const Helpers = {
    ...HelpersBase,
    debounce,
    throttle,
    fetchWithTimeout,
    batchDomOperations,
};
