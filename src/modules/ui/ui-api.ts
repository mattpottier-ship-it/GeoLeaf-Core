// @ts-nocheck — migration TS, typage progressif
/** GeoLeaf UI API - implementation deplacee depuis geoleaf.ui.js */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Main Orchestrator (Sprint 4.4 Refactored)
 * Orchestrateur main pour l'interface user avec délégation complète vers sous-modules
 *
 * @module geoleaf.ui
 * @author Assistant
 * @version 4.4.0 - Modular Architecture
 *
 * RESPONSABILITÉS:
 * ? Exposition of the API public unifiée
 * ? Délégation vers sous-modules spécialisés
 * ? Initialization et coordination des components
 * ? Compatibility layer for the code legacy
 *
 * MODULES DÉLÉGUÉS:
 * - Theme Management    ? _UITheme (ui/theme.js)
 * - Controls            ? _UIControls (ui/controls.js)
 * - Panel Builder       ? _UIPanelBuilder (ui/panel-builder.js)
 * - Filter Panel        ? _UIFilterPanel (ui/filter-panel.js)
 * - Notifications       ? _UINotifications (ui/notifications.js)
 * - Event Delegation    ? _UIEventDelegation (ui/event-delegation.js)
 * - Filter State Mgmt   ? _UIFilterStateManager (ui/filter-state-manager.js)
 */

"use strict";

import { Log } from "../log/index.js";
import { GeoLocationState } from "./geolocation-state.js";
const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

// ========================================
//   NAMESPACE & DEPENDENCIES
// ========================================

_g.GeoLeaf.UI = _g.GeoLeaf.UI || {};

// Helper pour createElement unifié
const $create = (tag, props, ...children) => {
    if (_g.GeoLeaf.Utils && _g.GeoLeaf.Utils.createElement) {
        return _g.GeoLeaf.Utils.createElement(tag, props, ...children);
    }
    // Fallback to native if DomHelpers not loaded yet
    const el = document.createElement(tag);
    if (props) {
        if (props.className) el.className = props.className;
        if (props.textContent) el.textContent = props.textContent;
    }
    return el;
};

// ========================================
//   MODULE AVAILABILITY CHECKS
// ========================================

/**
 * Vérifie la disponibilité des modules required
 * @returns {Object} Status de disponibilité des modules
 */
function checkModuleAvailability() {
    const modules = {
        theme: !!_g.GeoLeaf._UITheme,
        controls: !!_g.GeoLeaf._UIControls,
        panelBuilder: !!(_g.GeoLeaf._UIPanelBuilder || _g.GeoLeaf.UI.PanelBuilder),
        filterPanel: !!_g.GeoLeaf._UIFilterPanel,
        notifications: !!_g.GeoLeaf._UINotifications,
        eventDelegation: !!_g.GeoLeaf._UIEventDelegation,
        filterStateManager: !!_g.GeoLeaf._UIFilterStateManager,
    };

    const missing = Object.entries(modules)
        .filter(([_name, available]) => !available)
        .map(([name]) => name);

    if (missing.length > 0 && Log) {
        Log.warn("[UI.Orchestrator] Modules manquants:", missing.join(", "));
    }

    return { modules, missing, allAvailable: missing.length === 0 };
}

// ========================================
//   API DELEGATION - THEME MANAGEMENT
// ========================================

if (_g.GeoLeaf._UITheme) {
    // Délégation directe des fonctions thème
    _g.GeoLeaf.UI.initThemeToggle = _g.GeoLeaf._UITheme.initThemeToggle;
    _g.GeoLeaf.UI.toggleTheme = _g.GeoLeaf._UITheme.toggleTheme;
    _g.GeoLeaf.UI.applyTheme = _g.GeoLeaf._UITheme.applyTheme;
    _g.GeoLeaf.UI.getCurrentTheme = _g.GeoLeaf._UITheme.getCurrentTheme;

    // Compatibility aliases
    _g.GeoLeaf.UI.setTheme = _g.GeoLeaf._UITheme.applyTheme;
}

// ========================================
//   API DELEGATION - CONTROLS
// ========================================

