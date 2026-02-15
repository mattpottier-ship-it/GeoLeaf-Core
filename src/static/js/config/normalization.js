(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Logger unifié
     */
    const Log = GeoLeaf.Log;

    /**
     * Module Config.Normalization
     *
     * Responsabilités :
     * - Normalisation structurelle des POI (mapping brut → format GeoLeaf)
     * - Application de mapping.json sur POI non normalisés
     * - Normalisation des avis (reviews) : ancien/nouveau format
     * - Validation de la structure POI : id/title/location
     */
    const NormalizationModule = {
        /**
         * Safe object assignment that prevents prototype pollution.
         * Blocks dangerous keys: __proto__, constructor, prototype
         * @param {Object} target
         * @param {Object} source
         * @returns {Object}
         * @private
         */
        _safeAssign(target, source) {
            const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

            for (const key in source) {
                if (!source.hasOwnProperty(key)) continue;
                if (dangerousKeys.includes(key)) {
                    Log.warn('[GeoLeaf.Config.Normalization] Tentative de pollution de prototype bloquée', { key });
                    continue;
                }
                target[key] = source[key];
            }

            return target;
        },

        /**
         * Vérifie si un POI est déjà normalisé au format GeoLeaf :
         * {
         *   id: string,
         *   title: string,
         *   location: { lat: number, lng: number },
         *   attributes?: object
         * }
         *
         * @param {Object} poi
         * @returns {boolean}
         */
        isPoiStructNormalized(poi) {
            if (!poi || typeof poi !== "object") return false;

            if (typeof poi.id !== "string" || poi.id.trim() === "") {
                return false;
            }

            // Supporter les deux formats de label/titre
            const hasTitle = typeof poi.title === "string" && poi.title.trim() !== "";
            const hasLabel = typeof poi.label === "string" && poi.label.trim() !== "";
            if (!hasTitle && !hasLabel) {
                return false;
            }

            // Nouveau format : latlng = [lat, lng]
            if (Array.isArray(poi.latlng) && poi.latlng.length >= 2) {
                const lat = poi.latlng[0];
                const lng = poi.latlng[1];
                if (typeof lat === "number" && !Number.isNaN(lat) &&
                    typeof lng === "number" && !Number.isNaN(lng)) {
                    return true;
                }
            }

            // Ancien format : location.lat/lng
            if (poi.location && typeof poi.location === "object") {
                const lat = poi.location.lat;
                const lng = poi.location.lng;
                if (typeof lat === "number" && !Number.isNaN(lat) &&
                    typeof lng === "number" && !Number.isNaN(lng)) {
                    return true;
                }
            }

            return false;
        },

        /**
         * Applique un mapping brut → POI normalisé pour un POI donné.
         *
         * @param {Object} rawPoi
         * @param {Object} mappingDef  mappingConfig.mapping
         * @returns {Object|null}
         */
        mapRawPoiToNormalized(rawPoi, mappingDef) {
            if (!rawPoi || !mappingDef || typeof mappingDef !== "object") {
                return null;
            }

            const Storage = GeoLeaf._ConfigStorage;
            if (!Storage) {
                Log.error("[GeoLeaf.Config.Normalization] Module Storage non disponible.");
                return null;
            }

            // Socle minimal conforme au cahier des charges POI
            const normalized = {
                id: "",
                title: "",
                location: { lat: 0, lng: 0 },
                attributes: {}
            };

            Object.keys(mappingDef).forEach((targetPath) => {
                const sourcePath = mappingDef[targetPath];
                if (!sourcePath) return;

                const value = Storage.getValueByPath(rawPoi, sourcePath);
                if (typeof value === "undefined") return;

                Storage.setValueByPath(normalized, targetPath, value);
            });

            if (
                !normalized.attributes ||
                typeof normalized.attributes !== "object" ||
                Array.isArray(normalized.attributes)
            ) {
                normalized.attributes = {};
            }

            return normalized;
        },

        /**
         * Normalise structurellement un tableau de POI en utilisant
         * éventuellement mapping.json du profil actif.
         *
         * Règles :
         *  - SANS mapping.json :
         *      → on renvoie les POI tels quels (comportement 100 % rétrocompatible).
         *  - AVEC mapping.json :
         *      → si le POI est déjà normalisé → on le garde tel quel ;
         *      → sinon, on applique le mapping ;
         *      → si après mapping le POI reste non normalisé → POI ignoré (warning).
         *
         * @param {Array} rawPoiArray
         * @param {Object|null} mappingConfig  mapping.json complet ou null
         * @returns {Array}
         */
        normalizePoiWithMapping(rawPoiArray, mappingConfig) {
            if (!Array.isArray(rawPoiArray)) {
                return [];
            }

            const hasMapping =
                mappingConfig &&
                typeof mappingConfig === "object" &&
                mappingConfig.mapping &&
                typeof mappingConfig.mapping === "object";

            // 🔁 CAS 1 — AUCUN mapping.json fourni :
            // on ne touche à rien, on renvoie les POI du profil tels quels.
            if (!hasMapping) {
                Log.debug(
                    "[GeoLeaf.Config.Normalization] Aucun mapping.json fourni ; " +
                    "les POI sont utilisés tels quels (aucune normalisation structurelle)."
                );
                return rawPoiArray;
            }

            // 🔁 CAS 2 — mapping.json présent : on applique vraiment la normalisation
            const mappingDef = mappingConfig.mapping;
            const result = [];

            rawPoiArray.forEach((rawPoi, index) => {
                // 1) Déjà normalisé → on garde
                if (this.isPoiStructNormalized(rawPoi)) {
                    result.push(rawPoi);
                    return;
                }

                // 2) Non normalisé + mapping → tentative de normalisation
                const normalized = this.mapRawPoiToNormalized(rawPoi, mappingDef);
                if (normalized && this.isPoiStructNormalized(normalized)) {
                    result.push(normalized);
                } else {
                    Log.warn(
                        "[GeoLeaf.Config.Normalization] POI non normalisé même après application du mapping ; POI ignoré.",
                        {
                            poiIndex: index,
                            poiId: rawPoi && rawPoi.id
                        }
                    );
                }
            });

            return result;
        },

        /**
         * Normalise le tableau de POI, notamment pour les avis (reviews).
         *
         * - Alimente systématiquement `attributes.reviews` si des avis sont présents.
         * - Supporte l'ancien format (tableau simple) et le nouveau format objet
         *   `{ rating, count, summary, recent[] }`.
         *
         * @param {Array} poiArray
         * @returns {Array}
         */
        normalizePoiArray(poiArray) {
            if (!Array.isArray(poiArray)) {
                return poiArray;
            }

            return poiArray.map((poi, index) => {
                if (!poi || typeof poi !== "object") {
                    return poi;
                }

                // Copie superficielle du POI avec protection contre la pollution de prototype
                // Protection: on crée un objet vide sans prototype et copie les propriétés
                // en excluant __proto__, constructor, prototype
                const normalized = this._safeAssign({}, poi);

                // Bloc attributes existant ou nouveau
                const baseAttributes =
                    normalized.attributes &&
                    typeof normalized.attributes === "object" &&
                    !Array.isArray(normalized.attributes)
                        ? normalized.attributes
                        : {};

                const attributes = this._safeAssign({}, baseAttributes);

                // Handle reviews - preserve full structure when it exists
                // 1) If attributes.reviews is already an object with recent array (new format), preserve it
                if (
                    attributes.reviews &&
                    typeof attributes.reviews === "object" &&
                    !Array.isArray(attributes.reviews) &&
                    Array.isArray(attributes.reviews.recent)
                ) {
                    // Keep the full reviews object: { rating, count, summary, recent: [...] }
                    // Just limit the recent array to 5
                    attributes.reviews = {
                        ...attributes.reviews,
                        recent: attributes.reviews.recent.slice(0, 5)
                    };
                }
                // 2) If poi.reviews is an object with recent array (new format at root), move to attributes
                else if (
                    normalized.reviews &&
                    typeof normalized.reviews === "object" &&
                    !Array.isArray(normalized.reviews) &&
                    Array.isArray(normalized.reviews.recent)
                ) {
                    attributes.reviews = {
                        ...normalized.reviews,
                        recent: normalized.reviews.recent.slice(0, 5)
                    };
                }
                // 3) Legacy: attributes.reviews is already a flat array
                else if (Array.isArray(attributes.reviews)) {
                    attributes.reviews = attributes.reviews.slice(0, 5);
                }
                // 4) Legacy: poi.reviews is a flat array at root
                else if (Array.isArray(normalized.reviews)) {
                    attributes.reviews = normalized.reviews.slice(0, 5);
                }
                // 5) Unexpected format
                else if (normalized.reviews !== undefined || attributes.reviews !== undefined) {
                    Log.warn("[GeoLeaf.Config.Normalization] Format de `reviews` inattendu pour le POI :", {
                        poiIndex: index,
                        poiId: normalized.id,
                        reviewsType: typeof normalized.reviews,
                        attributesReviewsType: typeof attributes.reviews
                    });
                    attributes.reviews = [];
                }
                // 6) No reviews at all
                else {
                    attributes.reviews = [];
                }

                normalized.attributes = attributes;

                return normalized;
            });
        }
    };

    // Exposer le module
    GeoLeaf._ConfigNormalization = NormalizationModule;
})(window);
