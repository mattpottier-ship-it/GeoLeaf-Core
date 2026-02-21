/**
 * GeoLeaf GeoJSON Loader - Data
 * Chargement direct de données GeoJSON (URL ou objet JS)
 *
 * @module geojson/loader/data
 */
"use strict";

import { GeoJSONShared } from '../shared.js';
import { getLog } from '../../utils/general-utils.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

const getState = () => GeoJSONShared.state;

const Loader = {};

/**
 * Charge un fichier GeoJSON via une URL.
 *
 * @param {string} url - URL du fichier GeoJSON.
 * @param {Object} [options] - Options additionnelles, fusionnées avec celles du module.
 * @returns {Promise<L.GeoJSON|null>}
 */
Loader.loadUrl = async function (url, options = {}) {
    const state = getState();
    const Log = getLog();

    if (!url) {
        Log.warn("[GeoLeaf.GeoJSON] URL GeoJSON manquante.");
        return state.geoJsonLayer;
    }

    if (!state.map) {
        Log.error("[GeoLeaf.GeoJSON] Module non initialisé. Appelle GeoLeaf.GeoJSON.init() avant loadUrl().");
        return null;
    }

    const mergedOptions = _g.GeoLeaf && _g.GeoLeaf.Utils && _g.GeoLeaf.Utils.mergeOptions
        ? _g.GeoLeaf.Utils.mergeOptions(state.options, options)
        : Object.assign({}, state.options, options);

    try {
        // Sprint 3.3: Use unified FetchHelper for GeoJSON loading
        const FetchHelper = _g.GeoLeaf && _g.GeoLeaf.Utils?.FetchHelper;

        let data;
        if (FetchHelper) {
            data = await FetchHelper.get(url, {
                timeout: 20000, // GeoJSON files can be large
                retries: 2
            });
        } else {
            // Fallback to raw fetch
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("HTTP " + response.status + " pour " + url);
            }
            data = await response.json();
        }

        _g.GeoLeaf && Loader.addData(data, mergedOptions);
        return state.geoJsonLayer;
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Erreur lors du chargement GeoJSON :", err);
        return state.geoJsonLayer;
    }
};

/**
 * Ajoute des données GeoJSON passées directement en objet JS.
 * Valide les features selon le schéma strict avant ajout.
 *
 * @param {Object} geojsonData - Objet GeoJSON valide.
 * @param {Object} [options] - Options additionnelles, fusionnées avec celles du module.
 */
Loader.addData = function (geojsonData, options = {}) {
    const state = getState();
    const Log = getLog();

    if (!geojsonData) {
        Log.warn("[GeoLeaf.GeoJSON] Aucune donnée GeoJSON fournie à addData().");
        return;
    }

    if (!state.map || !state.geoJsonLayer) {
        Log.error("[GeoLeaf.GeoJSON] Module non initialisé. Appelle GeoLeaf.GeoJSON.init() avant addData().");
        return;
    }

    const mergedOptions = _g.GeoLeaf && _g.GeoLeaf.Utils && _g.GeoLeaf.Utils.mergeOptions
        ? _g.GeoLeaf.Utils.mergeOptions(state.options, options)
        : Object.assign({}, state.options, options);

    // Met à jour les options de la couche si besoin
    if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONStyleResolver && _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions) {
        state.geoJsonLayer.options = _g.GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
    }

    // Validation stricte des features GeoJSON
    let dataToAdd = geojsonData;
    if (_g.GeoLeaf && _g.GeoLeaf._GeoJSONFeatureValidator && typeof _g.GeoLeaf._GeoJSONFeatureValidator.validateFeatureCollection === "function") {
        const validationResult = _g.GeoLeaf._GeoJSONFeatureValidator.validateFeatureCollection(geojsonData);

        if (validationResult.errors.length > 0) {
            Log.warn(
                `[GeoLeaf.GeoJSON] Validation: ${validationResult.errors.length} feature(s) rejetée(s), ${validationResult.validFeatures.length} acceptée(s)`
            );
        }

        // Ajouter uniquement les features valides
        if (validationResult.validFeatures.length > 0) {
            if (geojsonData.type === "FeatureCollection") {
                dataToAdd = {
                    type: "FeatureCollection",
                    features: validationResult.validFeatures
                };
            } else {
                dataToAdd = validationResult.validFeatures.length === 1
                    ? validationResult.validFeatures[0]
                    : { type: "FeatureCollection", features: validationResult.validFeatures };
            }
        } else {
            Log.warn("[GeoLeaf.GeoJSON] Aucune feature valide à ajouter après validation");
            return;
        }
    }

    // Ajoute les données validées
    state.geoJsonLayer.addData(dataToAdd);

    // Adapter la vue sur les données si demandé
    if (mergedOptions.fitBoundsOnLoad && state.layerGroup) {
        const bounds = state.layerGroup.getBounds();
        if (bounds.isValid()) {
            const fitOptions = {};
            if (typeof mergedOptions.maxZoomOnFit === "number") {
                fitOptions.maxZoom = mergedOptions.maxZoomOnFit;
            }
            state.map.fitBounds(bounds, fitOptions);
        }
    }

    // Événement custom pour l'écosystème GeoLeaf
    try {
        state.map.fire("geoleaf:geojson:loaded", {
            data: geojsonData,
            layer: state.geoJsonLayer
        });
    } catch (e) {
        // On ne bloque jamais si fire échoue
    }
};

export { Loader as LoaderData };
