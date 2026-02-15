/**
 * GeoLeaf GeoJSON Layer Manager - Store
 * Layer CRUD operations: get, query, remove, z-index
 *
 * @module geojson/layer-manager/store
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getShared = () => GeoLeaf._GeoJSONShared;
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    const LayerManager = GeoLeaf._GeoJSONLayerManager = GeoLeaf._GeoJSONLayerManager || {};

    /**
     * Récupère une couche spécifique par son ID.
     *
     * @param {string} layerId - ID de la couche
     * @returns {Object|null} - { id, label, layer, visible, config, clusterGroup } ou null
     */
    LayerManager.getLayerById = function (layerId) {
        const state = getState();
        return state.layers.get(layerId) || null;
    };

    /**
     * Récupère les données d'une couche (geojson, geometryType, config).
     * Utilisé par le module Themes pour appliquer les styles.
     *
     * @param {string} layerId - ID de la couche
     * @returns {Object|null} - { geojson, geometryType, config } ou null
     */
    LayerManager.getLayerData = function (layerId) {
        const state = getState();
        const layerData = state.layers.get(layerId);
        if (!layerData) return null;

        return {
            geojson: layerData.geojson || null,
            features: layerData.features || [],
            geometryType: layerData.geometryType || 'unknown',
            config: layerData.config || {},
            layer: layerData.layer
        };
    };

    /**
     * Récupère toutes les couches chargées.
     *
     * @returns {Array<Object>} - Tableau de { id, label, visible, type, featureCount }
     *
     * Note: 'visible' retourne l'état LOGIQUE de la couche (activée/désactivée par l'utilisateur ou le thème),
     * pas l'état physique sur la carte (qui peut être masquée par le zoom).
     * C'est l'état qui doit être reflété par le bouton ON/OFF du gestionnaire de couches.
     */
    LayerManager.getAllLayers = function () {
        const state = getState();
        const Log = getLog();
        const layers = [];
        state.layers.forEach((layerData, id) => {
            // Utiliser logicalState qui est indépendant du zoom
            const meta = layerData._visibility;
            const logicalVisible = meta && typeof meta.logicalState === 'boolean'
                ? meta.logicalState
                : (layerData.visible || false);

            // DEBUG
            if (Log && id === 'hebergements') {
                Log.info(`[getAllLayers] ${id}: logicalState=${meta?.logicalState}, current=${meta?.current}, visible=${layerData.visible}, userOverride=${meta?.userOverride}, themeOverride=${meta?.themeOverride}`);
            }

            layers.push({
                id: id,
                label: layerData.label,
                visible: logicalVisible,
                type: LayerManager.detectLayerType(layerData.layer),
                featureCount: layerData.layer ? layerData.layer.getLayers().length : 0
            });
        });
        return layers;
    };

    /**
     * Détecte le type de géométrie dominant d'une couche.
     *
     * @param {L.GeoJSON} layer
     * @returns {string} - "poi", "route", "area", ou "mixed"
     */
    LayerManager.detectLayerType = function (layer) {
        if (!layer || typeof layer.eachLayer !== 'function') return "mixed";

        const types = { Point: 0, LineString: 0, Polygon: 0 };

        layer.eachLayer((l) => {
            if (l.feature && l.feature.geometry) {
                const geomType = l.feature.geometry.type;
                if (geomType.includes("Point")) types.Point++;
                else if (geomType.includes("LineString")) types.LineString++;
                else if (geomType.includes("Polygon")) types.Polygon++;
            }
        });

        const max = Math.max(types.Point, types.LineString, types.Polygon);
        if (max === 0) return "mixed";
        if (types.Point === max) return "poi";
        if (types.LineString === max) return "route";
        if (types.Polygon === max) return "area";
        return "mixed";
    };

    /**
     * Supprime une couche.
     *
     * @param {string} layerId - ID de la couche
     */
    LayerManager.removeLayer = function (layerId) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] removeLayer: couche introuvable :", layerId);
            return;
        }

        // Retirer de la carte
        if (layerData.visible) {
            LayerManager.hideLayer(layerId);
        }

        // Détruire les objets Leaflet
        if (layerData.clusterGroup) {
            layerData.clusterGroup.clearLayers();
        }
        if (layerData.layer) {
            layerData.layer.clearLayers();
        }

        // Retirer de la Map
        state.layers.delete(layerId);
        state.featureCache.delete(layerId);

        Log.debug("[GeoLeaf.GeoJSON] Couche supprimée :", layerId);
    };

    /**
     * Met à jour le zIndex d'une couche (ordre d'empilement sur la carte).
     * Recréée la couche avec le nouveau pane si elle est visible.
     *
     * @param {string} layerId - ID de la couche
     * @param {number} newZIndex - Nouveau zIndex (0-99)
     * @returns {boolean} - true si la mise à jour a réussi
     */
    LayerManager.updateLayerZIndex = function (layerId, newZIndex) {
        const state = getState();
        const Log = getLog();
        const layerData = state.layers.get(layerId);

        if (!layerData) {
            Log.warn("[GeoLeaf.GeoJSON] updateLayerZIndex: couche introuvable :", layerId);
            return false;
        }

        // Validation et clamping 0-99
        const PaneHelpers = getShared().PaneHelpers;
        newZIndex = PaneHelpers.validateZIndex(newZIndex);

        const oldZIndex = layerData.config.zIndex || 0;
        if (oldZIndex === newZIndex) {
            Log.debug("[GeoLeaf.GeoJSON] updateLayerZIndex: zIndex identique, aucun changement :", layerId);
            return true;
        }

        Log.info(`[GeoLeaf.GeoJSON] Changement zIndex pour ${layerId}: ${oldZIndex} → ${newZIndex}`);

        // Mettre à jour la config
        layerData.config.zIndex = newZIndex;

        // Si la couche n'est pas visible, juste mettre à jour la config
        const VisibilityManager = GeoLeaf._LayerVisibilityManager;
        const visState = VisibilityManager ? VisibilityManager.getVisibilityState(layerId) : null;
        const isVisible = visState ? visState.current : layerData.visible;

        if (!isVisible) {
            Log.debug("[GeoLeaf.GeoJSON] Couche non visible, zIndex mis à jour dans config uniquement");
            return true;
        }

        // Couche visible : besoin de changer le pane
        const newPaneName = PaneHelpers.getPaneName(newZIndex);
        const newPane = state.map.getPane(newPaneName);

        if (!newPane) {
            Log.error(`[GeoLeaf.GeoJSON] Pane ${newPaneName} introuvable`);
            return false;
        }

        try {
            // Retirer temporairement de la carte
            if (layerData.clusterGroup) {
                state.map.removeLayer(layerData.clusterGroup);
            } else {
                state.map.removeLayer(layerData.layer);
            }

            // Changer le pane du layer Leaflet
            if (layerData.layer && layerData.layer.options) {
                layerData.layer.options.pane = newPaneName;

                // Mettre à jour chaque feature/layer individuelle
                layerData.layer.eachLayer(function(subLayer) {
                    if (subLayer.options) {
                        subLayer.options.pane = newPaneName;
                    }
                    // Forcer le re-rendu en changeant le pane du path SVG
                    if (subLayer._path && subLayer._path.parentNode) {
                        const newPaneElement = state.map.getPane(newPaneName);
                        if (newPaneElement) {
                            newPaneElement.appendChild(subLayer._path);
                        }
                    }
                });
            }

            // Changer le pane du clusterGroup si présent
            if (layerData.clusterGroup && layerData.clusterGroup.options) {
                layerData.clusterGroup.options.pane = newPaneName;
            }

            // Remettre sur la carte directement
            if (layerData.clusterGroup) {
                state.map.addLayer(layerData.clusterGroup);
            } else {
                state.map.addLayer(layerData.layer);
            }

            Log.debug(`[GeoLeaf.GeoJSON] Couche ${layerId} déplacée vers pane ${newPaneName}`);

            // Déclencher événement de changement
            if (state.map) {
                state.map.fire("geoleaf:geojson:zindex-changed", {
                    layerId: layerId,
                    oldZIndex: oldZIndex,
                    newZIndex: newZIndex
                });
            }

            return true;
        } catch (error) {
            Log.error(`[GeoLeaf.GeoJSON] Erreur lors du changement de zIndex pour ${layerId}:`, error);
            return false;
        }
    };

})(window);
