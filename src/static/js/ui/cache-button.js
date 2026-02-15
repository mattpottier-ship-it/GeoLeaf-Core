/**
 * @fileoverview UI Cache Button - Orchestrator (Refactored v3.0.0)
 * @description Main API entry point that delegates to specialized modules
 * @author GeoLeaf Team
 * @version 3.0.0
 *
 * ARCHITECTURE:
 * This orchestrator maintains backward compatibility while delegating to:
 * - ButtonControl: Leaflet button creation
 * - ModalManager: Modal structure and navigation
 * - ExportLogic: POI export, sync, and cache management
 *
 * SUB-MODULES (must be loaded before this file):
 * - cache-button/button-control.js
 * - cache-button/modal-manager.js
 * - cache-button/export-logic.js
 */
(function () {
    "use strict";

    if (!window.GeoLeaf) window.GeoLeaf = {};
    if (!GeoLeaf.UI) GeoLeaf.UI = {};

    const Log = GeoLeaf.Log;

    /**
     * Check if all required sub-modules are loaded
     * @returns {boolean} True if all modules available
     */
    function checkDependencies() {
        const required = [
            'GeoLeaf.UI.CacheButton.Modules.ButtonControl',
            'GeoLeaf.UI.CacheButton.Modules.ModalManager',
            'GeoLeaf.UI.CacheButton.Modules.ExportLogic'
        ];

        const missing = required.filter(path => {
            const parts = path.split('.');
            let obj = window;
            for (const part of parts) {
                if (!obj[part]) return true;
                obj = obj[part];
            }
            return false;
        });

        if (missing.length > 0) {
            Log.error('[UI.CacheButton] Missing dependencies:', missing);
            return false;
        }

        return true;
    }

    /**
     * CacheButton (Orchestrator)
     * Delegates all functionality to specialized sub-modules
     *
     * IMPORTANT: Don't use GeoLeaf.UI.CacheButton = {...} as it would overwrite
     * the Modules namespace created by sub-modules. Instead, add methods directly.
     */

    // Ensure CacheButton exists
    if (!GeoLeaf.UI.CacheButton) GeoLeaf.UI.CacheButton = {};

    // Add orchestrator methods (don't overwrite existing Modules)
    GeoLeaf.UI.CacheButton.init = function(map, cfg) {
        if (!checkDependencies()) {
            if (Log) Log.error('[UI.CacheButton] Cannot initialize - dependencies not loaded');
            return null;
        }
        return GeoLeaf.UI.CacheButton.Modules.ButtonControl.init(map, cfg);
    };

    GeoLeaf.UI.CacheButton.openModal = function() {
        if (!checkDependencies()) {
            if (Log) Log.error('[UI.CacheButton] Cannot open modal - dependencies not loaded');
            return;
        }
        GeoLeaf.UI.CacheButton.Modules.ModalManager.openModal();
    };

    GeoLeaf.UI.CacheButton.closeModal = function() {
        if (!checkDependencies()) {
            if (Log) Log.error('[UI.CacheButton] Cannot close modal - dependencies not loaded');
            return;
        }
        GeoLeaf.UI.CacheButton.Modules.ModalManager.closeModal();
    };

    // Verify dependencies on load
    // Verify dependencies on load
    if (checkDependencies()) {
        if (Log) Log.info('[UI.CacheButton] Orchestrator initialized - all sub-modules loaded');
    } else {
        if (Log) Log.warn('[UI.CacheButton] Orchestrator initialized - some sub-modules missing');
    }

})();
