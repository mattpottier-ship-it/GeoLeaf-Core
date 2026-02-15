/**
 * Module Theme Selector
 * Sélecteur de thèmes global (principaux + secondaires)
 *
 * DÉPENDANCES:
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
(function (global) {
    "use strict";

    const GeoLeaf = global.GeoLeaf = global.GeoLeaf || {};
    const Log = GeoLeaf.Log;

    // Helper pour utiliser createElement unifié
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    /**
     * État du module
     */
    const _state = {
        initialized: false,
        profileId: null,
        config: null,
        themes: [],
        primaryThemes: [],
        secondaryThemes: [],
        currentTheme: null,
        // Références UI
        primaryContainer: null,
        secondaryContainer: null,
        dropdown: null,
        // Event listener cleanup tracking
        _eventCleanups: []
    };

    /**
     * Module Theme Selector
     * @namespace ThemeSelector
     * @public
     */
    const ThemeSelector = {
        /**
         * Initialise le sélecteur de thèmes
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

            // Charger la configuration des thèmes
            if (!GeoLeaf._ThemeLoader) {
                return Promise.reject(new Error("Module _ThemeLoader non disponible"));
            }

            return GeoLeaf._ThemeLoader.loadThemesConfig(options.profileId)
                .then((themesConfig) => {
                    _state.config = themesConfig.config;
                    _state.themes = themesConfig.themes;
                    _state.primaryThemes = themesConfig.themes.filter((t) => t.type === "primary");
                    _state.secondaryThemes = themesConfig.themes.filter((t) => t.type === "secondary");
                    _state.currentTheme = themesConfig.defaultTheme;

                    if (Log) Log.debug("[ThemeSelector] Configuration chargée:", {
                        total: _state.themes.length,
                        primary: _state.primaryThemes.length,
                        secondary: _state.secondaryThemes.length
                    });

                    // Créer l'UI
                    this._createUI();

                    // Marquer comme initialisé AVANT d'appliquer le thème
                    _state.initialized = true;

                    // Appliquer le thème par défaut
                    return this.setTheme(_state.currentTheme);
                })
                .then(() => {
                    if (Log) Log.debug("[ThemeSelector] Initialisation terminée");
                    // Émettre l'événement de fin de chargement des thèmes
                    const event = new CustomEvent('geoleaf:themes:ready', { detail: { time: Date.now() } });
                    document.dispatchEvent(event);
                })
                .catch((err) => {
                    if (Log) Log.warn("[ThemeSelector] Erreur initialisation:", err.message);
                    // Émettre l'événement même en cas d'erreur
                    const event = new CustomEvent('geoleaf:themes:ready', { detail: { time: Date.now(), error: err.message } });
                    document.dispatchEvent(event);
                    throw err;
                });
        },

        /**
         * Crée l'interface utilisateur
         * @private
         */
        _createUI() {
            // Vérifier si le sélecteur de thèmes est activé globalement
            const uiConfig = GeoLeaf.Config && GeoLeaf.Config.get ? GeoLeaf.Config.get('ui') : null;
            const showThemeSelector = uiConfig ? (uiConfig.showThemeSelector === true) : false;

            if (!showThemeSelector) {
                if (Log) Log.debug("[ThemeSelector] showThemeSelector est false, UI non créée");
                return;
            }

            // Créer l'UI des thèmes principaux
            if (_state.config.primaryThemes.enabled && _state.primaryContainer) {
                this._createPrimaryUI();
            }

            // Créer l'UI des thèmes secondaires
            if (_state.config.secondaryThemes.enabled && _state.secondaryContainer) {
                this._createSecondaryUI();
            }
        },

        /**
         * Crée l'UI des thèmes principaux (boutons)
         * @private
         */
        _createPrimaryUI() {
            if (!_state.primaryContainer) {
                return;
            }

            // Vider le conteneur
            GeoLeaf.DOMSecurity.clearElementFast(_state.primaryContainer);

            // Ajouter la classe CSS
            _state.primaryContainer.classList.add("gl-theme-selector-primary");

            // Créer un bouton pour chaque thème principal
            _state.primaryThemes.forEach((theme) => {
                const btn = global.L.DomUtil.create("button", "gl-theme-btn", _state.primaryContainer);
                btn.type = "button";
                btn.dataset.themeId = theme.id;
                btn.title = theme.description || theme.label;

                // Contenu du bouton: icône + label
                const iconSpan = global.L.DomUtil.create("span", "gl-theme-btn__icon", btn);
                iconSpan.textContent = theme.icon || "📍";

                const labelSpan = global.L.DomUtil.create("span", "gl-theme-btn__label", btn);
                labelSpan.textContent = theme.label;

                // Marquer le thème actif
                if (theme.id === _state.currentTheme) {
                    btn.classList.add("gl-theme-btn--active");
                }

                // Gestionnaire de clic
                this._attachPrimaryButtonHandler(btn, theme);
            });

            if (Log) Log.debug("[ThemeSelector] UI primaire créée:", _state.primaryThemes.length, "boutons");
        },

        /**
         * Attache le gestionnaire de clic sur un bouton de thème principal
         * @param {HTMLElement} btn - Bouton
         * @param {Object} theme - Configuration du thème
         * @private
         */
        _attachPrimaryButtonHandler(btn, theme) {
            const onClick = (ev) => {
                if (global.L && global.L.DomEvent) {
                    global.L.DomEvent.stopPropagation(ev);
                }
                ev.preventDefault();

                this.setTheme(theme.id);
            };

            const events = GeoLeaf.Utils?.events;
            if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(btn, "click", onClick);
                global.L.DomEvent.disableClickPropagation(btn);
                // Store cleanup for L.DomEvent.off
                _state._eventCleanups.push(() => {
                    if (global.L && global.L.DomEvent) {
                        global.L.DomEvent.off(btn, "click", onClick);
                    }
                });
            } else if (events) {
                _state._eventCleanups.push(
                    events.on(
                        btn,
                        "click",
                        onClick,
                        false,
                        'ThemeSelector.primaryButton'
                    )
                );
            } else {
                btn.addEventListener("click", onClick);
            }
        },

        /**
         * Crée l'UI des thèmes secondaires (dropdown + boutons prev/next)
         * @private
         */
        _createSecondaryUI() {
            if (!_state.secondaryContainer) {
                if (Log) Log.warn("[ThemeSelector] Conteneur secondaire introuvable");
                return;
            }

            if (Log) Log.debug("[ThemeSelector] Création UI secondaire:", _state.secondaryThemes.length, "thèmes");
            if (Log) Log.debug("[ThemeSelector] IDs des thèmes secondaires:", _state.secondaryThemes.map(t => t.id));

            // Vider le conteneur
            GeoLeaf.DOMSecurity.clearElementFast(_state.secondaryContainer);

            // Ajouter la classe CSS
            _state.secondaryContainer.classList.add("gl-theme-selector-secondary");

            // Créer le wrapper
            const wrapper = global.L.DomUtil.create("div", "gl-theme-selector-secondary__wrapper", _state.secondaryContainer);

            // Bouton précédent (si activé)
            if (_state.config.secondaryThemes.showNavigationButtons) {
                const prevBtn = global.L.DomUtil.create("button", "gl-theme-nav gl-theme-nav--prev", wrapper);
                prevBtn.type = "button";
                prevBtn.textContent = "◀";
                prevBtn.title = "Thème précédent";
                this._attachNavButtonHandler(prevBtn, "prev");
            }

            // Dropdown
            const select = global.L.DomUtil.create("select", "gl-theme-dropdown", wrapper);
            _state.dropdown = select;

            // Option placeholder
            const placeholder = $create("option", {
                value: "",
                textContent: _state.config.secondaryThemes.placeholder,
                disabled: true
            });
            select.appendChild(placeholder);

            // Options pour les thèmes secondaires
            _state.secondaryThemes.forEach((theme) => {
                const opt = $create("option", {
                    value: theme.id,
                    textContent: theme.label
                });
                select.appendChild(opt);
            });

            // Sélectionner le thème actif si c'est un thème secondaire
            const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
            if (currentIsSecondary) {
                select.value = _state.currentTheme;
            } else {
                select.value = "";
            }

            // Gestionnaire de changement
            this._attachDropdownHandler(select);

            // Bouton suivant (si activé)
            if (_state.config.secondaryThemes.showNavigationButtons) {
                const nextBtn = global.L.DomUtil.create("button", "gl-theme-nav gl-theme-nav--next", wrapper);
                nextBtn.type = "button";
                nextBtn.textContent = "▶";
                nextBtn.title = "Thème suivant";
                this._attachNavButtonHandler(nextBtn, "next");
            }

            if (Log) Log.debug("[ThemeSelector] UI secondaire créée:", _state.secondaryThemes.length, "thèmes");
        },

        /**
         * Attache le gestionnaire de changement sur le dropdown
         * @param {HTMLSelectElement} select - Dropdown
         * @private
         */
        _attachDropdownHandler(select) {
            const onChange = (ev) => {
                if (global.L && global.L.DomEvent) {
                    global.L.DomEvent.stopPropagation(ev);
                }

                const themeId = select.value;
                if (Log) Log.info(`[ThemeSelector] Dropdown changé: ${themeId}`);

                if (themeId) {
                    this.setTheme(themeId);
                } else {
                    if (Log) Log.warn("[ThemeSelector] Dropdown: themeId vide");
                }
            };

            const events = GeoLeaf.Utils?.events;
            if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(select, "change", onChange);
                global.L.DomEvent.disableClickPropagation(select);
                // Store cleanup for L.DomEvent.off
                _state._eventCleanups.push(() => {
                    if (global.L && global.L.DomEvent) {
                        global.L.DomEvent.off(select, "change", onChange);
                    }
                });
            } else if (events) {
                _state._eventCleanups.push(
                    events.on(
                        select,
                        "change",
                        onChange,
                        false,
                        'ThemeSelector.dropdown'
                    )
                );
            } else {
                select.addEventListener("change", onChange);
            }

            if (Log) Log.debug("[ThemeSelector] Gestionnaire dropdown attaché");
        },

        /**
         * Attache le gestionnaire sur un bouton de navigation (prev/next)
         * @param {HTMLElement} btn - Bouton
         * @param {string} direction - "prev" | "next"
         * @private
         */
        _attachNavButtonHandler(btn, direction) {
            const onClick = (ev) => {
                if (global.L && global.L.DomEvent) {
                    global.L.DomEvent.stopPropagation(ev);
                }
                ev.preventDefault();

                if (direction === "next") {
                    this.nextTheme();
                } else {
                    this.previousTheme();
                }
            };

            const events = GeoLeaf.Utils?.events;
            if (global.L && global.L.DomEvent) {
                global.L.DomEvent.on(btn, "click", onClick);
                global.L.DomEvent.disableClickPropagation(btn);
                // Store cleanup for L.DomEvent.off
                _state._eventCleanups.push(() => {
                    if (global.L && global.L.DomEvent) {
                        global.L.DomEvent.off(btn, "click", onClick);
                    }
                });
            } else if (events) {
                _state._eventCleanups.push(
                    events.on(
                        btn,
                        "click",
                        onClick,
                        false,
                        'ThemeSelector.navButton'
                    )
                );
            } else {
                btn.addEventListener("click", onClick);
            }
        },

        /**
         * Active un thème par son ID
         * @param {string} themeId - ID du thème
         * @returns {Promise<void>}
         */
        setTheme(themeId) {
            if (!_state.initialized) {
                return Promise.reject(new Error("ThemeSelector non initialisé"));
            }

            const theme = _state.themes.find((t) => t.id === themeId);
            if (!theme) {
                return Promise.reject(new Error(`Thème introuvable: ${themeId}`));
            }

            if (Log) Log.debug("[ThemeSelector] setTheme:", themeId);

            // Appliquer le thème
            if (!GeoLeaf._ThemeApplier) {
                return Promise.reject(new Error("Module _ThemeApplier non disponible"));
            }

            return GeoLeaf._ThemeApplier.applyTheme(theme)
                .then(() => {
                    _state.currentTheme = themeId;

                    // Mettre à jour l'UI
                    this._updateUIState(themeId);

                    if (Log) Log.debug("[ThemeSelector] Thème activé:", themeId);
                })
                .catch((err) => {
                    if (Log) Log.warn("[ThemeSelector] Erreur activation thème:", err.message);
                    throw err;
                });
        },

        /**
         * Met à jour l'état visuel de l'UI après un changement de thème
         * @param {string} themeId - ID du thème actif
         * @private
         */
        _updateUIState(themeId) {
            // Mettre à jour les boutons principaux
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

            // Mettre à jour le dropdown
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
         * Active le thème secondaire suivant
         */
        nextTheme() {
            if (!_state.initialized || _state.secondaryThemes.length === 0) {
                return;
            }

            const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
            let nextIndex = 0;

            if (currentIsSecondary) {
                const currentIndex = _state.secondaryThemes.findIndex((t) => t.id === _state.currentTheme);
                nextIndex = (currentIndex + 1) % _state.secondaryThemes.length;
            }

            const nextTheme = _state.secondaryThemes[nextIndex];
            if (nextTheme) {
                this.setTheme(nextTheme.id);
            }
        },

        /**
         * Active le thème secondaire précédent
         */
        previousTheme() {
            if (!_state.initialized || _state.secondaryThemes.length === 0) {
                return;
            }

            const currentIsSecondary = _state.secondaryThemes.some((t) => t.id === _state.currentTheme);
            let prevIndex = _state.secondaryThemes.length - 1;

            if (currentIsSecondary) {
                const currentIndex = _state.secondaryThemes.findIndex((t) => t.id === _state.currentTheme);
                prevIndex = (currentIndex - 1 + _state.secondaryThemes.length) % _state.secondaryThemes.length;
            }

            const prevTheme = _state.secondaryThemes[prevIndex];
            if (prevTheme) {
                this.setTheme(prevTheme.id);
            }
        },

        /**
         * Récupère le thème actuellement actif
         * @returns {string|null}
         */
        getCurrentTheme() {
            return _state.currentTheme;
        },

        /**
         * Récupère tous les thèmes
         * @returns {Array}
         */
        getThemes() {
            return _state.themes;
        },

        /**
         * Récupère les thèmes principaux
         * @returns {Array}
         */
        getPrimaryThemes() {
            return _state.primaryThemes;
        },

        /**
         * Récupère les thèmes secondaires
         * @returns {Array}
         */
        getSecondaryThemes() {
            return _state.secondaryThemes;
        },

        /**
         * Vérifie si le module est initialisé
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
                _state._eventCleanups.forEach(cleanup => {
                    if (typeof cleanup === 'function') {
                        cleanup();
                    }
                });
                _state._eventCleanups = [];
            }

            _state.initialized = false;
        }
    };

    // Exposer dans l'espace de noms
    GeoLeaf.ThemeSelector = ThemeSelector;

})(window);
