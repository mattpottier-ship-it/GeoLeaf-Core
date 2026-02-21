/**
 * GeoLeaf Legend API (assemblage namespace Legend)
 * @module legend/legend-api
 */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Module principal GeoLeaf.Legend
 * Gestionnaire de légende cartographique multi-couches avec accordéons
 * Génère automatiquement les légendes depuis les styles
 *
 * DÉPENDANCES:
 * - Leaflet (map instance)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf._LegendControl
 * - GeoLeaf._LegendRenderer
 * - GeoLeaf._LegendGenerator (nouveau)
 * - GeoLeaf.Config (pour chargement configuration)
 *
 * EXPOSE:
 * - GeoLeaf.Legend
 */

"use strict";

import { Log } from "../log/index.js";
const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

let _map = null;
let _control = null;
let _options = {};
let _profileConfig = null;
let _taxonomyData = null;

// Timers and UI helpers
let _rebuildTimer = null;
const REBUILD_DEBOUNCE_MS = 150;
let _loadingOverlayEl = null;
let _loadingOverlayTimer = null;
const LOADING_OVERLAY_TIMEOUT_MS = 12000;

// Map<layerId, {label, styleId, legendData, visible, order, geometryType}>
const _allLayers = new Map();

function _normalizeGeometryType(rawGeometry) {
    const value = (rawGeometry || "").toLowerCase();
    if (value === "polyline" || value === "line") return "line";
    if (value === "polygon") return "polygon";
    return "point";
}

function _scheduleRebuild() {
    if (_rebuildTimer) {
        clearTimeout(_rebuildTimer);
    }
    _rebuildTimer = setTimeout(() => {
        _rebuildTimer = null;
        LegendModule._rebuildDisplay();
    }, REBUILD_DEBOUNCE_MS);
}

