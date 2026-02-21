/**
 * GeoLeaf GeoJSON Layer Manager - Style
 * Style normalization, hatch patterns, style application
 *
 * @module geojson/layer-manager/style
 */
"use strict";

import { normalizeStyleToLeaflet } from '../style-utils.js';
import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';
import { _createHatchPattern, _findLayerSvg, _applyHatchToLayer } from './hatch-pattern.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const getState = () => GeoJSONShared.state;

const LayerManager = {};

/**
 * Normalise le format de style vers le format Leaflet
 * Phase 4 dedup: delegates base fill/stroke to shared normalizeStyleToLeaflet,
 * then layers on hatch patterns and casing extensions.
 * @private
 * @param {Object} style - Style source (format imbriqué ou plat)
 * @param {string} layerId - ID de la couche (pour les patterns SVG)
 * @returns {Object} - Style normalisé au format Leaflet
 */
function _normalizeStyleToLeaflet(style, layerId) {
    if (!style || typeof style !== 'object') {
        return {};
    }

    // Base normalization (fill/stroke → flat Leaflet props)
    const normalized = normalizeStyleToLeaflet(style);

    // ── Extended: hatch pattern_only override ──
    if (style.fill || style.stroke) {
        if (style.hatch && style.hatch.enabled && style.hatch.renderMode === 'pattern_only') {
            normalized.fillColor = 'transparent';
            normalized.fillOpacity = 1;
        }

        // ── Extended: Casing (bordure/contour pour polylines) ──
        if (style.casing && style.casing.enabled) {
            normalized._casing = {
                enabled: true,
                color: style.casing.color || '#000000',
                opacity: typeof style.casing.opacity === 'number' ? style.casing.opacity : 1.0,
                weight: typeof style.casing.widthPx === 'number' ? style.casing.widthPx : 1.0,
                dashArray: style.casing.dashArray || null,
                lineCap: style.casing.lineCap || null,
                lineJoin: style.casing.lineJoin || null
            };
        }

        // ── Extended: Hatch normalization + SVG pattern creation ──
        if (style.hatch) {
            normalized.hatch = { ...style.hatch };
            if (style.hatch.stroke) {
                const hatchStroke = {};
                if (style.hatch.stroke.color) hatchStroke.color = style.hatch.stroke.color;
                if (typeof style.hatch.stroke.opacity === 'number') hatchStroke.opacity = style.hatch.stroke.opacity;
                if (typeof style.hatch.stroke.widthPx === 'number') hatchStroke.widthPx = style.hatch.stroke.widthPx;
                normalized.hatch.stroke = hatchStroke;
            }

            if (style.hatch.enabled && layerId) {
                const patternId = _createHatchPattern(layerId, style.hatch);
                if (patternId) {
                    normalized._hatchPatternId = patternId;
                    if (style.hatch.renderMode === 'pattern_only') {
                        normalized.fillColor = 'transparent';
                        normalized.fillOpacity = 1;
                    }
                }
            }
        }
    }

    return normalized;
}

/**
 * Applique un nouveau style à une couche existante.
 * Utilisé par le module Themes pour changer dynamiquement l'apparence.
 *
 * @param {string} layerId - ID de la couche
 * @param {Object} styleConfig - Configuration du style { style, styleRules }
 * @returns {boolean} - true si le style a été appliqué avec succès
 */
