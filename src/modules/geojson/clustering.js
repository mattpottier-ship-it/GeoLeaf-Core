/**
 * GeoLeaf GeoJSON Module - Clustering
 * Gestion des stratégies de clustering (unified, by-source, etc.)
 *
 * @module geojson/clustering
 */
"use strict";

import { getLog } from '../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});


// Dépendances lazy

const GeoJSONClustering = {};

/**
 * Récupère la configuration POI globale.
 *
 * @returns {Object}
 */
GeoJSONClustering.getPoiConfig = function () {
    const Config = _g.GeoLeaf && _g.GeoLeaf.Config;
    if (Config && typeof Config.get === "function") {
        return Config.get("poiConfig") || {};
    }
    return {};
};

/**
 * Récupère le cluster partagé du module POI s'il existe.
 *
 * @returns {L.MarkerClusterGroup|null}
 */
GeoJSONClustering.getSharedPOICluster = function () {
    const Log = getLog();


    try {
        const POI = _g.GeoLeaf && _g.GeoLeaf.POI;
        if (!POI || typeof POI.getLayer !== "function") {
            Log.debug("[GeoLeaf.GeoJSON] Module POI non disponible ou getLayer() manquant");
            return null;
        }

        const poiLayer = POI.getLayer();

        if (!poiLayer) {
            Log.debug("[GeoLeaf.GeoJSON] POI.getLayer() retourne null/undefined");
            return null;
        }

        Log.debug("[GeoLeaf.GeoJSON] POI.getLayer() retourné:", {
            hasAddLayer: typeof poiLayer.addLayer === "function",
            hasRemoveLayer: typeof poiLayer.removeLayer === "function",
            hasFeatureGroup: poiLayer._featureGroup !== undefined,
            hasGroup: poiLayer._group !== undefined,
            hasClusterGroup: poiLayer._markerCluster !== undefined,
            isMarkerClusterGroup: poiLayer.constructor && poiLayer.constructor.name === 'MarkerClusterGroup',
            constructor: poiLayer.constructor ? poiLayer.constructor.name : 'unknown'
        });

        // Vérifier si c'est un markerClusterGroup ou LayerGroup valide
        // Accepter tout layer avec addLayer/removeLayer (plus permissif)
        if (poiLayer &&
            typeof poiLayer.addLayer === "function" &&
            typeof poiLayer.removeLayer === "function") {
            Log.debug("[GeoLeaf.GeoJSON] Cluster/Layer POI récupéré avec succès");
            return poiLayer;
        }

        Log.warn("[GeoLeaf.GeoJSON] POI.getLayer() ne retourne pas un layer valide (checks failed)");
    } catch (e) {
        Log.error("[GeoLeaf.GeoJSON] Impossible de récupérer le cluster POI :", e);
    }
    return null;
};

/**
 * Détermine la stratégie de clustering pour une couche.
 *
 * @param {Object} def - Définition de la couche
 * @param {Object} geojsonData - Données GeoJSON
 * @returns {Object} - { shouldCluster: boolean, useSharedCluster: boolean }
 */
