/**
 * API Initialization Manager - Sprint 4.3 (Version Robuste)
 * Gestionnaire des opérations d'initialisation GeoLeaf
 * @module APIInitializationManager
 */
"use strict";

import { Log } from '../log/index.js';
const _g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};


/**
 * Gestionnaire d'initialisation pour GeoLeaf
 */
class APIInitializationManager {
    constructor() {
        this.isReady = true; // Manager prêt sans init séparée
        this.pendingPromise = null;
        this.cancelled = false;
        this.stats = {
            initCalls: 0,
            configLoads: 0,
            errors: 0
        };
    }

    /**
     * Initialise GeoLeaf avec les options fournies
     * @param {Object} options - Options d'initialisation
     * @param {Function} getModule - Fonction d'accès aux modules
     * @returns {*} Résultat de l'initialisation
     */
    init(options, getModule) {
        try {
            this.stats.initCalls++;

            if (Log) Log.info('[APIInitializationManager] Initializing GeoLeaf');

            // Validation des paramètres
            const validationResult = this._validateInitParams(options, getModule);
            if (!validationResult.valid) {
                throw new Error(validationResult.error);
            }

            // Obtenir le module Core
            const Core = getModule("Core");
            if (!Core || typeof Core.init !== "function") {
                throw new Error("[GeoLeaf.init] GeoLeaf.Core.init() is not available. Core module must be loaded before API.");
            }

            // Normaliser les options
            const normalizedOptions = this._normalizeInitOptions(options);
            if (Log) Log.info('[APIInitializationManager] Initializing with options:', normalizedOptions);

            // Appeler l'initialisation du Core
            const result = Core.init(normalizedOptions);

            if (Log) Log.info('[APIInitializationManager] Initialization completed successfully');
            return result;

        } catch (error) {
            this.stats.errors++;
            if (Log) Log.error('[APIInitializationManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Charge une configuration depuis URL ou données
     * @param {string|Object} input - Source de configuration
     * @param {Function} getModule - Fonction d'accès aux modules
     * @returns {Promise<Object>} Données de configuration
     */
    async loadConfig(input, getModule) {
        try {
            this.stats.configLoads++;

            if (Log) Log.info('[APIInitializationManager] Loading configuration');

            // Validation des paramètres
            if (!input) {
                throw new Error('Configuration input is required');
            }

            if (!getModule || typeof getModule !== 'function') {
                throw new Error('getModule function is required');
            }

            // Obtenir le module Config
            const Config = getModule("Config");
            if (!Config || typeof Config.init !== "function") {
                throw new Error("[GeoLeaf.loadConfig] GeoLeaf.Config.init() is not available. Config module must be loaded.");
            }

            // Normaliser les options de configuration
            const options = this._normalizeConfigOptions(input);

            // Annuler la requête précédente si elle existe
            if (this.pendingPromise) {
                this.cancelled = true;
                if (Log) Log.info('[APIInitializationManager] Cancelling previous config load request');
            }

            this.cancelled = false;

            // Charger la configuration
            this.pendingPromise = Config.init(options);
            const result = await this.pendingPromise;

            this.pendingPromise = null;

            if (this.cancelled) {
                if (Log) Log.info('[APIInitializationManager] Config load was cancelled');
                return null;
            }

            if (Log) Log.info('[APIInitializationManager] Configuration loaded successfully');
            return result;

        } catch (error) {
            this.stats.errors++;
            this.pendingPromise = null;
            if (Log) Log.error('[APIInitializationManager] Config loading failed:', error);
            throw error;
        }
    }

    /**
     * Change le thème de l'interface
     * @param {string} theme - Nom du thème
     * @param {Function} getModule - Fonction d'accès aux modules
     * @returns {boolean} Succès du changement
     */
    setTheme(theme, getModule) {
        try {
            if (Log) Log.info(`[APIInitializationManager] Setting theme: ${theme}`);

            // Validation
            if (!theme || typeof theme !== 'string') {
                throw new Error('Theme name must be a non-empty string');
            }

            if (!getModule || typeof getModule !== 'function') {
                throw new Error('getModule function is required');
            }

            // Obtenir le module UI
            const UI = getModule("UI");
            if (!UI) {
                throw new Error("[GeoLeaf.setTheme] GeoLeaf.UI is not available. UI module must be loaded.");
            }

            // Appliquer le thème - utilise applyTheme comme dans geoleaf.ui.js
            let result = false;
            if (typeof UI.applyTheme === 'function') {
                result = UI.applyTheme(theme);
            } else if (typeof UI.setTheme === 'function') {
                result = UI.setTheme(theme);
            } else if (typeof UI.theme === 'function') {
                result = UI.theme(theme);
            } else {
                throw new Error('UI module does not provide applyTheme, setTheme or theme method');
            }

            if (Log) Log.info(`[APIInitializationManager] Theme '${theme}' applied successfully`);
            return result;

        } catch (error) {
            this.stats.errors++;
            if (Log) Log.error(`[APIInitializationManager] Failed to set theme '${theme}':`, error);
            return false;
        }
    }

    /**
     * Valide les paramètres d'initialisation
     * @private
     */
    _validateInitParams(options, getModule) {
        if (!options || typeof options !== "object") {
            return { valid: false, error: "[GeoLeaf.init] An options object is required." };
        }

        if (!getModule || typeof getModule !== 'function') {
            return { valid: false, error: "getModule function is required" };
        }

        return { valid: true };
    }

    /**
     * Normalise les options d'initialisation
     * @private
     */
    _normalizeInitOptions(options) {
        // Mode "structuré" (recommandé) : options.map / options.ui
        let mapOpts = options.map || {};
        let uiOpts = options.ui || {};

        // Mode "aplati" (legacy) : target/mapId / center / zoom / theme à la racine
        if (!options.map) {
            mapOpts = {
                target: options.target || options.mapId,
                center: options.center,
                zoom: options.zoom
            };
            uiOpts = {
                theme: options.theme
            };
        }

        // Validation du target
        const target = mapOpts.target || mapOpts.mapId;
        if (!target) {
            throw new Error("[GeoLeaf.init] The 'map.target' (or 'target'/'mapId') option is required.");
        }

        // Récupérer les constantes par défaut
        const CONSTANTS = _g.GeoLeaf.CONSTANTS || {};
        const center = Array.isArray(mapOpts.center) ? mapOpts.center : CONSTANTS.DEFAULT_CENTER || [0, 0];
        const zoom = Number.isFinite(mapOpts.zoom) ? mapOpts.zoom : CONSTANTS.DEFAULT_ZOOM || 12;
        const theme = uiOpts.theme || mapOpts.theme || "light";

        // Adapter à la signature Core.init
        return {
            mapId: String(target), // Core.init attend 'mapId' pas 'target'
            center,
            zoom,
            theme,
            mapOptions: mapOpts.mapOptions || {} // Forward raw Leaflet options (maxBounds, etc.)
        };
    }

    /**
     * Normalise les options de configuration
     * @private
     */
    _normalizeConfigOptions(input) {
        if (typeof input === 'string') {
            // URL string
            return {
                source: 'url',
                url: input,
                autoEvent: true
            };
        } else if (input && typeof input === 'object') {
            // Configuration object
            return {
                source: input.url ? 'url' : 'data',
                url: input.url,
                data: input.data,
                profileId: input.profileId,
                autoEvent: input.autoEvent !== false, // true par défaut
                ...input
            };
        } else {
            throw new Error('Configuration input must be a URL string or options object');
        }
    }

    /**
     * Obtient les statistiques du manager
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            isReady: this.isReady,
            hasPendingRequest: !!this.pendingPromise
        };
    }

    /**
     * Réinitialise le manager
     */
    reset() {
        if (this.pendingPromise) {
            this.cancelled = true;
        }

        this.pendingPromise = null;
        this.cancelled = false;
        this.stats = {
            initCalls: 0,
            configLoads: 0,
            errors: 0
        };

        if (Log) Log.info('[APIInitializationManager] Manager reset');
    }
}

export { APIInitializationManager };