if (_g.GeoLeaf._UIControls) {
    // Délégation des contrôles Leaflet
    _g.GeoLeaf.UI.initFullscreenControl = _g.GeoLeaf._UIControls.initFullscreenControl;
    _g.GeoLeaf.UI.initGeolocationControl = _g.GeoLeaf._UIControls.initGeolocationControl;
    _g.GeoLeaf.UI.initPoiAddControl = _g.GeoLeaf._UIControls.initPoiAddControl;
    _g.GeoLeaf.UI.initScaleControl = _g.GeoLeaf._UIControls.initScaleControl;

    // État géolocalisation — proxy live vers GeoLocationState (CDN backward compat)
    Object.defineProperty(_g.GeoLeaf.UI, "_geolocationActive", {
        get() {
            return GeoLocationState.active;
        },
        set(v) {
            GeoLocationState.active = v;
        },
        configurable: true,
        enumerable: true,
    });
    Object.defineProperty(_g.GeoLeaf.UI, "_geolocationWatchId", {
        get() {
            return GeoLocationState.watchId;
        },
        set(v) {
            GeoLocationState.watchId = v;
        },
        configurable: true,
        enumerable: true,
    });
    Object.defineProperty(_g.GeoLeaf.UI, "_userPosition", {
        get() {
            return GeoLocationState.userPosition;
        },
        set(v) {
            GeoLocationState.userPosition = v;
        },
        configurable: true,
        enumerable: true,
    });
    Object.defineProperty(_g.GeoLeaf.UI, "_userPositionAccuracy", {
        get() {
            return GeoLocationState.userPositionAccuracy;
        },
        set(v) {
            GeoLocationState.userPositionAccuracy = v;
        },
        configurable: true,
        enumerable: true,
    });
}

// ========================================
//   API DELEGATION - PANEL BUILDER
// ========================================

if (_g.GeoLeaf._UIPanelBuilder || _g.GeoLeaf.UI.PanelBuilder) {
    // Délégation vers panel builder
    _g.GeoLeaf.UI.buildSidePanel =
        (_g.GeoLeaf._UIPanelBuilder && _g.GeoLeaf._UIPanelBuilder.buildSidePanel) ||
        (_g.GeoLeaf.UI.PanelBuilder && _g.GeoLeaf.UI.PanelBuilder.buildSidePanel);
    _g.GeoLeaf.UI.renderPoiSidePanel =
        (_g.GeoLeaf._UIPanelBuilder && _g.GeoLeaf._UIPanelBuilder.renderPoiSidePanel) ||
        (_g.GeoLeaf.UI.PanelBuilder && _g.GeoLeaf.UI.PanelBuilder.renderPoiSidePanel);

    // Legacy compatibility pour POI panels
    _g.GeoLeaf.UI.renderPoiPanelWithLayout = function (poi, layout, container) {
        if (_g.GeoLeaf.UI.renderPoiSidePanel) {
            return _g.GeoLeaf.UI.renderPoiSidePanel(poi, layout, container);
        }
        if (Log)
            Log.warn("[UI.Orchestrator] renderPoiPanelWithLayout: PanelBuilder non disponible");
    };

    // Helper functions (deprecated, pour compatibilité)
    _g.GeoLeaf.UI._resolveField = function (poi, fieldPath) {
        if (_g.GeoLeaf._UIDomUtils && _g.GeoLeaf._UIDomUtils.resolveField) {
            return _g.GeoLeaf._UIDomUtils.resolveField(poi, fieldPath);
        }
        return null;
    };

    _g.GeoLeaf.UI._createPlainSection = function (label, innerContent, extraClass) {
        if (_g.GeoLeaf.UI.PanelBuilder && _g.GeoLeaf.UI.PanelBuilder.createPlainSection) {
            return _g.GeoLeaf.UI.PanelBuilder.createPlainSection(label, innerContent, extraClass);
        }
        return $create("section", { className: "gl-poi-panel__section " + (extraClass || "") });
    };

    _g.GeoLeaf.UI._createAccordionSection = function (label, innerContent, options) {
        if (_g.GeoLeaf.UI.PanelBuilder && _g.GeoLeaf.UI.PanelBuilder.createAccordionSection) {
            return _g.GeoLeaf.UI.PanelBuilder.createAccordionSection(label, innerContent, options);
        }
        return $create("section", { className: "gl-poi-panel__section--accordion" });
    };
}