LayerManager.setLayerStyle = function (layerId, styleConfig) {
    const state = getState();
    const Log = getLog();
    const layerData = state.layers.get(layerId);

    if (!layerData) {
        Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: couche introuvable :", layerId);
        return false;
    }

    // Sprint 8: VT layers — delegate to VectorTiles module
    if (layerData.isVectorTile && _g.GeoLeaf && _g.GeoLeaf._VectorTiles) {
        _g.GeoLeaf._VectorTiles.updateLayerStyle(layerId, styleConfig);
        return true;
    }

    const leafletLayer = layerData.layer;
    if (!leafletLayer || typeof leafletLayer.setStyle !== 'function') {
        Log.warn("[GeoLeaf.GeoJSON] setLayerStyle: couche sans méthode setStyle :", layerId);
        return false;
    }

    // Préparer le style par défaut (ne pas utiliser defaultStyle qui peut contenir les anciennes valeurs)
    const baseStyle = {
        color: '#999999',
        weight: 2,
        opacity: 0.9,
        fillColor: '#cccccc',
        fillOpacity: 0.15
    };

    // Normaliser le style (defaultStyle ou style) vers format Leaflet
    const rawStyle = styleConfig.defaultStyle || styleConfig.style || {};
    const normalizedStyle = _normalizeStyleToLeaflet(rawStyle, layerId);
    const defaultStyle = Object.assign({}, baseStyle, normalizedStyle);

    // Préparer les styleRules
    const styleRules = Array.isArray(styleConfig.styleRules) ? styleConfig.styleRules : [];

    // Fonction de style dynamique
    const styleFn = (feature) => {
        // 1. Commencer avec le style par défaut
        let finalStyle = Object.assign({}, defaultStyle);

        // 2. Appliquer les styleRules (première règle correspondante gagne)
        if (styleRules.length > 0 && _g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver) {
                const matchedStyle = _g.GeoLeaf._GeoJSONStyleResolver.evaluateStyleRules(feature, styleRules);
            if (matchedStyle) {
                // Normaliser le style de la règle vers format Leaflet
                const normalizedRuleStyle = _normalizeStyleToLeaflet(matchedStyle, layerId);
                finalStyle = Object.assign({}, finalStyle, normalizedRuleStyle);
            }
        }

        // 3. NE PAS appliquer properties.style ou properties.color pour permettre aux règles de s'appliquer
        // Commenté car cela écrase les règles de style
        // const featureStyle = feature && feature.properties && feature.properties.style
        //     ? feature.properties.style
        //     : null;
        // if (featureStyle) {
        //     finalStyle = Object.assign({}, finalStyle, featureStyle);
        // }

        return finalStyle;
    };

    // Appliquer le style à toutes les features de la couche
    try {
        let styled = 0;
        let skipped = 0;
        let markersRecreated = 0;
        const layersToRecreate = [];

        // Première passe : identifier et styler ou marquer pour recréation
        leafletLayer.eachLayer(function(layer) {
            if (!layer.feature) {
                skipped++;
                return;
            }

            const style = styleFn(layer.feature);

            // Cas 1: Layers avec setStyle (Path, CircleMarker, Polyline, etc.)
            if (layer.setStyle && typeof layer.setStyle === 'function') {
                layer.setStyle(style);

                // Préserver/restaurer l'état interactive depuis la config de la couche.
                // setStyle() de Leaflet ne touche pas 'interactive', mais certaines
                // recréations de path peuvent le perdre.
                const isInteractive = typeof layerData.config.interactiveShape === 'boolean'
                    ? layerData.config.interactiveShape
                    : (_g.GeoLeaf && _g.GeoLeaf.Config && _g.GeoLeaf.Config.get
                        ? _g.GeoLeaf.Config.get('ui.interactiveShapes', false)
                        : false);
                if (layer.options) {
                    layer.options.interactive = isInteractive;
                }
                // S'assurer que le path SVG a le bon pointer-events
                if (layer._path) {
                    layer._path.style.pointerEvents = isInteractive ? 'auto' : 'none';
                }
                // Pour les layers Canvas : forcer Leaflet à recalculer le
                // hit-area en cas de changement d'interactive. Canvas n'a pas
                // de _path mais utilise _renderer pour le hit-testing.
                if (!layer._path && layer._renderer && typeof layer.redraw === 'function') {
                    layer.redraw();
                }

                styled++;

                // Gérer le casing (bordure pour polylines)
                if (style._casing && style._casing.enabled && layer instanceof _g.L.Polyline && !(layer instanceof _g.L.Polygon)) {
                    const casingConfig = style._casing;

                    // Créer ou mettre à jour la polyline de casing (dessous, plus large)
                    if (!layer._casingLayer) {
                        // Créer une nouvelle couche de casing
                        const casingStyle = {
                            color: casingConfig.color,
                            opacity: casingConfig.opacity,
                            weight: casingConfig.weight,
                            dashArray: casingConfig.dashArray,
                            lineCap: casingConfig.lineCap || 'butt',
                            lineJoin: casingConfig.lineJoin || 'miter',
                            fill: false
                        };

                        layer._casingLayer = _g.L.polyline(layer.getLatLngs(), casingStyle);
                        // Ajouter la couche de casing au même parent (group ou map)
                        if (leafletLayer && leafletLayer.addLayer) {
                            leafletLayer.addLayer(layer._casingLayer);
                        } else if (layer._map) {
                            layer._map.addLayer(layer._casingLayer);
                        }
                        // Mettre la couche de casing derrière la couche principale
                        if (layer._casingLayer.setZIndex) {
                            layer._casingLayer.setZIndex((layer.options.zIndex || 0) - 1);
                        }
                    } else {
                        // Mettre à jour le style existant
                        layer._casingLayer.setStyle({
                            color: casingConfig.color,
                            opacity: casingConfig.opacity,
                            weight: casingConfig.weight,
                            dashArray: casingConfig.dashArray,
                            lineCap: casingConfig.lineCap || 'butt',
                            lineJoin: casingConfig.lineJoin || 'miter'
                        });
                    }
                } else if (!style._casing || !style._casing.enabled) {
                    // Supprimer la couche de casing si elle existe mais n'est plus nécessaire
                    if (layer._casingLayer && leafletLayer && leafletLayer.removeLayer) {
                        leafletLayer.removeLayer(layer._casingLayer);
                        layer._casingLayer = null;
                    }
                }

                // Appliquer le hachurage si présent dans ce style
                if (style._hatchPatternId && style.hatch) {
                    const patternId = style._hatchPatternId;
                    const hatchConfig = style.hatch;

                    // Appliquer immédiatement : fonctionne pour les layers avec _path
                    // ET pour les FeatureGroups (MultiPolygon) via eachLayer récursif.
                    setTimeout(() => {
                        _applyHatchToLayer(layer, patternId, hatchConfig);
                    }, 0);

                    // Ajouter aussi un listener pour quand le layer est ajouté/re-ajouté
                    if (!layer._hatchPatternId || layer._hatchPatternId !== patternId) {
                        layer._hatchPatternId = patternId;

                        // Supprimer l'ancien listener s'il existe
                        if (layer._hatchListener) {
                            layer.off('add', layer._hatchListener);
                        }

                        // Créer le nouveau listener
                        // Ne PAS garder 'if (this._path)' : pour les FeatureGroups
                        // (MultiPolygon), _path est null mais _applyHatchToLayer
                        // gère les groupes via eachLayer.
                        layer._hatchListener = function() {
                            _applyHatchToLayer(this, patternId, hatchConfig);
                        };

                        layer.on('add', layer._hatchListener);

                        // Phase 1 fix L2: cleanup hatch listener on remove to prevent leaks
                        if (!layer._hatchCleanupBound) {
                            layer._hatchCleanupBound = true;
                            layer.on('remove', function() {
                                if (this._hatchListener) {
                                    this.off('add', this._hatchListener);
                                    this._hatchListener = null;
                                }
                            });
                        }
                    }
                }
            }
            // Cas 2: Markers avec icônes - besoin de recréer avec nouvelle icône
            else if (_g.L && layer instanceof _g.L.Marker) {
                layersToRecreate.push({ layer, feature: layer.feature, style });
            } else {
                skipped++;
            }
        });

        // Seconde passe : recréer les markers avec les nouvelles couleurs
        if (layersToRecreate.length > 0) {
            const POIMarkers = _g.GeoLeaf && _g.GeoLeaf._POIMarkers;

            layersToRecreate.forEach(({ layer, feature, style }) => {
                const latlng = layer.getLatLng();

                // Utiliser le système POI pour créer une nouvelle icône colorée
                if (POIMarkers && typeof POIMarkers.buildMarkerIcon === 'function') {
                    const poiData = {
                        ...feature.properties,
                        latlng: [latlng.lat, latlng.lng],
                        attributes: feature.properties.attributes || {},
                        _layerConfig: { style: style } // Passer le style pour resolveCategoryColors
                    };

                    let displayConfig = {};
                    if (typeof POIMarkers.resolveCategoryDisplay === 'function') {
                        displayConfig = POIMarkers.resolveCategoryDisplay(poiData);
                    }

                    // Override avec tous les paramètres du style
                    if (style.fillColor) {
                        displayConfig.colorFill = style.fillColor;
                    }
                    if (style.color) {
                        displayConfig.colorStroke = style.color;
                    }
                    if (typeof style.radius === 'number') {
                        displayConfig.radius = style.radius;
                    }
                    if (typeof style.weight === 'number') {
                        displayConfig.weight = style.weight;
                    }
                    if (typeof style.fillOpacity === 'number') {
                        displayConfig.fillOpacity = style.fillOpacity;
                    }
                    if (typeof style.opacity === 'number') {
                        displayConfig.opacity = style.opacity;
                    }

                    const newIcon = POIMarkers.buildMarkerIcon(displayConfig);
                    layer.setIcon(newIcon);
                    markersRecreated++;
                } else {
                    // Fallback: remplacer par un CircleMarker
                    const newMarker = _g.L.circleMarker(latlng, style);
                    newMarker.feature = feature;
                    leafletLayer.removeLayer(layer);
                    leafletLayer.addLayer(newMarker);
                    markersRecreated++;
                }
            });
        }

        Log.debug(`[GeoLeaf.GeoJSON] Style appliqué: ${styled + markersRecreated} features (${styled} setStyle, ${markersRecreated} markers)`);

        // Appliquer le hachurage global uniquement si pas de styleRules avec hatch
        const hasHatchInRules = styleRules.some(rule => rule.style?.hatch?.enabled);

        if (defaultStyle._hatchPatternId && !hasHatchInRules) {
            const patternId = defaultStyle._hatchPatternId;
            const hatchConfig = defaultStyle.hatch;

            // Appliquer immédiatement (avec hatchConfig pour fill-opacity)
            _applyHatchToLayer(leafletLayer, patternId, hatchConfig);

            // Log résumé au lieu de logs individuels
            Log.debug(`[GeoLeaf.GeoJSON] Hachures appliquées: pattern=${patternId}, features=${styled}`);

            // Supprimer les anciens listeners pour éviter les doublons
            if (layerData._hatchListeners) {
                leafletLayer.off('add', layerData._hatchListeners.onAdd);
                if (_g.L && _g.L.DomEvent) {
                    leafletLayer.eachLayer(layer => {
                        if (layer._path) {
                            layer.off('add', layerData._hatchListeners.onLayerAdd);
                        }
                    });
                }
            }

            // Créer les listeners pour réappliquer le hachurage après les redraws
            const onAdd = () => {
                setTimeout(() => _applyHatchToLayer(leafletLayer, patternId, hatchConfig), 0);
            };

            const onLayerAdd = function() {
                _applyHatchToLayer(this, patternId, hatchConfig);
            };

            // Ajouter les listeners
            leafletLayer.on('add', onAdd);
            leafletLayer.eachLayer(layer => {
                if (layer._path) {
                    layer.on('add', onLayerAdd);
                }
            });

            // Stocker les listeners pour nettoyage futur
            layerData._hatchListeners = { onAdd, onLayerAdd };
            layerData._hatchPatternId = patternId;
        }

        // Mettre à jour la config stockée pour que les futures évaluations utilisent le nouveau style
        layerData.config = Object.assign({}, layerData.config, {
            style: styleConfig.defaultStyle || styleConfig.style,
            styleRules: styleRules
        });

        // Stocker currentStyle pour les labels
        layerData.currentStyle = styleConfig;

        // Mettre à jour l'état du bouton des labels immédiatement
        if (_g.GeoLeaf && _g.GeoLeaf._LabelButtonManager) {
            _g.GeoLeaf._LabelButtonManager.syncImmediate(layerId);
        }

        // Réévaluer la visibilité après application du style (layerScale)
        if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONLayerManager && typeof _g.GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom === "function") {
            _g.GeoLeaf._GeoJSONLayerManager.updateLayerVisibilityByZoom();
        }

        Log.debug("[GeoLeaf.GeoJSON] Style appliqué avec succès :", layerId);
        return true;
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Erreur setLayerStyle :", layerId, err.message);
        return false;
    }
};

export { LayerManager as LayerManagerStyle };
