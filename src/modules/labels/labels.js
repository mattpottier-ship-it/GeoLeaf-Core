/**
 * Module Labels pour GeoLeaf
 * Gestion des étiquettes flottantes sur les entités
 *
 * DÉPENDANCES:
 * - Leaflet (L.Tooltip, L.DomUtil)
 * - GeoLeaf.Log (optionnel)
 * - GeoLeaf.GeoJSON (pour accéder aux layers)
 * - labels/label-renderer.js (pour le rendu des tooltips)
 * - loaders/style-loader.js (pour extraire les labels depuis les styles)
 *
 * EXPOSE:
 * - GeoLeaf.Labels
 *
 * MIGRATION V3:
 * - Les labels sont maintenant intégrés dans les fichiers style.json
 * - Plus de fichiers styleLabel.json séparés
 * - Les labels sont extraits depuis layerData.currentStyle.label
 */
"use strict";

import { Log } from '../log/index.js';
import { Config } from '../config/config-primitives.js';
import { LabelRenderer } from './label-renderer.js';
import { isScaleInRange as _isScaleInRange, calculateMapScale as _calculateMapScale } from '../utils/scale-utils.js';
import { Core } from '../geoleaf.core.js';
import { GeoJSONCore } from '../geojson/core.js';

const ScaleUtils = { isScaleInRange: _isScaleInRange, calculateMapScale: _calculateMapScale };

/**
 * État interne du module Labels
 * @private
 */
const _state = {
    // Map: layerId -> { enabled, config, tooltips }
    layers: new Map(),
    // Flag pour savoir si l'écouteur de zoom est attaché
    zoomListenerAttached: false
};

/**
 * Module Labels
 * @namespace Labels
 */