function _ensureSpinnerStyles() {
    if (document.getElementById("gl-legend-spinner-style")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "gl-legend-spinner-style";
    styleEl.textContent =
        "@keyframes gl-legend-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
    document.head.appendChild(styleEl);
}

function _clearOverlayTimeout() {
    if (_loadingOverlayTimer) {
        clearTimeout(_loadingOverlayTimer);
        _loadingOverlayTimer = null;
    }
}

function _showLoadingOverlay() {
    if (!_control || !_control._container) return;

    _ensureSpinnerStyles();
    _clearOverlayTimeout();

    const container = _control._container;
    if (!container.style.position) {
        container.style.position = "relative";
    }

    if (!_loadingOverlayEl) {
        const overlay = document.createElement("div");
        overlay.className = "gl-map-legend__loading-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(255,255,255,0.6)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "2";
        overlay.setAttribute("aria-hidden", "false");

        const spinner = document.createElement("div");
        spinner.className = "gl-map-legend__spinner";
        spinner.style.width = "34px";
        spinner.style.height = "34px";
        spinner.style.border = "3px solid rgba(0,0,0,0.12)";
        spinner.style.borderTop = "3px solid rgba(0,0,0,0.55)";
        spinner.style.borderRadius = "50%";
        spinner.style.animation = "gl-legend-spin 1s linear infinite";

        overlay.appendChild(spinner);
        _loadingOverlayEl = overlay;
    }

    if (!_loadingOverlayEl.parentElement) {
        container.appendChild(_loadingOverlayEl);
    }

    container.setAttribute("aria-busy", "true");
    container.setAttribute("aria-live", "polite");

    _loadingOverlayTimer = setTimeout(() => {
        _loadingOverlayTimer = null;
        _hideLoadingOverlay();
    }, LOADING_OVERLAY_TIMEOUT_MS);
}

function _hideLoadingOverlay() {
    _clearOverlayTimeout();
    if (_loadingOverlayEl && _loadingOverlayEl.parentElement) {
        _loadingOverlayEl.parentElement.removeChild(_loadingOverlayEl);
    }
    if (_control && _control._container) {
        _control._container.removeAttribute("aria-busy");
        _control._container.removeAttribute("aria-live");
    }
}

const LegendModule = {
    /**
     * Initialise le module Legend
     * @param {L.Map} mapInstance - Instance de la carte Leaflet
     * @param {Object} options - Options du module
     * @param {string} [options.position="bottomleft"] - Position du contrôle
     * @param {boolean} [options.collapsible=true] - Légende repliable
     * @param {boolean} [options.collapsed=false] - État replié initial
     */
    init: function (mapInstance, options) {
        if (!mapInstance) {
            if (Log) Log.error("[Legend] Carte Leaflet requise pour initialiser Legend");
            return false;
        }

        _map = mapInstance;

        // Charger la configuration depuis le profil
        if (_g.GeoLeaf.Config && typeof _g.GeoLeaf.Config.get === "function") {
            const legendConfig = _g.GeoLeaf.Config.get("legendConfig");

            _options = Object.assign(
                {
                    position: (legendConfig && legendConfig.position) || "bottomleft",
                    collapsible: true,
                    collapsed: (legendConfig && legendConfig.collapsedByDefault) || false,
                    title: (legendConfig && legendConfig.title) || "Légende",
                },
                options || {}
            );

            // Récupérer le profil actif complet
            if (typeof _g.GeoLeaf.Config.getActiveProfile === "function") {
                _profileConfig = _g.GeoLeaf.Config.getActiveProfile();
            } else {
                // Fallback : essayer de récupérer depuis getAll
                const allConfig = _g.GeoLeaf.Config.getAll();
                _profileConfig = {
                    id: allConfig.id || _g.GeoLeaf.Config.get("id"),
                    layers: allConfig.layers || _g.GeoLeaf.Config.get("layers") || [],
                };
            }
        } else {
            _options = Object.assign(
                {
                    position: "bottomleft",
                    collapsible: true,
                    collapsed: false,
                    title: "Légende",
                },
                options || {}
            );
        }

        // Charger la taxonomy pour les icônes
        this._loadTaxonomy();

        // Initialiser toutes les couches du profil
        this._initializeAllLayers();

        if (Log)
            Log.info("[Legend] Module Legend initialisé avec génération automatique depuis styles");
        return true;
    },

    /**
     * Charge la taxonomy pour la correspondance catégories → icônes
     * @private
     */
    _loadTaxonomy: function () {
        if (!_profileConfig) return;

        const Config = _g.GeoLeaf.Config;
        const dataCfg = Config && Config.get ? Config.get("data") : null;
        const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";
        const profileId = _profileConfig.id;

        if (!profileId) {
            if (Log) Log.warn("[Legend] Impossible de charger taxonomy sans profileId");
            return;
        }

        const taxonomyPath = `${profilesBasePath}/${profileId}/taxonomy.json`;

        fetch(taxonomyPath)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => {
                _taxonomyData = data;
                if (Log) Log.debug("[Legend] Taxonomy chargée");
            })
            .catch((err) => {
                if (Log) Log.warn(`[Legend] Erreur chargement taxonomy: ${err.message}`);
            });
    },

    /**
     * Initialise toutes les couches définies dans le profil
     * @private
     */
    _initializeAllLayers: function () {
        if (!_profileConfig || !Array.isArray(_profileConfig.layers)) {
            if (Log) Log.warn("[Legend] Aucune couche définie dans le profil");
            return;
        }

        _profileConfig.layers.forEach((layerDef, index) => {
            _allLayers.set(layerDef.id, {
                label: layerDef.id, // Sera mis à jour lors du chargement du config
                styleId: null,
                legendData: null,
                visible: false,
                order: index + 1,
                geometryType: null,
                configFile: layerDef.configFile,
            });
        });

        if (Log) Log.debug(`[Legend] ${_allLayers.size} couche(s) initialisée(s)`);
    },

    /**
     * Charge et génère la légende pour une couche
     * @param {string} layerId - ID de la couche
     * @param {string} styleId - ID du style à appliquer
     * @param {Object} layerConfig - Configuration de la couche
     */
    loadLayerLegend: function (layerId, styleId, layerConfig) {
        if (!_map) {
            if (Log) Log.warn("[Legend] Module non initialisé");
            return;
        }

        const layerInfo = _allLayers.get(layerId);
        if (!layerInfo) {
            if (Log) Log.warn(`[Legend] Couche ${layerId} non trouvée dans le profil`);
            return;
        }

        // S'assurer que le sprite SVG est disponible dès le début
        if (
            _g.GeoLeaf._POIMarkers &&
            typeof _g.GeoLeaf._POIMarkers.ensureProfileSpriteInjectedSync === "function"
        ) {
            _g.GeoLeaf._POIMarkers.ensureProfileSpriteInjectedSync();
            if (Log) Log.debug(`[Legend] Sprite SVG demandé pour couche ${layerId}`);
        }

        // Mettre à jour les informations de la couche
        layerInfo.label = layerConfig.label || layerId;
        layerInfo.geometryType = _normalizeGeometryType(
            layerConfig.geometryType || layerConfig.geometry || layerInfo.geometryType || "point"
        );
        layerInfo.styleId = styleId;

        // Charger le fichier de style
        const Config = _g.GeoLeaf.Config;
        const dataCfg = Config && Config.get ? Config.get("data") : null;
        const profilesBasePath = (dataCfg && dataCfg.profilesBasePath) || "profiles";
        const profileId = layerConfig._profileId || _profileConfig.id;
        const layerDir = layerConfig._layerDirectory;

        if (!layerConfig.styles || !layerConfig.styles.directory) {
            if (Log) Log.warn(`[Legend] Configuration styles manquante pour ${layerId}`);
            return;
        }

        const stylesDir = layerConfig.styles.directory;
        const styleFile =
            layerConfig.styles.available?.find((s) => s.id === styleId)?.file ||
            layerConfig.styles.default;

        const stylePath = `${profilesBasePath}/${profileId}/${layerDir}/${stylesDir}/${styleFile}`;

        if (Log) Log.debug(`[Legend] Chargement style: ${stylePath}`);

        fetch(stylePath)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((styleData) => {
                // Générer la légende depuis le style
                if (!_g.GeoLeaf._LegendGenerator) {
                    if (Log) Log.error("[Legend] LegendGenerator non disponible");
                    return;
                }

                // Temporairement stocker la config de couche pour le générateur (comme dans markers.js)
                const originalPOIShared = _g.GeoLeaf._POIShared;
                if (layerConfig.showIconsOnMap !== undefined) {
                    // Créer un état temporaire pour cette couche
                    _g.GeoLeaf._POIShared = {
                        state: {
                            poiConfig: {
                                showIconsOnMap: layerConfig.showIconsOnMap,
                            },
                        },
                    };
                }

                const legendData = _g.GeoLeaf._LegendGenerator.generateLegendFromStyle(
                    styleData,
                    layerInfo.geometryType,
                    _taxonomyData
                );

                // Restaurer l'état POI original
                if (layerConfig.showIconsOnMap !== undefined) {
                    _g.GeoLeaf._POIShared = originalPOIShared;
                }

                if (legendData) {
                    layerInfo.legendData = legendData;
                    _allLayers.set(layerId, layerInfo);
                    if (Log) Log.debug(`[Legend] Légende générée pour ${layerId}`);

                    // Reconstruire l'affichage
                    _scheduleRebuild();
                }
            })
            .catch((err) => {
                if (Log) Log.warn(`[Legend] Erreur chargement style: ${err.message}`);
            });
    },

    /**
     * Met à jour la visibilité d'une couche dans la légende
     * @param {string} layerId - ID de la couche
     * @param {boolean} visible - Visible ou non
     */
    setLayerVisibility: function (layerId, visible) {
        const layerInfo = _allLayers.get(layerId);
        if (layerInfo) {
            layerInfo.visible = visible;
            _allLayers.set(layerId, layerInfo);
            _scheduleRebuild();
            if (Log) Log.debug(`[Legend] Visibilité de ${layerId}: ${visible}`);
        }
    },

    /**
     * Reconstruit l'affichage de toutes les légendes
     * @private
     */
    _rebuildDisplay: function () {
        if (!_map) return;

        // Si aucune couche, supprimer le contrôle
        if (_allLayers.size === 0) {
            if (_control && _map) {
                _map.removeControl(_control);
                _control = null;
            }
            return;
        }

        // Créer le contrôle si nécessaire
        if (!_control) {
            _control = _g.GeoLeaf._LegendControl.create(_options);
            if (_control) {
                _map.addControl(_control);
            }
        }

        // Préparer les données pour le rendu (afficher toutes les couches)
        if (_control && typeof _control.updateMultiLayerContent === "function") {
            const visibilityManager = _g.GeoLeaf._LayerVisibilityManager;
            const legendsArray = [];

            _allLayers.forEach((data, layerId) => {
                if (!data.legendData) return;

                const visState =
                    visibilityManager && typeof visibilityManager.getVisibilityState === "function"
                        ? visibilityManager.getVisibilityState(layerId)
                        : null;

                const isVisible = visState ? visState.current : data.visible;
                if (!isVisible) return;

                legendsArray.push({
                    layerId: layerId,
                    label: data.label,
                    collapsed: true,
                    order: data.order,
                    visible: true,
                    sections: data.legendData.sections || [],
                });
            });

            // Trier par ordre
            legendsArray.sort((a, b) => a.order - b.order);

            _control.updateMultiLayerContent(legendsArray);

            // Si nous avons des icônes mais pas de sprite, programmer un retry
            const hasIcons = legendsArray.some((legend) =>
                legend.sections.some(
                    (section) => section.items && section.items.some((item) => item.icon)
                )
            );

            if (hasIcons) {
                const sprite = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                if (!sprite) {
                    if (Log)
                        Log.info(
                            "[Legend] Icônes détectées mais sprite manquant - programmation retry"
                        );
                    // Programmer un nouveau rendu dans 2 secondes
                    setTimeout(() => {
                        const spriteCheck = document.querySelector(
                            'svg[data-geoleaf-sprite="profile"]'
                        );
                        if (spriteCheck && Log) {
                            Log.info("[Legend] Sprite disponible - nouveau rendu de la légende");
                            this._rebuildDisplay();
                        }
                    }, 2000);
                }
            }
        }
    },

    /**
     * Bascule l'état d'un accordéon
     * @param {string} layerId - ID de la couche
     */
    toggleAccordion: function (_layerId) {
        // Géré visuellement par le renderer
    },

    /**
     * Récupère toutes les couches
     * @returns {Map}
     */
    getAllLayers: function () {
        return _allLayers;
    },

    /**
     * Cache la légende
     */
    hideLegend: function () {
        if (_control) {
            _control.hide();
        }
    },

    /**
     * Supprime toutes les légendes
     */
    removeLegend: function () {
        _allLayers.forEach((layerInfo, _layerId) => {
            layerInfo.legendData = null;
            layerInfo.visible = false;
        });

        if (_control && _map) {
            _map.removeControl(_control);
            _control = null;
            if (Log) Log.debug("[Legend] Toutes les légendes supprimées");
        }
    },

    /**
     * Vérifie si des légendes sont affichées
     * @returns {boolean}
     */
    isLegendVisible: function () {
        return _control !== null && _allLayers.size > 0;
    },

    showLoadingOverlay: function () {
        _showLoadingOverlay();
    },

    hideLoadingOverlay: function () {
        _hideLoadingOverlay();
    },
};

const Legend = LegendModule;

export { Legend };