// ========================================
//   API DELEGATION - FILTER PANEL
// ========================================

if (_g.GeoLeaf._UIFilterPanel) {
    // Délégation des fonctions filtres
    _g.GeoLeaf.UI.buildFilterPanelFromActiveProfile =
        _g.GeoLeaf._UIFilterPanel.buildFilterPanelFromActiveProfile;
    _g.GeoLeaf.UI.refreshFilterTags = _g.GeoLeaf._UIFilterPanel.refreshFilterTags;
    _g.GeoLeaf.UI.initFilterToggle = _g.GeoLeaf._UIFilterPanel.initFilterToggle;
    _g.GeoLeaf.UI.initProximityFilter = _g.GeoLeaf._UIFilterPanel.initProximityFilter;
    _g.GeoLeaf.UI._getBasePois = _g.GeoLeaf._UIFilterPanel.getBasePois;
    _g.GeoLeaf.UI._getBaseRoutes = _g.GeoLeaf._UIFilterPanel.getBaseRoutes;

    // Filter state integration si available
    if (_g.GeoLeaf._UIFilterStateManager) {
        // Bridge entre filter panel et state manager
        _g.GeoLeaf.UI.resetAllFilters = function () {
            _g.GeoLeaf._UIFilterStateManager.resetAllFilters();
            if (_g.GeoLeaf._UIFilterPanel.refreshFilterTags) {
                _g.GeoLeaf._UIFilterPanel.refreshFilterTags();
            }
        };

        _g.GeoLeaf.UI.getActiveFilters = _g.GeoLeaf._UIFilterStateManager.getActiveFiltersSummary;
        _g.GeoLeaf.UI.hasActiveFilters = _g.GeoLeaf._UIFilterStateManager.hasActiveFilters;
    }
}

// ========================================
//   API DELEGATION - NOTIFICATIONS
// ========================================

if (_g.GeoLeaf._UINotifications) {
    // Créer un namespace dédié pour l'accès complete
    _g.GeoLeaf.UI.Notifications = {
        show: _g.GeoLeaf._UINotifications.show.bind(_g.GeoLeaf._UINotifications),
        success: _g.GeoLeaf._UINotifications.success.bind(_g.GeoLeaf._UINotifications),
        error: _g.GeoLeaf._UINotifications.error.bind(_g.GeoLeaf._UINotifications),
        warning: _g.GeoLeaf._UINotifications.warning.bind(_g.GeoLeaf._UINotifications),
        info: _g.GeoLeaf._UINotifications.info.bind(_g.GeoLeaf._UINotifications),
        clearAll: _g.GeoLeaf._UINotifications.clearAll.bind(_g.GeoLeaf._UINotifications),
        enable: _g.GeoLeaf._UINotifications.enable.bind(_g.GeoLeaf._UINotifications),
        disable: _g.GeoLeaf._UINotifications.disable.bind(_g.GeoLeaf._UINotifications),
        getStatus: _g.GeoLeaf._UINotifications.getStatus.bind(_g.GeoLeaf._UINotifications),
    };

    // Shortcuts globals pour l'API public (rétrocompatibilité)
    _g.GeoLeaf.UI.showNotification = _g.GeoLeaf._UINotifications.show.bind(
        _g.GeoLeaf._UINotifications
    );
    _g.GeoLeaf.UI.showSuccess = _g.GeoLeaf._UINotifications.success.bind(
        _g.GeoLeaf._UINotifications
    );
    _g.GeoLeaf.UI.showError = _g.GeoLeaf._UINotifications.error.bind(_g.GeoLeaf._UINotifications);
    _g.GeoLeaf.UI.showWarning = _g.GeoLeaf._UINotifications.warning.bind(
        _g.GeoLeaf._UINotifications
    );
    _g.GeoLeaf.UI.showInfo = _g.GeoLeaf._UINotifications.info.bind(_g.GeoLeaf._UINotifications);
    _g.GeoLeaf.UI.clearNotifications = _g.GeoLeaf._UINotifications.clearAll.bind(
        _g.GeoLeaf._UINotifications
    );
}

