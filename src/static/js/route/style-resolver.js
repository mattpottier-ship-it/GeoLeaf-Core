/**
 * GeoLeaf Route Style Resolver Module
 * Résolution des styles d'itinéraires (couleurs, endpoints)
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf._RouteStyleResolver = GeoLeaf._RouteStyleResolver || {};

    const Log = GeoLeaf.Log || console;

    /**
     * Détermine la couleur d'un itinéraire selon la priorité :
     *  1. colorRoute de la sous-catégorie (si définie)
     *  2. colorRoute de la catégorie (si définie)
     *  3. couleur par défaut de routeConfig.default.color
     *
     * @param {Object} route - L'itinéraire
     * @param {Object} profile - Le profil actif
     * @param {Object} routeConfigDefault - La config par défaut (defaultSettings.routeConfig.default)
     * @returns {string|null} La couleur à utiliser ou null
     */
    GeoLeaf._RouteStyleResolver.getRouteColor = function (route, profile, routeConfigDefault) {
        if (!route || !route.attributes) {
            return routeConfigDefault?.color || null;
        }

        const attrs = route.attributes;
        const categoryId = attrs.categoryId;
        const subCategoryId = attrs.subCategoryId;

        // Récupérer la taxonomie du profil
        const taxonomy = profile?.taxonomy?.categories || {};

        // 1. Vérifier colorRoute de la sous-catégorie
        if (categoryId && subCategoryId) {
            const category = taxonomy[categoryId];
            if (category && category.subcategories) {
                const subCategory = category.subcategories[subCategoryId];
                if (subCategory && subCategory.colorRoute) {
                    return subCategory.colorRoute;
                }
            }
        }

        // 2. Vérifier colorRoute de la catégorie
        if (categoryId) {
            const category = taxonomy[categoryId];
            if (category && category.colorRoute) {
                return category.colorRoute;
            }
        }

        // 3. Couleur par défaut
        return routeConfigDefault?.color || null;
    };

    /**
     * Calcule le style final d'un itinéraire en combinant :
     *  - le style par défaut du module,
     *  - la config par défaut du profil (defaultSettings.routeConfig.default),
     *  - la couleur basée sur la taxonomie (colorRoute),
     *  - les surcharges au niveau de l'itinéraire (properties.*).
     *
     * @param {Object} route - L'itinéraire
     * @param {Object} activeProfile - Le profil actif
     * @param {Object} routeConfigDefault - Config par défaut du profil
     * @param {Object} defaultStyle - Style par défaut du module
     * @returns {Object} Style final résolu
     */
    GeoLeaf._RouteStyleResolver.resolveRouteStyle = function (route, activeProfile, routeConfigDefault, defaultStyle) {
        const finalStyle = Object.assign({}, defaultStyle || {});

        // 1) Appliquer le style par défaut du profil (routeConfig.default)
        if (routeConfigDefault && typeof routeConfigDefault === "object") {
            Object.assign(finalStyle, routeConfigDefault);
        }

        // 2) Couleur basée sur la taxonomie (subcategory > category > default)
        const taxonomyColor = GeoLeaf._RouteStyleResolver.getRouteColor(route, activeProfile, routeConfigDefault);
        if (taxonomyColor) {
            finalStyle.color = taxonomyColor;
        }

        // 3) Surcharges au niveau de la route (properties.*)
        if (route.properties && typeof route.properties === "object") {
            const p = route.properties;

            if (typeof p.color === "string" && p.color.trim() !== "") {
                finalStyle.color = p.color.trim();
            }
            if (typeof p.weight === "number") {
                finalStyle.weight = p.weight;
            }
            if (typeof p.opacity === "number") {
                finalStyle.opacity = p.opacity;
            }
            if (typeof p.dashArray === "string" && p.dashArray.trim() !== "") {
                finalStyle.dashArray = p.dashArray.trim();
            }
        }

        return finalStyle;
    };

    /**
     * Calcule la configuration d'affichage des points départ / arrivée
     * en combinant :
     *  - les options par défaut du module (_options),
     *  - les endpoints définis dans le profil actif (defaultSettings.routeConfig.endpoints),
     *  - les surcharges éventuelles au niveau de l'itinéraire
     *    (properties.showStart, properties.showEnd, startStyle, endStyle).
     *
     * @param {Object} route - L'itinéraire
     * @param {Object} profileEndpoints - Config endpoints du profil
     * @param {Object} moduleOptions - Options du module Route
     * @returns {Object} Configuration des endpoints {showStart, showEnd, startStyle, endStyle}
     */
    GeoLeaf._RouteStyleResolver.resolveEndpointConfig = function (route, profileEndpoints, moduleOptions) {
        const opt = moduleOptions || {};

        const baseStartStyle =
            opt.startWaypointStyle || opt.waypointStyle || {
                radius: 6,
                color: "#ffffff",
                fillColor: "#2b7cff",
                fillOpacity: 1,
                weight: 2
            };

        const baseEndStyle =
            opt.endWaypointStyle || opt.waypointStyle || {
                radius: 6,
                color: "#ffffff",
                fillColor: "#ff7b32",
                fillOpacity: 1,
                weight: 2
            };

        const cfg = {
            showStart: typeof opt.showStart === "boolean" ? opt.showStart : true,
            showEnd: typeof opt.showEnd === "boolean" ? opt.showEnd : true,
            startStyle: Object.assign({}, baseStartStyle),
            endStyle: Object.assign({}, baseEndStyle)
        };

        // 1) Profil actif (defaultSettings.routeConfig.endpoints)
        if (profileEndpoints && typeof profileEndpoints === "object") {
            if (typeof profileEndpoints.showStart === "boolean") {
                cfg.showStart = profileEndpoints.showStart;
            }
            if (typeof profileEndpoints.showEnd === "boolean") {
                cfg.showEnd = profileEndpoints.showEnd;
            }
            if (
                profileEndpoints.start &&
                typeof profileEndpoints.start === "object"
            ) {
                Object.assign(cfg.startStyle, profileEndpoints.start);
            }
            if (profileEndpoints.end && typeof profileEndpoints.end === "object") {
                Object.assign(cfg.endStyle, profileEndpoints.end);
            }
        }

        // 2) Surcharges au niveau de l'itinéraire
        if (route && route.properties && typeof route.properties === "object") {
            const p = route.properties;

            if (typeof p.showStart === "boolean") {
                cfg.showStart = p.showStart;
            }
            if (typeof p.showEnd === "boolean") {
                cfg.showEnd = p.showEnd;
            }
            if (p.startStyle && typeof p.startStyle === "object") {
                Object.assign(cfg.startStyle, p.startStyle);
            }
            if (p.endStyle && typeof p.endStyle === "object") {
                Object.assign(cfg.endStyle, p.endStyle);
            }
        }

        return cfg;
    };

    Log.info("[GeoLeaf._RouteStyleResolver] Module Style Resolver chargé");

})(window);
