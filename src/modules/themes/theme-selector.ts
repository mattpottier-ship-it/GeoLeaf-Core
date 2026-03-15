/* eslint-disable security/detect-object-injection */
/**
 * Module Theme Selector — Orchestrateur
 * Selector de themes global (principaux + secondarys)
 *
 * DEPENDENCIES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optional)
 * - GeoLeaf._ThemeLoader
 * - GeoLeaf._ThemeApplier
 * - GeoLeaf.Core.getActiveProfile()
 *
 * EXPOSE:
 * - GeoLeaf.ThemeSelector
 *
 * @module ThemeSelector
 * @public
 */
"use strict";

import { Log } from "../log/index.js";
import { Config } from "../config/config-primitives.js";
import { ThemeLoader } from "./theme-loader.js";
import { ThemeApplierCore } from "./theme-applier/core.js";
import { _state } from "./theme-selector-state.js";
import { createPrimaryUI, updateUIStatePrimary } from "./theme-selector-primary.js";
import { createSecondaryUI, updateUIStateSecondary } from "./theme-selector-secondary.js";

/**
 * Module Theme Selector
 * @namespace ThemeSelector
 * @public
 */
const ThemeSelector = {
    /**
     * Initializes le selector de themes
     * @param {Object} options - Options d'initialization
     * @param {string} options.profileId - ID of the profile
     * @param {HTMLElement} [options.primaryContainer] - Conteneur pour buttons principaux
     * @param {HTMLElement} [options.secondaryContainer] - Conteneur pour dropdown secondary
     * @returns {Promise<void>}
     */
    init(options: any) {
        if (!options || !options.profileId) {
            return Promise.reject(new Error("profileId required for ThemeSelector.init"));
        }

        if (Log) Log.debug("[ThemeSelector] Initializing for profile:", options.profileId);

        _state.profileId = options.profileId;
        _state.primaryContainer = options.primaryContainer || null;
        _state.secondaryContainer = options.secondaryContainer || null;

        // Loadsr la configuration des themes
        return ThemeLoader.loadThemesConfig(options.profileId)
            .then((themesConfig: any) => {
                _state.config = themesConfig.config;
                _state.themes = themesConfig.themes;
                _state.primaryThemes = themesConfig.themes.filter((t: any) => t.type === "primary");
                _state.secondaryThemes = themesConfig.themes.filter(
                    (t: any) => t.type === "secondary"
                );
                _state.currentTheme = themesConfig.defaultTheme;

                if (Log)
                    Log.debug("[ThemeSelector] Configuration loaded:", {
                        total: _state.themes.length,
                        primary: _state.primaryThemes.length,
                        secondary: _state.secondaryThemes.length,
                    });

                // Createsr l'UI
                this._createUI();

                // Marquer comme initialized AVANT d'appliquer the theme
                _state.initialized = true;

                // Appliesr the theme by default
                return this.setTheme(_state.currentTheme);
            })
            .then(() => {
                if (Log) Log.debug("[ThemeSelector] Initialization complete");
                // Emit the theme loading completion event
                const event = new CustomEvent("geoleaf:themes:ready", {
                    detail: { time: Date.now() },
                });
                document.dispatchEvent(event);
            })
            .catch((err: any) => {
                if (Log) Log.warn("[ThemeSelector] Erreur initialization:", err.message);
                // Emit event even in case of error
                const event = new CustomEvent("geoleaf:themes:ready", {
                    detail: { time: Date.now(), error: err.message },
                });
                document.dispatchEvent(event);
                throw err;
            });
    },

    /**
     * Creates the interface user
     * @private
     */
    _createUI() {
        // Check si le selector de themes est activated globalement
        const uiConfig = (Config as any)?.get?.("ui") ?? null;
        const showThemeSelector = uiConfig ? uiConfig.showThemeSelector === true : false;

        if (!showThemeSelector) {
            if (Log) Log.debug("[ThemeSelector] showThemeSelector is false, UI not created");
            return;
        }

        // Createsr l'UI des themes principaux
        if (_state.config.primaryThemes.enabled && _state.primaryContainer) {
            createPrimaryUI((id: string) => this.setTheme(id));
        }

        // Createsr l'UI des themes secondarys
        if (_state.config.secondaryThemes.enabled && _state.secondaryContainer) {
            createSecondaryUI(
                (id: string) => this.setTheme(id),
                () => this.nextTheme(),
                () => this.previousTheme()
            );
        }
    },

    /**
     * Active a theme par son ID
     * @param {string} themeId - ID of the theme
     * @returns {Promise<void>}
     */
    setTheme(themeId: any) {
        if (!_state.initialized) {
            return Promise.reject(new Error("ThemeSelector not initialized"));
        }

        const theme = _state.themes.find((t: any) => t.id === themeId);
        if (!theme) {
            return Promise.reject(new Error(`Theme not found: ${themeId}`));
        }

        if (Log) Log.debug("[ThemeSelector] setTheme:", themeId);

        // Appliesr the theme
        return ThemeApplierCore.applyTheme(theme)
            .then(() => {
                _state.currentTheme = themeId;

                // Mettre up to date l'UI
                this._updateUIState(themeId);

                if (Log) Log.debug("[ThemeSelector] Theme activated:", themeId);
            })
            .catch((err: any) => {
                if (Log) Log.warn("[ThemeSelector] Theme activation error:", err.message);
                throw err;
            });
    },

    /**
     * Updates the state visuel of the UI after un changement de theme
     * @param {string} themeId - ID of the theme active
     * @private
     */
    _updateUIState(themeId: string) {
        updateUIStatePrimary(themeId);
        updateUIStateSecondary(themeId);
    },

    /**
     * Active the theme secondary suivant
     */
    nextTheme() {
        if (!_state.initialized || _state.secondaryThemes.length === 0) {
            return;
        }

        const currentIsSecondary = _state.secondaryThemes.some(
            (t: any) => t.id === _state.currentTheme
        );
        let nextIndex = 0;

        if (currentIsSecondary) {
            const currentIndex = _state.secondaryThemes.findIndex(
                (t: any) => t.id === _state.currentTheme
            );
            nextIndex = (currentIndex + 1) % _state.secondaryThemes.length;
        }

        const nextTheme = _state.secondaryThemes[nextIndex];
        if (nextTheme) {
            this.setTheme(nextTheme.id);
        }
    },

    /**
     * Active the theme secondary previous
     */
    previousTheme() {
        if (!_state.initialized || _state.secondaryThemes.length === 0) {
            return;
        }

        const currentIsSecondary = _state.secondaryThemes.some(
            (t: any) => t.id === _state.currentTheme
        );
        let prevIndex = _state.secondaryThemes.length - 1;

        if (currentIsSecondary) {
            const currentIndex = _state.secondaryThemes.findIndex(
                (t: any) => t.id === _state.currentTheme
            );
            prevIndex =
                (currentIndex - 1 + _state.secondaryThemes.length) % _state.secondaryThemes.length;
        }

        const prevTheme = _state.secondaryThemes[prevIndex];
        if (prevTheme) {
            this.setTheme(prevTheme.id);
        }
    },

    /**
     * Retrieves the theme currentlement active
     * @returns {string|null}
     */
    getCurrentTheme() {
        return _state.currentTheme;
    },

    /**
     * Retrieves tous the themes
     * @returns {Array}
     */
    getThemes() {
        return _state.themes;
    },

    /**
     * Retrieves thes themes principaux
     * @returns {Array}
     */
    getPrimaryThemes() {
        return _state.primaryThemes;
    },

    /**
     * Retrieves thes themes secondarys
     * @returns {Array}
     */
    getSecondaryThemes() {
        return _state.secondaryThemes;
    },

    /**
     * Checks if the module est initialized
     * @returns {boolean}
     */
    isInitialized() {
        return _state.initialized;
    },

    /**
     * Cleanup method for event listners
     * Call this when destroying the theme selector
     */
    destroy() {
        if (Log) Log.debug("[ThemeSelector] Cleaning up event listeners");

        if (_state._eventCleanups) {
            _state._eventCleanups.forEach((cleanup: any) => {
                if (typeof cleanup === "function") {
                    cleanup();
                }
            });
            _state._eventCleanups = [];
        }

        _state.initialized = false;
    },
};

export { ThemeSelector };