// ========================================
//   EVENT DELEGATION INTEGRATION
// ========================================

let _delegationInitialized = false;

/**
 * Initializes the délégation d'événements pour l'interface
 * @param {Object} options - Options d'initialization
 */
function initializeEventDelegation(options = {}) {
    if (_delegationInitialized || !_g.GeoLeaf._UIEventDelegation) return;

    const { filterContainer } = options;

    // Event listners pour the filters si available
    if (filterContainer && _g.GeoLeaf._UIFilterStateManager) {
        _g.GeoLeaf._UIEventDelegation.attachFilterInputEvents(filterContainer, () => {
            // Callback de changement de filters - déléguer vers FilterPanel
            if (_g.GeoLeaf._UIFilterPanel && _g.GeoLeaf._UIFilterPanel.refreshFilterTags) {
                _g.GeoLeaf._UIFilterPanel.refreshFilterTags();
            }
        });
    }

    // Event listners for thes accordéons
    document.addEventListener("DOMContentLoaded", () => {
        const accordionContainers = document.querySelectorAll(".gl-poi-panel, .gl-filter-panel");
        accordionContainers.forEach((container) => {
            _g.GeoLeaf._UIEventDelegation.attachAccordionEvents(container);
        });
    });

    _delegationInitialized = true;
    if (Log) Log.info("[UI.Orchestrator] Event delegation initialisée");
}

// ========================================
//   MAIN INITIALIZATION HELPERS
// ========================================

function _checkAndLogModules() {
    const { missing, allAvailable } = checkModuleAvailability();
    if (!allAvailable) {
        if (Log) Log.warn("[UI.Orchestrator] Initialization with missing modules:", missing);
    }
}

function _tryControl(fn: (...args: unknown[]) => void, logMsg: string, ...args: unknown[]) {
    if (!fn) return;
    try {
        fn(...args);
    } catch (error) {
        if (Log) Log.error(logMsg, error);
    }
}

function _initThemeControl(config: Record<string, unknown>) {
    const fn = _g.GeoLeaf.UI.initThemeToggle;
    if (!fn) return;
    try {
        fn(config);
    } catch (error) {
        if (Log) Log.error("[UI.Orchestrator] Erreur init th\u00e8me:", error);
    }
}

function _initMapControls(options: Record<string, unknown>) {
    if (!options.map) return;
    if (!options.mapContainer) return;
    _tryControl(
        _g.GeoLeaf.UI.initFullscreenControl,
        "[UI.Orchestrator] Erreur fullscreen control:",
        options.map,
        options.mapContainer
    );
    _tryControl(
        _g.GeoLeaf.UI.initGeolocationControl,
        "[UI.Orchestrator] Erreur geolocation control:",
        options.map,
        options.config
    );
    _tryControl(
        _g.GeoLeaf.UI.initPoiAddControl,
        "[UI.Orchestrator] Erreur POI add control:",
        options.map,
        options.config
    );
    _tryControl(
        _g.GeoLeaf.UI.initScaleControl,
        "[UI.Orchestrator] Erreur scale control:",
        options.map
    );
}

function _initFilterState() {
    if (!_g.GeoLeaf._UIFilterStateManager) return;
    if (!_g.GeoLeaf.Config) return;
    const getProfile = _g.GeoLeaf.Config.getActiveProfile;
    if (!getProfile) return;
    const activeProfile = getProfile();
    if (!activeProfile) return;
    if (!activeProfile.filters) return;
    try {
        _g.GeoLeaf._UIFilterStateManager.initializeFromProfile(activeProfile);
    } catch (error) {
        if (Log) Log.error("[UI.Orchestrator] Erreur init filter state:", error);
    }
}

// ========================================
//   MAIN INITIALIZATION
// ========================================