const Labels = {
    /**
     * Initialise le système de labels
     * @param {Object} options - Options d'initialisation
     */
    init(options = {}) {
        if (Log) Log.debug("[Labels] Initialisation du module Labels");

        // Écouter les événements de chargement de couches
        this._attachLayerEvents();

        if (Log) Log.debug("[Labels] Module Labels initialisé");
    },

    /**
     * Initialise les labels pour une couche au chargement
     * Charge les labels UNIQUEMENT si:
     * - Le style contient label.enabled === true
     * - label.visibleByDefault === true
     * - La couche est visible
     *
     * POINT D'ENTRÉE UNIQUE pour l'initialisation au chargement
     * @param {string} layerId - ID de la couche
     */
    initializeLayerLabels(layerId) {
        if (!layerId) return;

        const layerData = this._getLayerData(layerId);
        if (!layerData) return;

        // D'ABORD masquer les labels existants pour réinitialiser lors du changement de style
        this._hideLabelsForLayer(layerId);

        // Réinitialiser l'état interne des labels pour cette couche
        _state.layers.delete(layerId);

        // Vérifier si le style a des labels activés
        if (layerData.currentStyle?.label?.enabled !== true) {
            if (Log) Log.debug("[Labels.initialize] Style sans labels ou labels désactivés pour", layerId);
            return;
        }

        // Vérifier visibleByDefault
        const visibleByDefault = layerData.currentStyle.label.visibleByDefault === true;

        if (!visibleByDefault) {
            if (Log) Log.debug("[Labels.initialize] Labels désactivés par défaut pour", layerId);
            // Toujours initialiser la config, mais sans les afficher
            return this.enableLabels(layerId, {}, false);
        }

        // Afficher les labels uniquement si couche visible ET visibleByDefault = true
        const isLayerVisible = layerData._visibility?.current === true;
        if (!isLayerVisible) {
            if (Log) Log.debug("[Labels.initialize] Labels configurés mais couche invisible pour", layerId);
            // Initialiser la config sans afficher
            return this.enableLabels(layerId, {}, false);
        }

        if (Log) Log.debug("[Labels.initialize] Initialisation labels visibles pour", layerId);
        return this.enableLabels(layerId, {}, true);
    },

    /**
     * Active les labels pour une couche
     * Les labels sont extraits depuis le style actuel de la couche (layerData.currentStyle.label)
     * @param {string} layerId - ID de la couche
     * @param {Object} labelConfig - Configuration des labels depuis layer.json (legacy, peut être vide)
     * @param {boolean} showImmediately - Si true, affiche les labels immédiatement (visibleByDefault)
     * @returns {Promise<void>}
     */
    async enableLabels(layerId, labelConfig = {}, showImmediately = true) {
        if (!layerId) {
            if (Log) Log.warn("[Labels] enableLabels: layerId manquant");
            return;
        }

        // VÉRIFICATION: Détecter les références obsolètes à styleFile
        if (labelConfig && labelConfig.styleFile) {
            const errorMessage =
                `❌ CONFIGURATION OBSOLÈTE DÉTECTÉE\n` +
                `═══════════════════════════════════════════════════════\n` +
                `La couche "${layerId}" utilise une référence obsolète à un fichier\n` +
                `de labels séparé via "labelConfig.styleFile".\n\n` +
                `GeoLeaf ne supporte plus les fichiers de labels séparés (styleLabel.json).\n` +
                `Les labels doivent être intégrés dans les fichiers de style.\n\n` +
                `Valeur détectée: ${labelConfig.styleFile}\n` +
                `Couche: ${layerId}\n\n` +
                `Action requise:\n` +
                `1. Supprimez la propriété "labels.styleFile" de la configuration\n` +
                `2. Les labels sont maintenant extraits depuis layerData.currentStyle.label\n` +
                `3. Consultez docs/STYLE_FORMAT_SPEC.md pour la syntaxe\n` +
                `═══════════════════════════════════════════════════════`;

            console.error(errorMessage);
            throw new Error(`Configuration obsolète: labels.styleFile détecté dans la couche ${layerId}`);
        }

        if (Log) Log.debug("[Labels] Préparation labels pour", layerId, "showImmediately:", showImmediately);

        try {
            // Récupérer le style actuel de la couche pour extraire les labels intégrés
            const layerData = this._getLayerData(layerId);
            let labelStyleConfig = null;

            if (layerData && layerData.currentStyle && layerData.currentStyle.label) {
                // Labels intégrés dans le style
                const integratedLabel = layerData.currentStyle.label;

                if (integratedLabel.enabled === true) {
                    labelStyleConfig = integratedLabel;

                    // IMPORTANT: Copier aussi labelScale depuis le style
                    if (layerData.currentStyle.labelScale) {
                        labelStyleConfig.labelScale = layerData.currentStyle.labelScale;
                    }

                    if (Log) {
                        Log.debug("[Labels] Labels intégrés détectés pour", layerId);
                        Log.debug("[Labels] labelScale:", labelStyleConfig.labelScale);
                    }
                } else {
                    if (Log) Log.debug("[Labels] Labels intégrés désactivés (enabled=false) pour", layerId);
                    return;
                }
            } else {
                // Pas de labels intégrés dans le style - vérifier config legacy
                if (labelConfig && labelConfig.enabled && labelConfig.labelId) {
                    // Utiliser la config legacy du fichier de config de la couche
                    labelStyleConfig = {
                        enabled: true,
                        field: labelConfig.labelId,
                        font: labelConfig.font || {
                            family: "Arial",
                            sizePt: 10,
                            weight: 50,
                            bold: false,
                            italic: false
                        },
                        color: labelConfig.color || "#000000",
                        opacity: labelConfig.opacity || 1.0,
                        buffer: labelConfig.buffer || { enabled: false },
                        background: labelConfig.background || { enabled: false },
                        offset: labelConfig.offset || { distancePx: 0 }
                    };
                    if (Log) Log.debug("[Labels] Utilisation config legacy pour", layerId);
                } else {
                    // Pas de labels du tout
                    if (Log) Log.debug("[Labels] Aucun label configuré pour", layerId);
                    return;
                }
            }

            // Stocker la configuration (enabled détermine si on affiche)
            // showImmediately est déterminé par visibleByDefault du style en priorité
            const effectiveShowImmediately = labelStyleConfig.visibleByDefault !== undefined
                ? labelStyleConfig.visibleByDefault
                : showImmediately;

            _state.layers.set(layerId, {
                enabled: effectiveShowImmediately, // true si visibleByDefault, false sinon
                config: labelConfig, // Configuration legacy (minZoom, maxZoom, etc.)
                labelStyle: labelStyleConfig, // Configuration de style extraite du style
                tooltips: new Map() // Map: featureId -> L.Marker
            });

            // Vérifier si la couche est visible avant de créer les labels
            let shouldShowLabels = effectiveShowImmediately;

            // Vérifier l'état de visibilité de la couche dans GeoJSON
            if (layerData) {
                // Utiliser _visibility.current pour vérifier l'état réel
                const isLayerVisible = layerData._visibility && layerData._visibility.current === true;
                shouldShowLabels = effectiveShowImmediately && isLayerVisible;

                if (effectiveShowImmediately && !isLayerVisible) {
                    if (Log) Log.debug("[Labels] Labels configurés pour affichage mais couche invisible:", layerId);
                }
            }

            // Créer les markers seulement si la couche est visible ET showImmediately
            if (shouldShowLabels) {
                await this._createLabelsForLayer(layerId);
            }

            // Attacher l'écouteur de zoom si ce n'est pas déjà fait
            this._ensureZoomListener();

            if (Log) Log.debug("[Labels] Config labels préparée pour", layerId, "visible:", showImmediately);
        } catch (err) {
            if (Log) Log.error("[Labels] Erreur préparation labels:", err);
            console.error("[Labels] Stack trace:", err.stack);
        }
    },

    /**
     * Désactive les labels pour une couche
     * @param {string} layerId - ID de la couche
     */
    disableLabels(layerId) {
        if (!layerId) return;

        const layerState = _state.layers.get(layerId);
        if (!layerState) return;

        if (Log) Log.debug("[Labels] Désactivation des labels pour", layerId);

        // Supprimer tous les tooltips
        if (layerState.tooltips) {
            layerState.tooltips.forEach(tooltip => {
                try {
                    if (tooltip && tooltip.remove) {
                        tooltip.remove();
                    }
                } catch (e) {
                    // Ignore
                }
            });
            layerState.tooltips.clear();
        }

        // Marquer comme désactivé
        layerState.enabled = false;

        if (Log) Log.debug("[Labels] Labels désactivés pour", layerId);
    },

    /**
     * Cache temporairement les labels d'une couche sans changer l'état enabled
     * Utilisé quand la couche est désactivée mais qu'on veut garder la config
     * @param {string} layerId - ID de la couche
     * @private
     */
    _hideLabelsForLayer(layerId) {
        if (!layerId) return;

        const layerState = _state.layers.get(layerId);
        if (!layerState) return;

        if (Log) Log.debug("[Labels] Masquage temporaire des labels pour", layerId);

        // Supprimer tous les markers de la map
        if (layerState.tooltips) {
            layerState.tooltips.forEach(tooltip => {
                try {
                    if (tooltip && tooltip.remove) {
                        tooltip.remove();
                    }
                } catch (e) {
                    // Ignore
                }
            });
            layerState.tooltips.clear();
        }

        // NE PAS changer layerState.enabled - on garde la config
        if (Log) Log.debug("[Labels] Labels masqués (enabled reste:", layerState.enabled, ")");
    },

    /**
     * Bascule l'affichage des labels pour une couche
     * @param {string} layerId - ID de la couche
     * @returns {boolean} Nouvel état (true = activé)
     */
    toggleLabels(layerId) {
        if (!layerId) return false;

        const layerState = _state.layers.get(layerId);
        if (!layerState) return false;

        // VÉRIFICATION CRITIQUE: Le style actuel doit autoriser les labels
        const layerData = this._getLayerData(layerId);
        const currentLabelEnabled = layerData?.currentStyle?.label?.enabled === true;

        if (!currentLabelEnabled) {
            return false;
        }

        if (layerState.enabled) {
            // Désactiver : masquer sans perdre la config
            this._hideLabelsForLayer(layerId);
            layerState.enabled = false;
            return false;
        } else {
            // Activer : changer l'état et rafraîchir (refreshLabels vérifiera la visibilité)
            layerState.enabled = true;
            this.refreshLabels(layerId);
            return true;
        }
    },

    /**
     * Vérifie si la config labels existe pour une couche
     * @param {string} layerId - ID de la couche
     * @returns {boolean}
     */
    hasLabelConfig(layerId) {
        return _state.layers.has(layerId);
    },

    /**
     * Vérifie si les labels sont actifs pour une couche
     * @param {string} layerId - ID de la couche
     * @returns {boolean}
     */
    areLabelsEnabled(layerId) {
        const layerState = _state.layers.get(layerId);
        return layerState ? layerState.enabled : false;
    },

    /**
     * Rafraîchit les labels d'une couche (après zoom, filtre, etc.)
     * @param {string} layerId - ID de la couche
     */
    refreshLabels(layerId) {
        if (!layerId) return;

        const layerState = _state.layers.get(layerId);
        if (!layerState || !layerState.enabled) return;

        // Vérifier si la couche est visible avant de créer les labels
        // Priorité: visibilité de couche prime sur les paramètres d'échelle
        const layerData = this._getLayerData(layerId);
        if (!layerData || !layerData._visibility || !layerData._visibility.current) {
            if (Log) Log.debug("[Labels] Couche invisible, skip refresh pour", layerId);
            return;
        }

        if (Log) Log.debug("[Labels] Rafraîchissement des labels pour", layerId);

        // Supprimer les anciens tooltips
        if (layerState.tooltips) {
            layerState.tooltips.forEach(tooltip => {
                try {
                    if (tooltip && tooltip.remove) tooltip.remove();
                } catch (e) {
                    // Ignore
                }
            });
            layerState.tooltips.clear();
        }

        // Recréer les tooltips
        this._createLabelsForLayer(layerId);
    },

    /**
     * Crée les tooltips permanents pour toutes les features d'une couche
     * @private
     * @param {string} layerId - ID de la couche
     * @returns {Promise<void>}
     */
    async _createLabelsForLayer(layerId) {
        const layerState = _state.layers.get(layerId);
        if (!layerState || !layerState.enabled) {
            if (Log) Log.debug("[Labels] _createLabelsForLayer: layerState non trouvé ou désactivé pour", layerId);
            return;
        }

        // PRIORITÉ: Vérifier la visibilité de la couche AVANT les calculs d'échelle
        const layerData = this._getLayerData(layerId);
        if (!layerData || !layerData._visibility || !layerData._visibility.current) {
            if (Log) Log.debug("[Labels] Couche invisible, abandon création labels pour", layerId);
            return;
        }

        if (!layerData.layer) {
            if (Log) Log.warn("[Labels] Couche GeoJSON non trouvée:", layerId);
            return;
        }

        const { config, labelStyle } = layerState;

        if (Log) Log.debug("[Labels] Création labels pour", layerId, "labelStyle:", labelStyle);

        // Vérifier l'échelle actuelle si labelScale est défini
        const map = Core && Core.getMap ? Core.getMap() : null;

        if (map && labelStyle.labelScale) {
            const { minScale, maxScale } = labelStyle.labelScale;

            if (minScale !== null || maxScale !== null) {
                // Calculer l'échelle actuelle de la carte
                const currentScale = this._calculateMapScale(map);

                if (Log) Log.debug("[Labels] Vérification échelle:", {
                    currentScale,
                    minScale,
                    maxScale,
                    visible: this._isScaleInRange(currentScale, minScale, maxScale)
                });

                if (!this._isScaleInRange(currentScale, minScale, maxScale)) {
                    if (Log) Log.debug("[Labels] Échelle hors limites pour", layerId, `(échelle: 1:${currentScale})`);
                    return;
                }
            }
        } else if (map && config.minZoom !== undefined && config.maxZoom !== undefined) {
            // Fallback sur minZoom/maxZoom legacy
            const currentZoom = map.getZoom();
            if (currentZoom < config.minZoom || currentZoom > config.maxZoom) {
                if (Log) Log.debug("[Labels] Zoom hors limites pour", layerId);
                return;
            }
        }

        // Créer les tooltips via le renderer
        if (LabelRenderer) {
            // Adapter le format nouveau (field) vers ancien (labelId) pour le renderer
            const rendererConfig = {
                labelId: labelStyle.field || config.labelId,
                minZoom: config.minZoom,
                maxZoom: config.maxZoom
            };

            if (Log) Log.debug("[Labels] Appel renderer avec:", {
                layerId,
                labelId: rendererConfig.labelId,
                hasLayer: !!layerData.layer,
                hasStyle: !!labelStyle
            });

            LabelRenderer.createTooltipsForLayer(
                layerId,
                layerData.layer,
                rendererConfig,
                labelStyle, // Passe le style de label extrait du style actuel
                layerState.tooltips
            );

            if (Log) Log.debug("[Labels] Renderer terminé, tooltips créés:", layerState.tooltips.size);
        } else {
            if (Log) Log.error("[Labels] GeoLeaf._LabelRenderer non disponible!");
        }
    },

    /**
     * Récupère les données de la couche depuis GeoLeaf.GeoJSON
     * @private
     * @param {string} layerId - ID de la couche
     * @returns {Object|null} Layer data ou null si non trouvé
     */
    _getLayerData(layerId) {
        if (!GeoJSONCore || typeof GeoJSONCore.getLayerById !== "function") {
            if (Log) Log.warn("[Labels] GeoLeaf.GeoJSON non disponible");
            return null;
        }

        return GeoJSONCore.getLayerById(layerId);
    },

    /**
     * S'assure que l'écouteur de zoom est attaché
     * @private
     */
    _ensureZoomListener() {
        if (_state.zoomListenerAttached) return;

        const map = Core && Core.getMap ? Core.getMap() : null;
        if (map) {
            map.on('zoomend', () => {
                const zoom = map.getZoom();
                if (Log) Log.debug("[Labels] Zoom changé:", zoom);
                this._handleZoomChange({ zoom: zoom });
            });
            _state.zoomListenerAttached = true;
            if (Log) Log.debug("[Labels] Écouteur zoom attaché à la carte");
        } else {
            if (Log) Log.warn("[Labels] Carte non disponible pour attacher l'écouteur de zoom");
        }
    },

    /**
     * Attache les écouteurs d'événements pour les couches
     * @private
     */
    _attachLayerEvents() {
        // Les écouteurs de zoom sont maintenant attachés dans _ensureZoomListener()

        // Écouter les événements personnalisés (si disponibles)
        if (typeof globalThis.addEventListener === "function") {
            // Écouter les événements de chargement de couches
            globalThis.addEventListener("geoleaf:layer-loaded", (evt) => {
                if (evt.detail && evt.detail.layerId) {
                    this._handleLayerLoaded(evt.detail.layerId);
                }
            });
        }
    },

    /**
     * Gère le changement de zoom/échelle
     * @private
     */
    _handleZoomChange(detail) {
        if (!detail) return;

        const map = Core && Core.getMap ? Core.getMap() : null;
        if (!map) return;

        // Calculer l'échelle actuelle
        const currentScale = this._calculateMapScale(map);

        // Parcourir toutes les couches avec labels
        _state.layers.forEach((layerState, layerId) => {
            if (!layerState.enabled) return;

            // PRIORITÉ: Vérifier visibilité couche AVANT calculs d'échelle (performance)
            const layerData = this._getLayerData(layerId);
            if (!layerData || !layerData._visibility || !layerData._visibility.current) {
                // Couche invisible - masquer labels immédiatement, ignorer échelle
                const isShowing = layerState.tooltips && layerState.tooltips.size > 0;
                if (isShowing) {
                    layerState.tooltips.forEach(tooltip => {
                        if (tooltip && tooltip.remove) tooltip.remove();
                    });
                    layerState.tooltips.clear();
                }
                return;
            }

            // Couche visible: vérifier les contraintes d'échelle
            const { labelStyle, config } = layerState;
            let shouldShow = true;

            // Vérifier avec labelScale si disponible
            if (labelStyle && labelStyle.labelScale) {
                const { minScale, maxScale } = labelStyle.labelScale;
                shouldShow = this._isScaleInRange(currentScale, minScale, maxScale);
            } else if (config.minZoom !== undefined && config.maxZoom !== undefined) {
                // Fallback sur minZoom/maxZoom legacy
                const zoom = detail.zoom !== undefined ? detail.zoom : map.getZoom();
                const minZoom = config.minZoom;
                const maxZoom = config.maxZoom;
                shouldShow = zoom >= minZoom && zoom <= maxZoom;
            }

            const isShowing = layerState.tooltips && layerState.tooltips.size > 0;

            if (shouldShow && !isShowing) {
                // Afficher les labels
                this._createLabelsForLayer(layerId);
            } else if (!shouldShow && isShowing) {
                // Masquer les labels
                layerState.tooltips.forEach(tooltip => {
                    if (tooltip && tooltip.remove) tooltip.remove();
                });
                layerState.tooltips.clear();
            }
        });
    },

    /**
     * Gère le chargement d'une couche
     * @private
     */
    async _handleLayerLoaded(layerId) {
        const layerState = _state.layers.get(layerId);
        if (layerState && layerState.enabled) {
            await this._createLabelsForLayer(layerId);
        }
    },

    /**
     * Récupère l'ID du profil actif
     * @private
     */
    _getProfileId() {
        return Config.get('id') || 'default';
    },

    /**
     * Calcule l'échelle actuelle de la carte (1:X format)
     * @private
     * @param {L.Map} map - Instance de la carte Leaflet
     * @returns {number} Échelle (ex: 5000000 pour 1:5M)
     */
    // Phase 4 dedup: removed inline fallback — ScaleUtils is canonical (loaded T2)
    _calculateMapScale(map) {
        if (ScaleUtils && typeof ScaleUtils.calculateMapScale === "function") {
            return ScaleUtils.calculateMapScale(map, { logger: Log });
        }
        if (Log) Log.warn('[Labels] ScaleUtils.calculateMapScale unavailable');
        return 0;
    },

    /**
     * Vérifie si une échelle est dans la plage min/max
     * @private
     * @param {number} currentScale - Échelle actuelle (ex: 5000000)
     * @param {number|null} minScale - Échelle minimale (plus grand nombre = plus dézoomé)
     * @param {number|null} maxScale - Échelle maximale (plus petit nombre = plus zoomé)
     * @returns {boolean} True si l'échelle est dans la plage
     *
     * Logique:
     * - minScale est l'échelle la plus "large" (ex: 15000000 = 1:15M, vue d'ensemble)
     * - maxScale est l'échelle la plus "détaillée" (ex: 1000 = 1:1k, vue rapprochée)
     * - Labels visibles si: maxScale <= currentScale <= minScale
     */
    // Phase 4 dedup: removed inline fallback — ScaleUtils is canonical (loaded T2)
    _isScaleInRange(currentScale, minScale, maxScale) {
        if (ScaleUtils && typeof ScaleUtils.isScaleInRange === "function") {
            return ScaleUtils.isScaleInRange(currentScale, minScale, maxScale, Log);
        }
        if (Log) Log.warn('[Labels] ScaleUtils.isScaleInRange unavailable');
        return true; // Default: visible if ScaleUtils missing
    },

    /**
     * Nettoie toutes les ressources du module
     */
    destroy() {
        if (Log) Log.debug("[Labels] Destruction du module Labels");

        _state.layers.forEach((layerState, layerId) => {
            this.disableLabels(layerId);
        });

        _state.layers.clear();
    }
};

export { Labels };
