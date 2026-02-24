/**
 * @file sw-register.js
 * @description Service Worker registration module for GeoLeaf offline support.
 *              Handles SW lifecycle: register, update, unregister.
 *              The core/lite SW (sw-core.js) is registered unconditionally at boot.
 *              The premium SW (sw.js) replaces it when the Storage plugin is loaded
 *              and storage.enableServiceWorker = true in the profile.
 * @module Storage/SWRegister
 * @requires GeoLeaf
 *
 * Copyright (c) 2025 GeoLeaf Contributors
 * Licensed under the MIT License
 * SPDX-License-Identifier: MIT
 */
"use strict";

import { Log } from '../log/index.js';



/**
 * Service Worker registration helper.
 *
 * @namespace GeoLeaf._SWRegister
 * @example
 * // Automatic registration via Storage.init({ enableServiceWorker: true })
 * // Or manual:
 * await GeoLeaf._SWRegister.register();
 */
const SWRegister = {

    /** @type {ServiceWorkerRegistration|null} */
    _registration: null,

    /** @type {string} Default SW script path — core/lite, always registered at boot */
    _swPath: "sw-core.js",

    /**
     * Register the Service Worker.
     * No-op in environments that don't support Service Workers.
     *
     * @param {Object}  [options]
     * @param {string}  [options.path="sw.js"] - Path to the SW script
     * @param {string}  [options.scope="/"]     - SW scope
     * @returns {Promise<ServiceWorkerRegistration|null>}
     * @example
     * const reg = await GeoLeaf._SWRegister.register();
     */
    async register(options = {}) {
        if (!("serviceWorker" in navigator)) {
            Log.warn("[SWRegister] Service Workers not supported in this browser.");
            return null;
        }

        const swPath = options.path || this._swPath;
        const scope  = options.scope || "/";

        try {
            const registration = await navigator.serviceWorker.register(swPath, { scope });
            this._registration = registration;

            Log.info(`[SWRegister] Service Worker registered (scope: ${registration.scope})`);

            // Listen for updates
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "activated") {
                            Log.info("[SWRegister] New Service Worker activated.");
                            document.dispatchEvent(new CustomEvent("geoleaf:sw:updated"));
                        }
                    });
                }
            });

            return registration;

        } catch (error) {
            Log.error(`[SWRegister] Registration failed: ${error.message}`);
            throw error;
        }
    },

    /**
     * Force an update check on the registered Service Worker.
     *
     * @returns {Promise<void>}
     */
    async update() {
        if (this._registration) {
            await this._registration.update();
            Log.info("[SWRegister] Update check triggered.");
        } else {
            Log.warn("[SWRegister] No active registration — call register() first.");
        }
    },

    /**
     * Unregister the Service Worker.
     *
     * @returns {Promise<boolean>} true if successfully unregistered
     */
    async unregister() {
        if (!this._registration) {
            Log.warn("[SWRegister] No active registration to unregister.");
            return false;
        }

        const result = await this._registration.unregister();
        if (result) {
            Log.info("[SWRegister] Service Worker unregistered.");
            this._registration = null;
        }
        return result;
    },

    /**
     * Get the current registration (if any).
     *
     * @returns {ServiceWorkerRegistration|null}
     */
    getRegistration() {
        return this._registration;
    }
};

export { SWRegister };