/**
 * Point d'entrée main pour l'initialization UI
 * @param {Object} options - Options d'initialization
 * @param {HTMLElement} options.map - Instance carte Leaflet
 * @param {HTMLElement} options.mapContainer - Conteneur DOM de the map
 * @param {HTMLElement} options.filterContainer - Conteneur des filtres
 * @param {string} options.buttonSelector - Sélecteur du button thème
 * @param {boolean} options.autoInitOnDomReady - Auto-init au DOMContentLoaded
 * @param {boolean} options.enableEventDelegation - Active la délégation d'événements (défaut: true)
 */
_g.GeoLeaf.UI.init = function (options = {}) {
    const config = {
        buttonSelector: options.buttonSelector || '[data-gl-role="theme-toggle"]',
        autoInitOnDomReady: !!options.autoInitOnDomReady,
        enableEventDelegation: options.enableEventDelegation !== false,
    };

    _checkAndLogModules();
    _initThemeControl(config);
    _initMapControls(options);

    if (config.enableEventDelegation) {
        initializeEventDelegation({
            mapContainer: options.mapContainer,
            filterContainer: options.filterContainer,
        });
    }

    _initFilterState();

    if (Log) {
        Log.info(
            `[UI.Orchestrator] Initialisation termin\u00e9e (modules: ${Object.keys(checkModuleAvailability().modules).length})`
        );
    }
};

// ========================================
//   UTILITY & DEBUG FUNCTIONS
// ========================================

/**
 * Information de debug sur l'état des modules
 * @returns {Object} Status détaillé des modules
 */
_g.GeoLeaf.UI.getModuleStatus = function () {
    return checkModuleAvailability();
};

/**
 * Nettoyage général des resources UI
 */
_g.GeoLeaf.UI.cleanup = function () {
    // Nettoyage des event listners
    if (_g.GeoLeaf._UIEventDelegation && _g.GeoLeaf._UIEventDelegation.cleanupAllListeners) {
        const cleaned = _g.GeoLeaf._UIEventDelegation.cleanupAllListeners();
        if (Log && cleaned > 0) {
            Log.info(`[UI.Orchestrator] ${cleaned} event listeners nettoyés`);
        }
    }

    // Reset flag délégation
    _delegationInitialized = false;

    if (Log) Log.info("[UI.Orchestrator] Nettoyage terminé");
};

// ========================================
//   LEGACY COMPATIBILITY LAYER
// ========================================

// Fonctions legacy maintenues pour compatibilité
_g.GeoLeaf.UI._attachAccordionBehavior = function (container) {
    if (_g.GeoLeaf._UIEventDelegation && _g.GeoLeaf._UIEventDelegation.attachAccordionEvents) {
        return _g.GeoLeaf._UIEventDelegation.attachAccordionEvents(container);
    }
    if (Log)
        Log.warn("[UI.Orchestrator] _attachAccordionBehavior: EventDelegation module manquant");
};

_g.GeoLeaf.UI._getActiveProfileConfig = function () {
    if (_g.GeoLeaf._UIDomUtils && _g.GeoLeaf._UIDomUtils.getActiveProfileConfig) {
        return _g.GeoLeaf._UIDomUtils.getActiveProfileConfig();
    }
    return _g.GeoLeaf.Config?.getActiveProfile?.() || null;
};

_g.GeoLeaf.UI._populateSelectOptionsFromTaxonomy = function (selectEl, profile, optionsFrom) {
    if (!_g.GeoLeaf._UIDomUtils) {
        Log?.error?.("[UI] _UIDomUtils unavailable");
        return;
    }
    return _g.GeoLeaf._UIDomUtils.populateSelectOptionsFromTaxonomy(selectEl, profile, optionsFrom);
};

// Version info
_g.GeoLeaf.UI.VERSION = "4.4.0";
_g.GeoLeaf.UI.BUILD = "Sprint-4.4-Modular";

if (Log) {
    Log.info(`[UI.Orchestrator] Module initialisé v${GeoLeaf.UI.VERSION}`);
}

const UI = _g.GeoLeaf.UI;
export { UI };
