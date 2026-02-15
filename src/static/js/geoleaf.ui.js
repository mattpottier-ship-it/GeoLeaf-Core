/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Main Orchestrator (Sprint 4.4 Refactored)
 * Orchestrateur principal pour l'interface utilisateur avec délégation complète vers sous-modules
 *
 * @module geoleaf.ui
 * @author Assistant
 * @version 4.4.0 - Modular Architecture
 *
 * RESPONSABILITÉS:
 * ✅ Exposition de l'API publique unifiée
 * ✅ Délégation vers sous-modules spécialisés
 * ✅ Initialisation et coordination des composants
 * ✅ Compatibility layer pour le code legacy
 *
 * MODULES DÉLÉGUÉS:
 * - Theme Management    → _UITheme (ui/theme.js)
 * - Controls            → _UIControls (ui/controls.js)
 * - Panel Builder       → _UIPanelBuilder (ui/panel-builder.js)
 * - Filter Panel        → _UIFilterPanel (ui/filter-panel.js)
 * - Notifications       → _UINotifications (ui/notifications.js)
 * - Event Delegation    → _UIEventDelegation (ui/event-delegation.js)
 * - Filter State Mgmt   → _UIFilterStateManager (ui/filter-state-manager.js)
 */
(function (window) {
    "use strict";

    // ========================================
    //   NAMESPACE & DEPENDENCIES
    // ========================================

    const GeoLeaf = window.GeoLeaf || (window.GeoLeaf = {});
    const Log = GeoLeaf.Log;

    GeoLeaf.UI = GeoLeaf.UI || {};

    // Helper pour createElement unifié
    const $create = (tag, props, ...children) => {
        if (GeoLeaf.Utils && GeoLeaf.Utils.createElement) {
            return GeoLeaf.Utils.createElement(tag, props, ...children);
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
     * Vérifie la disponibilité des modules requis
     * @returns {Object} Status de disponibilité des modules
     */
    function checkModuleAvailability() {
        const modules = {
            theme: !!GeoLeaf._UITheme,
            controls: !!GeoLeaf._UIControls,
            panelBuilder: !!(GeoLeaf._UIPanelBuilder || GeoLeaf.UI.PanelBuilder),
            filterPanel: !!GeoLeaf._UIFilterPanel,
            notifications: !!GeoLeaf._UINotifications,
            eventDelegation: !!GeoLeaf._UIEventDelegation,
            filterStateManager: !!GeoLeaf._UIFilterStateManager
        };

        const missing = Object.entries(modules)
            .filter(([name, available]) => !available)
            .map(([name]) => name);

        if (missing.length > 0 && Log) {
            Log.warn("[UI.Orchestrator] Modules manquants:", missing.join(', '));
        }

        return { modules, missing, allAvailable: missing.length === 0 };
    }

    // ========================================
    //   API DELEGATION - THEME MANAGEMENT
    // ========================================

    if (GeoLeaf._UITheme) {
        // Délégation directe des fonctions thème
        GeoLeaf.UI.initThemeToggle = GeoLeaf._UITheme.initThemeToggle;
        GeoLeaf.UI.toggleTheme = GeoLeaf._UITheme.toggleTheme;
        GeoLeaf.UI.applyTheme = GeoLeaf._UITheme.applyTheme;
        GeoLeaf.UI.getCurrentTheme = GeoLeaf._UITheme.getCurrentTheme;

        // Compatibility aliases
        GeoLeaf.UI.setTheme = GeoLeaf._UITheme.applyTheme;
    }

    // ========================================
    //   API DELEGATION - CONTROLS
    // ========================================

    if (GeoLeaf._UIControls) {
        // Délégation des contrôles Leaflet
        GeoLeaf.UI.initFullscreenControl = GeoLeaf._UIControls.initFullscreenControl;
        GeoLeaf.UI.initGeolocationControl = GeoLeaf._UIControls.initGeolocationControl;
        GeoLeaf.UI.initPoiAddControl = GeoLeaf._UIControls.initPoiAddControl;
        GeoLeaf.UI.initScaleControl = GeoLeaf._UIControls.initScaleControl;

        // État géolocalisation (maintenu pour compatibilité)
        GeoLeaf.UI._userPosition = null;
        GeoLeaf.UI._geolocationActive = false;
        GeoLeaf.UI._geolocationWatchId = null;
    }

    // ========================================
    //   API DELEGATION - PANEL BUILDER
    // ========================================

    if (GeoLeaf._UIPanelBuilder || GeoLeaf.UI.PanelBuilder) {
        // Délégation vers panel builder
        GeoLeaf.UI.buildSidePanel = (GeoLeaf._UIPanelBuilder && GeoLeaf._UIPanelBuilder.buildSidePanel) ||
                                   (GeoLeaf.UI.PanelBuilder && GeoLeaf.UI.PanelBuilder.buildSidePanel);
        GeoLeaf.UI.renderPoiSidePanel = (GeoLeaf._UIPanelBuilder && GeoLeaf._UIPanelBuilder.renderPoiSidePanel) ||
                                       (GeoLeaf.UI.PanelBuilder && GeoLeaf.UI.PanelBuilder.renderPoiSidePanel);

        // Legacy compatibility pour POI panels
        GeoLeaf.UI.renderPoiPanelWithLayout = function(poi, layout, container) {
            if (GeoLeaf.UI.renderPoiSidePanel) {
                return GeoLeaf.UI.renderPoiSidePanel(poi, layout, container);
            }
            if (Log) Log.warn("[UI.Orchestrator] renderPoiPanelWithLayout: PanelBuilder non disponible");
        };

        // Helper functions (deprecated, pour compatibilité)
        GeoLeaf.UI._resolveField = function(poi, fieldPath) {
            if (GeoLeaf._UIDomUtils && GeoLeaf._UIDomUtils.resolveField) {
                return GeoLeaf._UIDomUtils.resolveField(poi, fieldPath);
            }
            return null;
        };

        GeoLeaf.UI._createPlainSection = function(label, innerContent, extraClass) {
            if (GeoLeaf.UI.PanelBuilder && GeoLeaf.UI.PanelBuilder.createPlainSection) {
                return GeoLeaf.UI.PanelBuilder.createPlainSection(label, innerContent, extraClass);
            }
            return $create("section", { className: "gl-poi-panel__section " + (extraClass || "") });
        };

        GeoLeaf.UI._createAccordionSection = function(label, innerContent, options) {
            if (GeoLeaf.UI.PanelBuilder && GeoLeaf.UI.PanelBuilder.createAccordionSection) {
                return GeoLeaf.UI.PanelBuilder.createAccordionSection(label, innerContent, options);
            }
            return $create("section", { className: "gl-poi-panel__section--accordion" });
        };
    }

    // ========================================
    //   API DELEGATION - FILTER PANEL
    // ========================================

    if (GeoLeaf._UIFilterPanel) {
        // Délégation des fonctions filtres
        GeoLeaf.UI.buildFilterPanelFromActiveProfile = GeoLeaf._UIFilterPanel.buildFilterPanelFromActiveProfile;
        GeoLeaf.UI.refreshFilterTags = GeoLeaf._UIFilterPanel.refreshFilterTags;
        GeoLeaf.UI.initFilterToggle = GeoLeaf._UIFilterPanel.initFilterToggle;
        GeoLeaf.UI.initProximityFilter = GeoLeaf._UIFilterPanel.initProximityFilter;
        GeoLeaf.UI._getBasePois = GeoLeaf._UIFilterPanel.getBasePois;
        GeoLeaf.UI._getBaseRoutes = GeoLeaf._UIFilterPanel.getBaseRoutes;

        // Filter state integration si disponible
        if (GeoLeaf._UIFilterStateManager) {
            // Bridge entre filter panel et state manager
            GeoLeaf.UI.resetAllFilters = function() {
                GeoLeaf._UIFilterStateManager.resetAllFilters();
                if (GeoLeaf._UIFilterPanel.refreshFilterTags) {
                    GeoLeaf._UIFilterPanel.refreshFilterTags();
                }
            };

            GeoLeaf.UI.getActiveFilters = GeoLeaf._UIFilterStateManager.getActiveFiltersSummary;
            GeoLeaf.UI.hasActiveFilters = GeoLeaf._UIFilterStateManager.hasActiveFilters;
        }
    }

    // ========================================
    //   API DELEGATION - NOTIFICATIONS
    // ========================================

    if (GeoLeaf._UINotifications) {
        // Créer un namespace dédié pour l'accès complet
        GeoLeaf.UI.Notifications = {
            show: GeoLeaf._UINotifications.show.bind(GeoLeaf._UINotifications),
            success: GeoLeaf._UINotifications.success.bind(GeoLeaf._UINotifications),
            error: GeoLeaf._UINotifications.error.bind(GeoLeaf._UINotifications),
            warning: GeoLeaf._UINotifications.warning.bind(GeoLeaf._UINotifications),
            info: GeoLeaf._UINotifications.info.bind(GeoLeaf._UINotifications),
            clearAll: GeoLeaf._UINotifications.clearAll.bind(GeoLeaf._UINotifications),
            enable: GeoLeaf._UINotifications.enable.bind(GeoLeaf._UINotifications),
            disable: GeoLeaf._UINotifications.disable.bind(GeoLeaf._UINotifications),
            getStatus: GeoLeaf._UINotifications.getStatus.bind(GeoLeaf._UINotifications)
        };

        // Raccourcis globaux pour l'API publique (rétrocompatibilité)
        GeoLeaf.UI.showNotification = GeoLeaf._UINotifications.show.bind(GeoLeaf._UINotifications);
        GeoLeaf.UI.showSuccess = GeoLeaf._UINotifications.success.bind(GeoLeaf._UINotifications);
        GeoLeaf.UI.showError = GeoLeaf._UINotifications.error.bind(GeoLeaf._UINotifications);
        GeoLeaf.UI.showWarning = GeoLeaf._UINotifications.warning.bind(GeoLeaf._UINotifications);
        GeoLeaf.UI.showInfo = GeoLeaf._UINotifications.info.bind(GeoLeaf._UINotifications);
        GeoLeaf.UI.clearNotifications = GeoLeaf._UINotifications.clearAll.bind(GeoLeaf._UINotifications);
    }

    // ========================================
    //   EVENT DELEGATION INTEGRATION
    // ========================================

    let _delegationInitialized = false;

    /**
     * Initialise la délégation d'événements pour l'interface
     * @param {Object} options - Options d'initialisation
     */
    function initializeEventDelegation(options = {}) {
        if (_delegationInitialized || !GeoLeaf._UIEventDelegation) return;

        const { mapContainer, filterContainer } = options;

        // Event listeners pour les filtres si disponible
        if (filterContainer && GeoLeaf._UIFilterStateManager) {
            GeoLeaf._UIEventDelegation.attachFilterInputEvents(
                filterContainer,
                () => {
                    // Callback de changement de filtre - déléguer vers FilterPanel
                    if (GeoLeaf._UIFilterPanel && GeoLeaf._UIFilterPanel.refreshFilterTags) {
                        GeoLeaf._UIFilterPanel.refreshFilterTags();
                    }
                }
            );
        }

        // Event listeners pour les accordéons
        document.addEventListener('DOMContentLoaded', () => {
            const accordionContainers = document.querySelectorAll('.gl-poi-panel, .gl-filter-panel');
            accordionContainers.forEach(container => {
                GeoLeaf._UIEventDelegation.attachAccordionEvents(container);
            });
        });

        _delegationInitialized = true;
        if (Log) Log.info("[UI.Orchestrator] Event delegation initialisée");
    }

    // ========================================
    //   MAIN INITIALIZATION
    // ========================================

    /**
     * Point d'entrée principal pour l'initialisation UI
     * @param {Object} options - Options d'initialisation
     * @param {HTMLElement} options.map - Instance carte Leaflet
     * @param {HTMLElement} options.mapContainer - Conteneur DOM de la carte
     * @param {HTMLElement} options.filterContainer - Conteneur des filtres
     * @param {string} options.buttonSelector - Sélecteur du bouton thème
     * @param {boolean} options.autoInitOnDomReady - Auto-init au DOMContentLoaded
     * @param {boolean} options.enableEventDelegation - Active la délégation d'événements (défaut: true)
     */
    GeoLeaf.UI.init = function(options = {}) {
        const config = {
            buttonSelector: options.buttonSelector || '[data-gl-role="theme-toggle"]',
            autoInitOnDomReady: !!options.autoInitOnDomReady,
            enableEventDelegation: options.enableEventDelegation !== false
        };

        // Vérification des modules
        const { missing, allAvailable } = checkModuleAvailability();
        if (!allAvailable && Log) {
            Log.warn("[UI.Orchestrator] Initialisation avec modules manquants:", missing);
        }

        // Initialisation du thème
        if (GeoLeaf.UI.initThemeToggle) {
            try {
                GeoLeaf.UI.initThemeToggle(config);
            } catch (error) {
                if (Log) Log.error("[UI.Orchestrator] Erreur init thème:", error);
            }
        }

        // Initialisation des contrôles si carte disponible
        if (options.map && options.mapContainer) {
            // Fullscreen control
            if (GeoLeaf.UI.initFullscreenControl) {
                try {
                    GeoLeaf.UI.initFullscreenControl(options.map, options.mapContainer);
                } catch (error) {
                    if (Log) Log.error("[UI.Orchestrator] Erreur fullscreen control:", error);
                }
            }

            // Geolocation control - forcer l'initialisation
            if (GeoLeaf.UI.initGeolocationControl) {
                try {
                    GeoLeaf.UI.initGeolocationControl(options.map, options.config);
                } catch (error) {
                    if (Log) Log.error("[UI.Orchestrator] Erreur geolocation control:", error);
                }
            }

            // POI Add control - forcer l'initialisation
            if (GeoLeaf.UI.initPoiAddControl) {
                try {
                    GeoLeaf.UI.initPoiAddControl(options.map, options.config);
                } catch (error) {
                    if (Log) Log.error("[UI.Orchestrator] Erreur POI add control:", error);
                }
            }

            // Scale control
            if (GeoLeaf.UI.initScaleControl) {
                try {
                    GeoLeaf.UI.initScaleControl(options.map);
                } catch (error) {
                    if (Log) Log.error("[UI.Orchestrator] Erreur scale control:", error);
                }
            }
        }

        // Initialisation de la délégation d'événements
        if (config.enableEventDelegation) {
            initializeEventDelegation({
                mapContainer: options.mapContainer,
                filterContainer: options.filterContainer
            });
        }

        // Initialisation du filter state manager si profil disponible
        if (GeoLeaf._UIFilterStateManager && GeoLeaf.Config) {
            const activeProfile = GeoLeaf.Config.getActiveProfile?.() || null;
            if (activeProfile && activeProfile.filters) {
                try {
                    GeoLeaf._UIFilterStateManager.initializeFromProfile(activeProfile);
                } catch (error) {
                    if (Log) Log.error("[UI.Orchestrator] Erreur init filter state:", error);
                }
            }
        }

        if (Log) {
            Log.info(`[UI.Orchestrator] Initialisation terminée (modules: ${Object.keys(checkModuleAvailability().modules).length})`);
        }
    };

    // ========================================
    //   UTILITY & DEBUG FUNCTIONS
    // ========================================

    /**
     * Informations de debug sur l'état des modules
     * @returns {Object} Status détaillé des modules
     */
    GeoLeaf.UI.getModuleStatus = function() {
        return checkModuleAvailability();
    };

    /**
     * Nettoyage général des resources UI
     */
    GeoLeaf.UI.cleanup = function() {
        // Nettoyage des event listeners
        if (GeoLeaf._UIEventDelegation && GeoLeaf._UIEventDelegation.cleanupAllListeners) {
            const cleaned = GeoLeaf._UIEventDelegation.cleanupAllListeners();
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
    GeoLeaf.UI._attachAccordionBehavior = function(container) {
        if (GeoLeaf._UIEventDelegation && GeoLeaf._UIEventDelegation.attachAccordionEvents) {
            return GeoLeaf._UIEventDelegation.attachAccordionEvents(container);
        }
        if (Log) Log.warn("[UI.Orchestrator] _attachAccordionBehavior: EventDelegation module manquant");
    };

    GeoLeaf.UI._getActiveProfileConfig = function() {
        if (GeoLeaf._UIDomUtils && GeoLeaf._UIDomUtils.getActiveProfileConfig) {
            return GeoLeaf._UIDomUtils.getActiveProfileConfig();
        }
        return GeoLeaf.Config?.getActiveProfile?.() || null;
    };

    // Version info
    GeoLeaf.UI.VERSION = "4.4.0";
    GeoLeaf.UI.BUILD = "Sprint-4.4-Modular";

    if (Log) {
        Log.info(`[UI.Orchestrator] Module initialisé v${GeoLeaf.UI.VERSION}`);
    }

})(window);
