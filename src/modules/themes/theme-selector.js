/**
 * Module Theme Selector
 * SÃ¯Â¿Â½lecteur de thÃ¯Â¿Â½mes global (principaux + secondaires)
 *
 * DÃ¯Â¿Â½PENDANCES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optionnel)
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
import { $create } from "../utils/dom-helpers.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { events } from "../utils/event-listener-manager.js";

/**
 * Ã¯Â¿Â½tat du module
 */
const _state = {
    initialized: false,
    profileId: null,
    config: null,
    themes: [],
    primaryThemes: [],
    secondaryThemes: [],
    currentTheme: null,
    // RÃ¯Â¿Â½fÃ¯Â¿Â½rences UI
    primaryContainer: null,
    secondaryContainer: null,
    dropdown: null,
    // Event listener cleanup tracking
    _eventCleanups: [],
};

/**
 * Module Theme Selector
 * @namespace ThemeSelector
 * @public
 */
const ThemeSelector = {
    /**
     * Initialise le sÃ¯Â¿Â½lecteur de thÃ¯Â¿Â½mes
     * @param {Object} options - Options d'initialisation
     * @param {string} options.profileId - ID du profil
     * @param {HTMLElement} [options.primaryContainer] - Conteneur pour boutons principaux
     * @param {HTMLElement} [options.secondaryContainer] - Conteneur pour dropdown secondaire
     * @returns {Promise<void>}
     */
    init(options) {
        if (!options || !options.profileId) {
            return Promise.reject(new Error("profileId requis pour ThemeSelector.init"));
        }

        if (Log) Log.debug("[ThemeSelector] Initialisation pour profil:", options.profileId);

        _state.profileId = options.profileId;
        _state.primaryContainer = options.primaryContainer || null;
        _state.secondaryContainer = options.secondaryContainer || null;

        // Charger la configuration des thÃ¯Â¿Â½mes
        return ThemeLoader.loadThemesConfig(options.profileId)
            .then((themesConfig) => {
                _state.config = themesConfig.config;
                _state.themes = themesConfig.themes;
                _state.primaryThemes = themesConfig.themes.filter((t) => t.type === "primary");
                _state.secondaryThemes = themesConfig.themes.filter((t) => t.type === "secondary");
                _state.currentTheme = themesConfig.defaultTheme;

                if (Log)
                    Log.debug("[ThemeSelector] Configuration chargÃ¯Â¿Â½e:", {
                        total: _state.themes.length,
                        primary: _state.primaryThemes.length,
                        secondary: _state.secondaryThemes.length,
                    });

                // CrÃ¯Â¿Â½er l'UI
                this._createUI();

                // Marquer comme initialisÃ¯Â¿Â½ AVANT d'appliquer le thÃ¯Â¿Â½me
                _state.initialized = true;

                // Appliquer le thÃ¯Â¿Â½me par dÃ¯Â¿Â½faut
                return this.setTheme(_state.currentTheme);
            })
            .then(() => {
                if (Log) Log.debug("[ThemeSelector] Initialisation terminÃ¯Â¿Â½e");
                // Ã¯Â¿Â½mettre l'Ã¯Â¿Â½vÃ¯Â¿Â½nement de fin de chargement des thÃ¯Â¿Â½mes
                const event = new CustomEvent("geoleaf:themes:ready", {
                    detail: { time: Date.now() },
                });
                document.dispatchEvent(event);
            })
            .catch((err) => {
                if (Log) Log.warn("[ThemeSelector] Erreur initialisation:", err.message);
                // Ã¯Â¿Â½mettre l'Ã¯Â¿Â½vÃ¯Â¿Â½nement mÃ¯Â¿Â½me en cas d'erreur
                const event = new CustomEvent("geoleaf:themes:ready", {
                    detail: { time: Date.now(), error: err.message },
                });
                document.dispatchEvent(event);
                throw err;
            });
    },

    /**
     * CrÃ¯Â¿Â½e l'interface utilisateur
     * @private
     */
    _createUI() {
        // VÃ¯Â¿Â½rifier si le sÃ¯Â¿Â½lecteur de thÃ¯Â¿Â½mes est activÃ¯Â¿Â½ globalement
        const uiConfig = Config?.get?.("ui") ?? null;
        const showThemeSelector = uiConfig ? uiConfig.showThemeSelector === true : false;

        if (!showThemeSelector) {
            if (Log)
                Log.debug("[ThemeSelector] showThemeSelector est false, UI non crÃ¯Â¿Â½Ã¯Â¿Â½e");
            return;
        }

        // CrÃ¯Â¿Â½er l'UI des thÃ¯Â¿Â½mes principaux
        if (_state.config.primaryThemes.enabled && _state.primaryContainer) {
            this._createPrimaryUI();
        }

        // CrÃ¯Â¿Â½er l'UI des thÃ¯Â¿Â½mes secondaires
        if (_state.config.secondaryThemes.enabled && _state.secondaryContainer) {
            this._createSecondaryUI();
        }
    },

    /**
     * CrÃ¯Â¿Â½e l'UI des thÃ¯Â¿Â½mes principaux (boutons)
     * @private
     */
    _createPrimaryUI() {
        if (!_state.primaryContainer) {
            return;
        }

        // Vider le conteneur
        DOMSecurity.clearElementFast(_state.primaryContainer);

        // Ajouter la classe CSS
        _state.primaryContainer.classList.add("gl-theme-selector-primary");

        // CrÃ¯Â¿Â½er un bouton pour chaque thÃ¯Â¿Â½me principal
        _state.primaryThemes.forEach((theme) => {
            const btn = globalThis.L.DomUtil.create(
                "button",
                "gl-theme-btn",
                _state.primaryContainer
            );
            btn.type = "button";
            btn.dataset.themeId = theme.id;
            btn.title = theme.description || theme.label;

            // Contenu du bouton: icÃ¯Â¿Â½ne + label
            const iconSpan = globalThis.L.DomUtil.create("span", "gl-theme-btn__icon", btn);
            iconSpan.textContent = theme.icon || "??";

            const labelSpan = globalThis.L.DomUtil.create("span", "gl-theme-btn__label", btn);
            labelSpan.textContent = theme.label;

            // Marquer le thÃ¯Â¿Â½me actif
            if (theme.id === _state.currentTheme) {
                btn.classList.add("gl-theme-btn--active");
            }

            // Gestionnaire de clic
            this._attachPrimaryButtonHandler(btn, theme);
        });

        if (Log)
            Log.debug(
                "[ThemeSelector] UI primaire crÃ¯Â¿Â½Ã¯Â¿Â½e:",
                _state.primaryThemes.length,
                "boutons"
            );
    },

    /**
     * Attache le gestionnaire de clic sur un bouton de thÃ¯Â¿Â½me principal
     * @param {HTMLElement} btn - Bouton
     * @param {Object} theme - Configuration du thÃ¯Â¿Â½me
     * @private
     */
    _attachPrimaryButtonHandler(btn, theme) {
        const onClick = (ev) => {
            if (globalThis.L && globalThis.L.DomEvent) {
                globalThis.L.DomEvent.stopPropagation(ev);
            }
            ev.preventDefault();

            this.setTheme(theme.id);
        };

        if (globalThis.L && globalThis.L.DomEvent) {
            globalThis.L.DomEvent.on(btn, "click", onClick);
            globalThis.L.DomEvent.disableClickPropagation(btn);
            // Store cleanup for L.DomEvent.off
            _state._eventCleanups.push(() => {
                if (globalThis.L && globalThis.L.DomEvent) {
                    globalThis.L.DomEvent.off(btn, "click", onClick);
                }
            });
        } else if (events) {
            _state._eventCleanups.push(
                events.on(btn, "click", onClick, false, "ThemeSelector.primaryButton")
            );
        } else {
            btn.addEventListener("click", onClick);
        }
    },

    /**
     * CrÃ¯Â¿Â½e l'UI des thÃ¯Â¿Â½mes secondaires (dropdown + boutons prev/next)
     * @private
     */
    _createSecondaryUI() {
        if (!_state.secondaryContainer) {
            if (Log) Log.warn("[ThemeSelector] Conteneur secondaire introuvable");
            return;
        }

        if (Log)
            Log.debug(
                "[ThemeSelector] CrÃ¯Â¿Â½ation UI secondaire:",
                _state.secondaryThemes.length,
                "thÃ¯Â¿Â½mes"
            );
        if (Log)
            Log.debug(
                "[ThemeSelector] IDs des thÃ¯Â¿Â½mes secondaires:",
                _state.secondaryThemes.map((t) => t.id)
            );

        // Vider le conteneur
        DOMSecurity.clearElementFast(_state.secondaryContainer);

        // Ajouter la classe CSS
        _state.secondaryContainer.classList.add("gl-theme-selector-secondary");

        // CrÃ¯Â¿Â½er le wrapper
        const wrapper = globalThis.L.DomUtil.create(
            "div",
            "gl-theme-selector-secondary__wrapper",
            _state.secondaryContainer
        );

        // Bouton prÃ¯Â¿Â½cÃ¯Â¿Â½dent (si activÃ¯Â¿Â½)
        if (_state.config.secondaryThemes.showNavigationButtons) {
            const prevBtn = globalThis.L.DomUtil.create(
                "button",
                "gl-theme-nav gl-theme-nav--prev",
                wrapper
            );
            prevBtn.type = "button";
            prevBtn.textContent = "\u276E";
            prevBtn.title = "ThÃ¯Â¿Â½me prÃ¯Â¿Â½cÃ¯Â¿Â½dent";
            this._attachNavButtonHandler(prevBtn, "prev");
        }

        // Dropdown
        const select = globalThis.L.DomUtil.create("select", "gl-theme-dropdown", wrapper);
        _state.dropdown = select;

        // Option placeholder
        const placeholder = $create("option", {
            value: "",
            textContent: _state.config.secondaryThemes.placeholder,
            disabled: true,
        });
        select.appendChild(placeholder);

        // Options pour les thÃ¯Â¿Â½mes secondaires
        _state.secondaryThemes.forEach((theme) => {
            const opt = $create("option", {
                value: theme.id,
                textContent: theme.label,
            });
            select.appendChild(opt);
        });

        // SÃ¯Â¿Â½lectionner le thÃ¯Â¿Â½me actif si c'est un thÃ¯Â¿Â½me secondaire
        const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
        if (currentIsSecondary) {
            select.value = _state.currentTheme;
        } else {
            select.value = "";
        }

        // Gestionnaire de changement
        this._attachDropdownHandler(select);

        // Bouton suivant (si activÃ¯Â¿Â½)
        if (_state.config.secondaryThemes.showNavigationButtons) {
            const nextBtn = globalThis.L.DomUtil.create(
                "button",
                "gl-theme-nav gl-theme-nav--next",
                wrapper
            );
            nextBtn.type = "button";
            nextBtn.textContent = "\u276F";
            nextBtn.title = "ThÃ¯Â¿Â½me suivant";
            this._attachNavButtonHandler(nextBtn, "next");
        }

        if (Log)
            Log.debug(
                "[ThemeSelector] UI secondaire crÃ¯Â¿Â½Ã¯Â¿Â½e:",
                _state.secondaryThemes.length,
                "thÃ¯Â¿Â½mes"
            );
    },

    /**
     * Attache le gestionnaire de changement sur le dropdown
     * @param {HTMLSelectElement} select - Dropdown
     * @private
     */
    _attachDropdownHandler(select) {
        const onChange = (ev) => {
            if (globalThis.L && globalThis.L.DomEvent) {
                globalThis.L.DomEvent.stopPropagation(ev);
            }

            const themeId = select.value;
            if (Log) Log.info(`[ThemeSelector] Dropdown changÃ¯Â¿Â½: ${themeId}`);

            if (themeId) {
                this.setTheme(themeId);
            } else {
                if (Log) Log.warn("[ThemeSelector] Dropdown: themeId vide");
            }
        };

        if (globalThis.L && globalThis.L.DomEvent) {
            globalThis.L.DomEvent.on(select, "change", onChange);
            globalThis.L.DomEvent.disableClickPropagation(select);
            // Store cleanup for L.DomEvent.off
            _state._eventCleanups.push(() => {
                if (globalThis.L && globalThis.L.DomEvent) {
                    globalThis.L.DomEvent.off(select, "change", onChange);
                }
            });
        } else if (events) {
            _state._eventCleanups.push(
                events.on(select, "change", onChange, false, "ThemeSelector.dropdown")
            );
        } else {
            select.addEventListener("change", onChange);
        }

        if (Log) Log.debug("[ThemeSelector] Gestionnaire dropdown attachÃ¯Â¿Â½");
    },

    /**
     * Attache le gestionnaire sur un bouton de navigation (prev/next)
     * @param {HTMLElement} btn - Bouton
     * @param {string} direction - "prev" | "next"
     * @private
     */
    _attachNavButtonHandler(btn, direction) {
        const onClick = (ev) => {
            if (globalThis.L && globalThis.L.DomEvent) {
                globalThis.L.DomEvent.stopPropagation(ev);
            }
            ev.preventDefault();

            if (direction === "next") {
                this.nextTheme();
            } else {
                this.previousTheme();
            }
        };

        if (globalThis.L && globalThis.L.DomEvent) {
            globalThis.L.DomEvent.on(btn, "click", onClick);
            globalThis.L.DomEvent.disableClickPropagation(btn);
            // Store cleanup for L.DomEvent.off
            _state._eventCleanups.push(() => {
                if (globalThis.L && globalThis.L.DomEvent) {
                    globalThis.L.DomEvent.off(btn, "click", onClick);
                }
            });
        } else if (events) {
            _state._eventCleanups.push(
                events.on(btn, "click", onClick, false, "ThemeSelector.navButton")
            );
        } else {
            btn.addEventListener("click", onClick);
        }
    },

    /**
     * Active un thÃ¯Â¿Â½me par son ID
     * @param {string} themeId - ID du thÃ¯Â¿Â½me
     * @returns {Promise<void>}
     */
    setTheme(themeId) {
        if (!_state.initialized) {
            return Promise.reject(new Error("ThemeSelector non initialisÃ¯Â¿Â½"));
        }

        const theme = _state.themes.find((t) => t.id === themeId);
        if (!theme) {
            return Promise.reject(new Error(`ThÃ¯Â¿Â½me introuvable: ${themeId}`));
        }

        if (Log) Log.debug("[ThemeSelector] setTheme:", themeId);

        // Appliquer le thÃ¯Â¿Â½me
        return ThemeApplierCore.applyTheme(theme)
            .then(() => {
                _state.currentTheme = themeId;

                // Mettre Ã¯Â¿Â½ jour l'UI
                this._updateUIState(themeId);

                if (Log) Log.debug("[ThemeSelector] ThÃ¯Â¿Â½me activÃ¯Â¿Â½:", themeId);
            })
            .catch((err) => {
                if (Log) Log.warn("[ThemeSelector] Erreur activation thÃ¯Â¿Â½me:", err.message);
                throw err;
            });
    },

    /**
     * Met Ã¯Â¿Â½ jour l'Ã¯Â¿Â½tat visuel de l'UI aprÃ¯Â¿Â½s un changement de thÃ¯Â¿Â½me
     * @param {string} themeId - ID du thÃ¯Â¿Â½me actif
     * @private
     */
    _updateUIState(themeId) {
        // Mettre Ã¯Â¿Â½ jour les boutons principaux
        if (_state.primaryContainer) {
            const buttons = _state.primaryContainer.querySelectorAll(".gl-theme-btn");
            buttons.forEach((btn) => {
                if (btn.dataset.themeId === themeId) {
                    btn.classList.add("gl-theme-btn--active");
                } else {
                    btn.classList.remove("gl-theme-btn--active");
                }
            });
        }

        // Mettre Ã¯Â¿Â½ jour le dropdown
        if (_state.dropdown) {
            const isSecondary = _state.secondaryThemes.some((t) => t.id === themeId);
            if (isSecondary) {
                _state.dropdown.value = themeId;
            } else {
                _state.dropdown.value = "";
            }
        }
    },

    /**
     * Active le thÃ¯Â¿Â½me secondaire suivant
     */
    nextTheme() {
        if (!_state.initialized || _state.secondaryThemes.length === 0) {
            return;
        }

        const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
        let nextIndex = 0;

        if (currentIsSecondary) {
            const currentIndex = _state.secondaryThemes.findIndex(
                (t) => t.id === _state.currentTheme
            );
            nextIndex = (currentIndex + 1) % _state.secondaryThemes.length;
        }

        const nextTheme = _state.secondaryThemes[nextIndex];
        if (nextTheme) {
            this.setTheme(nextTheme.id);
        }
    },

    /**
     * Active le thÃ¯Â¿Â½me secondaire prÃ¯Â¿Â½cÃ¯Â¿Â½dent
     */
    previousTheme() {
        if (!_state.initialized || _state.secondaryThemes.length === 0) {
            return;
        }

        const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
        let prevIndex = _state.secondaryThemes.length - 1;

        if (currentIsSecondary) {
            const currentIndex = _state.secondaryThemes.findIndex(
                (t) => t.id === _state.currentTheme
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
     * RÃ¯Â¿Â½cupÃ¯Â¿Â½re le thÃ¯Â¿Â½me actuellement actif
     * @returns {string|null}
     */
    getCurrentTheme() {
        return _state.currentTheme;
    },

    /**
     * RÃ¯Â¿Â½cupÃ¯Â¿Â½re tous les thÃ¯Â¿Â½mes
     * @returns {Array}
     */
    getThemes() {
        return _state.themes;
    },

    /**
     * RÃ¯Â¿Â½cupÃ¯Â¿Â½re les thÃ¯Â¿Â½mes principaux
     * @returns {Array}
     */
    getPrimaryThemes() {
        return _state.primaryThemes;
    },

    /**
     * RÃ¯Â¿Â½cupÃ¯Â¿Â½re les thÃ¯Â¿Â½mes secondaires
     * @returns {Array}
     */
    getSecondaryThemes() {
        return _state.secondaryThemes;
    },

    /**
     * VÃ¯Â¿Â½rifie si le module est initialisÃ¯Â¿Â½
     * @returns {boolean}
     */
    isInitialized() {
        return _state.initialized;
    },

    /**
     * Cleanup method for event listeners
     * Call this when destroying the theme selector
     */
    destroy() {
        if (Log) Log.debug("[ThemeSelector] Cleaning up event listeners");

        if (_state._eventCleanups) {
            _state._eventCleanups.forEach((cleanup) => {
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
