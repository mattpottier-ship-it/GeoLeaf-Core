/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Style Resolver - Helper pour résoudre les couleurs depuis les styleRules des couches
 * Remplace l'ancien système category.style.json
 *
 * @module helpers/style-resolver
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.Helpers = GeoLeaf.Helpers || {};

    /**
     * Récupère les couleurs d'un POI depuis les styleRules de sa couche
     * @param {Object} poi - POI avec properties.categoryId, properties.subCategoryId
     * @param {string} layerId - ID de la couche du POI
     * @returns {Object|null} - { fillColor, color } ou null si non trouvé
     */
    function getColorsFromLayerStyle(poi, layerId) {
        if (!poi || !layerId) return null;

        // Récupérer les données de la couche
        const layerData = GeoLeaf._GeoJSONShared?.state?.layers?.get(layerId);
        if (!layerData) return null;

        // Récupérer le currentStyle (objet chargé en mémoire)
        const styleConfig = layerData.currentStyle;
        if (!styleConfig || !styleConfig.styleRules) return null;

        // Extraire categoryId et subCategoryId
        const categoryId = poi.categoryId || poi.category ||
            (poi.attributes && poi.attributes.categoryId) ||
            (poi.properties && poi.properties.categoryId) ||
            (poi.properties && poi.properties.category);

        const subCategoryId = poi.subCategoryId || poi.subCategory || poi.sub_category ||
            (poi.attributes && poi.attributes.subCategoryId) ||
            (poi.properties && poi.properties.subCategoryId) ||
            (poi.properties && poi.properties.sub_category);

        // Chercher dans les styleRules
        // Priorité 1 : subCategoryId
        if (subCategoryId) {
            const rule = styleConfig.styleRules.find(r =>
                r.when &&
                r.when.field === "properties.subCategoryId" &&
                r.when.value === subCategoryId
            );
            if (rule && rule.style) {
                return {
                    fillColor: rule.style.fillColor,
                    color: rule.style.color,
                    colorFill: rule.style.fillColor,
                    colorStroke: rule.style.color
                };
            }
        }

        // Priorité 2 : categoryId
        if (categoryId) {
            const rule = styleConfig.styleRules.find(r =>
                r.when &&
                r.when.field === "properties.categoryId" &&
                r.when.value === categoryId
            );
            if (rule && rule.style) {
                return {
                    fillColor: rule.style.fillColor,
                    color: rule.style.color,
                    colorFill: rule.style.fillColor,
                    colorStroke: rule.style.color
                };
            }
        }

        // Fallback : defaultStyle
        if (styleConfig.defaultStyle) {
            return {
                fillColor: styleConfig.defaultStyle.fillColor,
                color: styleConfig.defaultStyle.color,
                colorFill: styleConfig.defaultStyle.fillColor,
                colorStroke: styleConfig.defaultStyle.color
            };
        }

        return null;
    }

    /**
     * Récupère les couleurs en fonction du style actif de la couche
     * Cette fonction remplace l'ancien getCategoryStyles()
     * @param {Object} poi - POI avec _layerConfig
     * @returns {Object} - { colorFill, colorStroke, colorRoute }
     */
    function resolvePoiColors(poi) {
        const colors = {
            colorFill: null,
            colorStroke: null,
            colorRoute: null
        };

        if (!poi || !poi._layerConfig) return colors;

        const layerId = poi._layerConfig.id;
        const styleColors = getColorsFromLayerStyle(poi, layerId);

        if (styleColors) {
            colors.colorFill = styleColors.fillColor || styleColors.colorFill;
            colors.colorStroke = styleColors.color || styleColors.colorStroke;
            colors.colorRoute = styleColors.color || styleColors.colorStroke;
        }

        return colors;
    }

    // Exposer dans l'espace de noms
    GeoLeaf.Helpers.StyleResolver = {
        getColorsFromLayerStyle: getColorsFromLayerStyle,
        resolvePoiColors: resolvePoiColors
    };

})(window);
