/**
 * GeoLeaf GeoJSON Loader - Data
 * Chargement direct de données GeoJSON (URL ou objet JS)
 *
 * @module geojson/loader/data
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getState = () => GeoLeaf._GeoJSONShared.state;
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._GeoJSONLoader = GeoLeaf._GeoJSONLoader || {};

    /**
     * Charge un fichier GeoJSON via une URL.
     *
     * @param {string} url - URL du fichier GeoJSON.
     * @param {Object} [options] - Options additionnelles, fusionnées avec celles du module.
     * @returns {Promise<L.GeoJSON|null>}
     */
    GeoLeaf._GeoJSONLoader.loadUrl = async function (url, options = {}) {
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

        const mergedOptions = GeoLeaf.Utils && GeoLeaf.Utils.mergeOptions
            ? GeoLeaf.Utils.mergeOptions(state.options, options)
            : Object.assign({}, state.options, options);

        try {
            // Sprint 3.3: Use unified FetchHelper for GeoJSON loading
            const FetchHelper = GeoLeaf.Utils?.FetchHelper;

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

            GeoLeaf._GeoJSONLoader.addData(data, mergedOptions);
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
    GeoLeaf._GeoJSONLoader.addData = function (geojsonData, options = {}) {
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

        const mergedOptions = GeoLeaf.Utils && GeoLeaf.Utils.mergeOptions
            ? GeoLeaf.Utils.mergeOptions(state.options, options)
            : Object.assign({}, state.options, options);

        // Met à jour les options de la couche si besoin
        if (GeoLeaf._GeoJSONStyleResolver && GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions) {
            state.geoJsonLayer.options = GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
        }

        // Validation stricte des features GeoJSON
        let dataToAdd = geojsonData;
        if (GeoLeaf._GeoJSONFeatureValidator && typeof GeoLeaf._GeoJSONFeatureValidator.validateFeatureCollection === "function") {
            const validationResult = GeoLeaf._GeoJSONFeatureValidator.validateFeatureCollection(geojsonData);

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

})(window);
