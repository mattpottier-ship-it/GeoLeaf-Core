/**
 * GeoLeaf GeoJSON Module - Feature Validator
 * Validation stricte des features GeoJSON selon schéma centralisé
 *
 * @module geojson/feature-validator
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    // Dépendances lazy
    const getLog = () => (GeoLeaf.Log || console);

    GeoLeaf._GeoJSONFeatureValidator = GeoLeaf._GeoJSONFeatureValidator || {};

    /**
     * Valide une FeatureCollection entière et retourne les features valides
     *
     * @param {Object} collection - FeatureCollection GeoJSON
     * @returns {Object} { validFeatures: Array, errors: Array }
     */
    GeoLeaf._GeoJSONFeatureValidator.validateFeatureCollection = function (collection) {
        const Log = getLog();
        const errors = [];
        const validFeatures = [];

        if (!collection || typeof collection !== "object") {
            Log.warn("[GeoLeaf.GeoJSON.Validator] Collection non valide : type invalide");
            return { validFeatures: [], errors: [{ message: "Collection non valide" }] };
        }

        // Accepter les FeatureCollections ou les arrays de features
        const features = collection.type === "FeatureCollection"
            ? collection.features
            : Array.isArray(collection)
                ? collection
                : [collection];

        if (!Array.isArray(features)) {
            Log.warn("[GeoLeaf.GeoJSON.Validator] Pas de features à valider");
            return { validFeatures: [], errors: [] };
        }

        features.forEach((feature, index) => {
            const result = GeoLeaf._GeoJSONFeatureValidator.validateFeature(feature, index);
            if (result.valid) {
                validFeatures.push(feature);
            } else {
                errors.push(...result.errors);
            }
        });

        return { validFeatures, errors };
    };

    /**
     * Valide une single feature
     *
     * @param {Object} feature - Feature GeoJSON
     * @param {number} [index] - Index dans la collection (pour logging)
     * @returns {Object} { valid: Boolean, errors: Array }
     */
    GeoLeaf._GeoJSONFeatureValidator.validateFeature = function (feature, index) {
        const Log = getLog();
        const errors = [];
        const featureId = feature?.properties?.id || feature?.id || index || "unknown";

        // Type feature
        if (!feature || feature.type !== "Feature") {
            errors.push({
                featureId,
                field: "type",
                message: "Feature doit avoir type='Feature'",
                severity: "error"
            });
            Log.warn(`[GeoLeaf.GeoJSON.Validator] Feature ${featureId}: type invalide`);
            return { valid: false, errors };
        }

        // Géométrie
        const geomResult = GeoLeaf._GeoJSONFeatureValidator.validateGeometry(
            feature.geometry,
            featureId
        );
        if (!geomResult.valid) {
            errors.push(...geomResult.errors);
        }

        // Propriétés
        const propsResult = GeoLeaf._GeoJSONFeatureValidator.validateProperties(
            feature.properties,
            featureId
        );
        if (!propsResult.valid) {
            errors.push(...propsResult.errors);
        }

        if (errors.length > 0) {
            Log.warn(
                `[GeoLeaf.GeoJSON.Validator] Feature ${featureId} rejetée : ${errors.map(e => e.message).join("; ")}`
            );
            return { valid: false, errors };
        }

        return { valid: true, errors: [] };
    };

    /**
     * Valide la géométrie d'une feature
     *
     * @param {Object} geometry - Geometry GeoJSON
     * @param {string|number} featureId - Feature identifier (for logging)
     * @returns {Object} { valid: Boolean, errors: Array }
     */
    GeoLeaf._GeoJSONFeatureValidator.validateGeometry = function (geometry, featureId) {
        const errors = [];
        const validTypes = ["Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"];

        if (!geometry || typeof geometry !== "object") {
            errors.push({
                featureId,
                field: "geometry",
                message: "geometry requis et doit être un objet",
                severity: "error"
            });
            return { valid: false, errors };
        }

        if (!geometry.type) {
            errors.push({
                featureId,
                field: "geometry.type",
                message: "geometry.type requis",
                severity: "error"
            });
            return { valid: false, errors };
        }

        if (!validTypes.includes(geometry.type)) {
            errors.push({
                featureId,
                field: "geometry.type",
                message: `Type de géométrie invalide '${geometry.type}'. Doit être : ${validTypes.join(", ")}`,
                severity: "error"
            });
            return { valid: false, errors };
        }

        if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
            errors.push({
                featureId,
                field: "geometry.coordinates",
                message: "geometry.coordinates doit être un array non-vide",
                severity: "error"
            });
            return { valid: false, errors };
        }

        return { valid: errors.length === 0, errors };
    };

    /**
     * Valide les propriétés d'une feature
     *
     * @param {Object} properties - Feature properties
     * @param {string|number} featureId - Feature identifier (for logging)
     * @returns {Object} { valid: Boolean, errors: Array }
     */
    GeoLeaf._GeoJSONFeatureValidator.validateProperties = function (properties, featureId) {
        const errors = [];

        if (!properties || typeof properties !== "object") {
            errors.push({
                featureId,
                field: "properties",
                message: "properties requis et doit être un objet",
                severity: "error"
            });
            return { valid: false, errors };
        }

        // Au moins un nom (name, title, ou autre identifier)
        const hasName = properties.name || properties.title || properties.label;
        if (!hasName) {
            errors.push({
                featureId,
                field: "properties.name",
                message: "properties doit contenir au moins name, title ou label",
                severity: "error"
            });
        }

        // Validation des types numériques
        if (typeof properties.distance_km !== "undefined" && typeof properties.distance_km !== "number") {
            errors.push({
                featureId,
                field: "properties.distance_km",
                message: "distance_km doit être un nombre",
                severity: "warning"
            });
        }

        if (typeof properties.distance_km === "number" && properties.distance_km < 0) {
            errors.push({
                featureId,
                field: "properties.distance_km",
                message: "distance_km doit être >= 0",
                severity: "warning"
            });
        }

        if (typeof properties.duration_min !== "undefined" && typeof properties.duration_min !== "number") {
            errors.push({
                featureId,
                field: "properties.duration_min",
                message: "duration_min doit être un nombre",
                severity: "warning"
            });
        }

        if (typeof properties.duration_min === "number" && properties.duration_min < 0) {
            errors.push({
                featureId,
                field: "properties.duration_min",
                message: "duration_min doit être >= 0",
                severity: "warning"
            });
        }

        if (typeof properties.rating !== "undefined") {
            if (typeof properties.rating !== "number") {
                errors.push({
                    featureId,
                    field: "properties.rating",
                    message: "rating doit être un nombre",
                    severity: "warning"
                });
            } else if (properties.rating < 0 || properties.rating > 5) {
                errors.push({
                    featureId,
                    field: "properties.rating",
                    message: "rating doit être entre 0 et 5",
                    severity: "warning"
                });
            }
        }

        // Validation des couleurs hex
        if (typeof properties.color !== "undefined" && typeof properties.color === "string") {
            if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(properties.color)) {
                errors.push({
                    featureId,
                    field: "properties.color",
                    message: `color invalide '${properties.color}'. Format: #RGB ou #RRGGBB`,
                    severity: "warning"
                });
            }
        }

        // Validation des opacity
        if (typeof properties.opacity !== "undefined") {
            if (typeof properties.opacity !== "number") {
                errors.push({
                    featureId,
                    field: "properties.opacity",
                    message: "opacity doit être un nombre",
                    severity: "warning"
                });
            } else if (properties.opacity < 0 || properties.opacity > 1) {
                errors.push({
                    featureId,
                    field: "properties.opacity",
                    message: "opacity doit être entre 0 et 1",
                    severity: "warning"
                });
            }
        }

        // Validation des weight
        if (typeof properties.weight !== "undefined") {
            if (typeof properties.weight !== "number") {
                errors.push({
                    featureId,
                    field: "properties.weight",
                    message: "weight doit être un nombre",
                    severity: "warning"
                });
            } else if (properties.weight < 0) {
                errors.push({
                    featureId,
                    field: "properties.weight",
                    message: "weight doit être >= 0",
                    severity: "warning"
                });
            }
        }

        // Validation des URLs
        const urlFields = ["link", "photo", "url"];
        urlFields.forEach(field => {
            if (typeof properties[field] !== "undefined" && typeof properties[field] === "string") {
                if (!GeoLeaf._GeoJSONFeatureValidator.isValidUrl(properties[field])) {
                    errors.push({
                        featureId,
                        field: `properties.${field}`,
                        message: `${field} n'est pas une URL valide`,
                        severity: "warning"
                    });
                }
            }
        });

        // Validation email
        if (typeof properties.email !== "undefined" && typeof properties.email === "string") {
            if (!GeoLeaf._GeoJSONFeatureValidator.isValidEmail(properties.email)) {
                errors.push({
                    featureId,
                    field: "properties.email",
                    message: "email invalide",
                    severity: "warning"
                });
            }
        }

        // Validation tags (doit être array de strings)
        if (typeof properties.tags !== "undefined") {
            if (!Array.isArray(properties.tags)) {
                errors.push({
                    featureId,
                    field: "properties.tags",
                    message: "tags doit être un array",
                    severity: "warning"
                });
            } else {
                properties.tags.forEach((tag, idx) => {
                    if (typeof tag !== "string") {
                        errors.push({
                            featureId,
                            field: `properties.tags[${idx}]`,
                            message: "tag doit être une string",
                            severity: "warning"
                        });
                    }
                });
            }
        }

        // Vérifier que properties ne contient pas d'objets imbriqués (à plat obligatoirement)
        Object.entries(properties).forEach(([key, value]) => {
            if (value !== null && typeof value === "object" && !Array.isArray(value)) {
                errors.push({
                    featureId,
                    field: `properties.${key}`,
                    message: `Propriété imbriquée détectée. Les propriétés doivent être plates (strings, nombres, arrays). Objet trouvé: ${JSON.stringify(value)}`,
                    severity: "error"
                });
            }
        });

        // Les erreurs "error" invalident la feature, pas les "warning"
        const hasErrors = errors.some(e => e.severity === "error");
        return { valid: !hasErrors, errors };
    };

    /**
     * Valide qu'une string est une URL valide
     *
     * @param {string} url - URL à valider
     * @returns {Boolean}
     */
    GeoLeaf._GeoJSONFeatureValidator.isValidUrl = function (url) {
        if (typeof url !== "string") return false;
        try {
            new URL(url);
            return true;
        } catch {
            // Accepter aussi les URLs relatives
            return /^(https?:\/\/|\/|\.\.?\/)/.test(url);
        }
    };

    /**
     * Valide qu'une string est un email valide
     *
     * @param {string} email - Email à valider
     * @returns {Boolean}
     */
    GeoLeaf._GeoJSONFeatureValidator.isValidEmail = function (email) {
        if (typeof email !== "string") return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

})(typeof window !== "undefined" ? window : global);