GeoJSONClustering.getClusteringStrategy = function (def, geojsonData) {
    const Log = getLog();
    const poiConfig = GeoJSONClustering.getPoiConfig();

    // Normaliser def.clustering: peut être boolean ou object
    const clusteringConfig = typeof def.clustering === 'object' ? def.clustering : { enabled: def.clustering };
    const isClusteringEnabled = clusteringConfig.enabled === true;
    const isClusteringDisabled = clusteringConfig.enabled === false;

    // Override explicite dans la couche: clustering.enabled: false (priorité absolue)
    if (isClusteringDisabled) {
        return { shouldCluster: false, useSharedCluster: false };
    }

    // Si clustering désactivé globalement ET pas d'override dans la couche
    if (!poiConfig.clustering && !isClusteringEnabled) {
        return { shouldCluster: false, useSharedCluster: false };
    }

    // Vérifier si la couche contient des Points
    const hasPoints = geojsonData.features && geojsonData.features.some(f =>
        f.geometry && f.geometry.type && f.geometry.type.includes("Point")
    );

    if (!hasPoints) {
        return { shouldCluster: false, useSharedCluster: false };
    }

    // Override explicite dans la couche: clustering.enabled: true
    if (isClusteringEnabled) {
        // Si la couche a des paramètres de clustering spécifiques, créer un cluster indépendant
        const clusterRadius = clusteringConfig.maxClusterRadius || (typeof def.clusterRadius === "number" ? def.clusterRadius : null);
        const disableAtZoom = clusteringConfig.disableClusteringAtZoom || (typeof def.disableClusteringAtZoom === "number" ? def.disableClusteringAtZoom : null);

        const hasCustomClusterParams =
            (clusterRadius !== null && clusterRadius !== (poiConfig.clusterRadius || 80)) ||
            (disableAtZoom !== null && disableAtZoom !== (poiConfig.disableClusteringAtZoom || 18));

        if (hasCustomClusterParams) {
            return {
                shouldCluster: true,
                useSharedCluster: false  // Cluster indépendant avec paramètres personnalisés
            };
        }

        // Sinon, respecter la stratégie globale
        const strategy = poiConfig.clusterStrategy || "unified";
        return {
            shouldCluster: true,
            useSharedCluster: strategy === "unified"
        };
    }

    // Lire la stratégie configurée
    const strategy = poiConfig.clusterStrategy || "unified";

    switch (strategy) {
        case "unified":
            // Un seul cluster partagé pour tous
            return { shouldCluster: true, useSharedCluster: true };

        case "by-layer":
            // Cluster indépendant par couche: respecte clustering.enabled: true/false en config
            // Par défaut, pas de cluster SAUF si clustering.enabled === true
            return {
                shouldCluster: isClusteringEnabled,
                useSharedCluster: false  // Chaque couche a son propre cluster
            };

        case "by-source":
            // Cluster séparé par source
            const sourceConfig = poiConfig.clusterStrategies?.["by-source"]?.sources || {};
            const shouldClusterGeoJSON = sourceConfig.geojson !== false;
            return {
                shouldCluster: shouldClusterGeoJSON,
                useSharedCluster: false
            };

        case "json-only":
            // Cluster uniquement pour JSON, pas GeoJSON
            const jsonOnlyConfig = poiConfig.clusterStrategies?.["json-only"] || {};
            return {
                shouldCluster: jsonOnlyConfig.geojsonClustering === true,
                useSharedCluster: false
            };

        default:
            // Par défaut : comportement unifié (rétrocompatibilité)
            Log.warn("[GeoLeaf.GeoJSON] Stratégie de clustering inconnue: " + strategy + ". Utilisation de 'unified'.");
            return { shouldCluster: true, useSharedCluster: true };
    }
};

/**
 * Crée un cluster indépendant avec les options spécifiées.
 *
 * @param {Object} options - Options de clustering
 * @returns {L.MarkerClusterGroup|null}
 */
GeoJSONClustering.createIndependentCluster = function (options = {}) {
    if (!_g.L || !_g.L.markerClusterGroup) {
        return null;
    }

    return _g.L.markerClusterGroup({
        maxClusterRadius: options.clusterRadius || 80,
        disableClusteringAtZoom: options.disableClusteringAtZoom || 18,
        animate: options.animate !== undefined ? options.animate : false,
        spiderfyOnMaxZoom: options.spiderfyOnMaxZoom !== undefined ? options.spiderfyOnMaxZoom : false,
        showCoverageOnHover: options.showCoverageOnHover !== undefined ? options.showCoverageOnHover : false,
        zoomToBoundsOnClick: options.zoomToBoundsOnClick !== undefined ? options.zoomToBoundsOnClick : true
    });
};

export { GeoJSONClustering };
