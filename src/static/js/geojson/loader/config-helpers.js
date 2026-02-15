/**
 * GeoLeaf GeoJSON Loader - Config Helpers
 * Accesseurs de configuration normalisée + délégués dépréciés
 *
 * @module geojson/loader/config-helpers
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._GeoJSONLoader = GeoLeaf._GeoJSONLoader || {};

    /**
     * Récupère la configuration des champs popup d'une couche.
     *
     * @param {Object} def - Définition de la couche (normalisée ou originale)
     * @returns {Array|null} - Array de configurations de champs ou null
     */
    GeoLeaf._GeoJSONLoader.getPopupConfig = function(def) {
        if (!def) return null;

        // Structure normalisée (après passage dans loadProfile)
        if (def.popupFields && Array.isArray(def.popupFields)) {
            return def.popupFields;
        }

        // Structure originale (depuis config JSON)
        if (def.popup && def.popup.fields && Array.isArray(def.popup.fields)) {
            return def.popup.fields;
        }

        return null;
    };

    /**
     * Récupère la configuration des champs tooltip d'une couche.
     *
     * @param {Object} def - Définition de la couche (normalisée ou originale)
     * @returns {Array|null} - Array de configurations de champs ou null
     */
    GeoLeaf._GeoJSONLoader.getTooltipConfig = function(def) {
        if (!def) return null;

        // Structure normalisée (après passage dans loadProfile)
        if (def.tooltipFields && Array.isArray(def.tooltipFields)) {
            return def.tooltipFields;
        }

        // Structure originale (depuis config JSON)
        if (def.tooltip && def.tooltip.fields && Array.isArray(def.tooltip.fields)) {
            return def.tooltip.fields;
        }

        return null;
    };

    /**
     * Récupère la configuration des champs sidepanel d'une couche.
     *
     * @param {Object} def - Définition de la couche (normalisée ou originale)
     * @returns {Array|null} - Array de configurations de champs ou null
     */
    GeoLeaf._GeoJSONLoader.getSidepanelConfig = function(def) {
        if (!def) return null;

        // Structure normalisée (après passage dans loadProfile)
        if (def.sidepanelFields && Array.isArray(def.sidepanelFields)) {
            return def.sidepanelFields;
        }

        // Structure originale (depuis config JSON)
        if (def.sidepanel && def.sidepanel.detailLayout && Array.isArray(def.sidepanel.detailLayout)) {
            return def.sidepanel.detailLayout;
        }

        return null;
    };

    // ─── Délégués dépréciés ────────────────────────────────────────────

    /**
     * @deprecated Utiliser GeoLeaf._GeoJSONLayerConfig.resolveDataFilePath()
     */
    GeoLeaf._GeoJSONLoader._resolveDataFilePath = function (dataFile, profile, layerDirectory) {
        return GeoLeaf._GeoJSONLayerConfig.resolveDataFilePath(dataFile, profile, layerDirectory);
    };

    /**
     * @deprecated Utiliser GeoLeaf._GeoJSONLayerConfig.inferGeometryType()
     */
    GeoLeaf._GeoJSONLoader._inferGeometryType = function (def, geojsonData) {
        return GeoLeaf._GeoJSONLayerConfig.inferGeometryType(def, geojsonData);
    };

    /**
     * @deprecated Utiliser GeoLeaf._GeoJSONLayerConfig.buildLayerOptions()
     */
    GeoLeaf._GeoJSONLoader._buildLayerOptions = function (def, baseOptions) {
        return GeoLeaf._GeoJSONLayerConfig.buildLayerOptions(def, baseOptions);
    };

    /**
     * @deprecated Utiliser GeoLeaf._GeoJSONLayerConfig.loadLayerLegend()
     */
    GeoLeaf._GeoJSONLoader._loadLayerLegend = function (profile, layerDef) {
        return GeoLeaf._GeoJSONLayerConfig.loadLayerLegend(profile, layerDef);
    };

    /**
     * @deprecated Utiliser GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle()
     */
    GeoLeaf._GeoJSONLoader._loadDefaultStyle = function (layerId, layerDef) {
        return GeoLeaf._GeoJSONLayerConfig.loadDefaultStyle(layerId, layerDef);
    };

})(window);
