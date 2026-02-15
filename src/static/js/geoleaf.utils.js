/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Module GeoLeaf.Utils
     * Fonctions utilitaires réutilisables pour sécuriser et manipuler les données
     */
    const Utils = {
        /**
         * Échappe les caractères HTML dangereux pour prévenir les attaques XSS
         * DEPRECATED: Utilisez GeoLeaf.Security.escapeHtml() à la place
         * @param {string} text - Texte à échapper
         * @returns {string} - Texte sécurisé
         */
        escapeHtml(text) {
            // Redirection vers la fonction canonique dans Security
            if (GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === 'function') {
                return GeoLeaf.Security.escapeHtml(text);
            }

            // Fallback si Security n'est pas chargé
            if (text == null || text === '') return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
                '/': '&#x2F;'
            };
            return String(text).replace(/[&<>"'/]/g, function(s) {
                return map[s];
            });
        },

        /**
         * Valide et nettoie une URL
         * @param {string} url - URL à valider
         * @param {Array<string>} allowedProtocols - Protocoles autorisés (défaut: http, https, mailto, tel)
         * @returns {string|null} - URL validée ou null si invalide
         */
        validateUrl(url, allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']) {
            if (!url || typeof url !== 'string') return null;

            try {
                const parsed = new URL(url, window.location.origin);

                if (allowedProtocols.includes(parsed.protocol)) {
                    return parsed.href;
                }

                return null;
            } catch (e) {
                // URL relative ou invalide
                return null;
            }
        },

        /**
         * Merge profond d'objets
         * @param {Object} target - Objet cible
         * @param {Object} source - Objet source
         * @returns {Object} - Objet fusionné
         */
        deepMerge(target, source) {
            if (!source || typeof source !== 'object') return target;
            if (!target || typeof target !== 'object') return source;

            const output = Object.assign({}, target);

            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    output[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    output[key] = source[key];
                }
            });

            return output;
        },

        /**
         * Résout la carte Leaflet depuis les options ou GeoLeaf.Core
         * Utilitaire partagé pour éviter duplication dans POI/GeoJSON/Route
         * @param {L.Map|null} explicitMap - Carte passée explicitement
         * @returns {L.Map|null} - Instance de la carte ou null
         */
        ensureMap(explicitMap) {
            if (explicitMap) return explicitMap;

            // Tentative de récupération via GeoLeaf.Core.getMap()
            if (typeof GeoLeaf !== 'undefined' &&
                GeoLeaf.Core &&
                typeof GeoLeaf.Core.getMap === 'function') {
                return GeoLeaf.Core.getMap();
            }

            return null;
        },

        /**
         * Merge shallow d'options (pour les modules POI/GeoJSON/Route)
         * @param {Object} defaults - Options par défaut
         * @param {Object} override - Options fournies par l'utilisateur
         * @returns {Object} - Options fusionnées
         */
        mergeOptions(defaults, override) {
            if (!override || typeof override !== 'object') return defaults;
            return Object.assign({}, defaults, override);
        },

        /**
         * Émet un événement personnalisé sur la carte Leaflet
         * @param {L.Map} map - Instance de la carte
         * @param {string} eventName - Nom de l'événement (ex: 'geoleaf:poi:loaded')
         * @param {Object} payload - Données à transmettre
         */
        fireMapEvent(map, eventName, payload) {
            if (!map || typeof map.fire !== 'function') return;

            try {
                map.fire(eventName, payload || {});
            } catch (err) {
                if (Log) {
                    Log.warn('[GeoLeaf.Utils] Erreur lors de l\'émission de l\'événement:', eventName, err);
                }
            }
        },

        /**
         * Debounce - Limite la fréquence d'exécution d'une fonction
         * Utile pour optimiser les event listeners (resize, scroll, input)
         * @param {Function} func - Fonction à debouncer
         * @param {number} wait - Délai en ms (défaut: 250ms)
         * @returns {Function} - Fonction debouncée
         *
         * @example
         * const debouncedResize = GeoLeaf.Utils.debounce(() => {
         *     map.invalidateSize();
         * }, 300);
         * window.addEventListener('resize', debouncedResize);
         */
        debounce(func, wait = 250) {
            let timeout;

            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };

                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle - Limite l'exécution d'une fonction à une fois par intervalle
         * Différence avec debounce: garantit une exécution régulière
         * @param {Function} func - Fonction à throttler
         * @param {number} limit - Intervalle minimum en ms (défaut: 100ms)
         * @returns {Function} - Fonction throttlée
         *
         * @example
         * const throttledScroll = GeoLeaf.Utils.throttle(() => {
         *     console.log('Scroll event');
         * }, 100);
         * window.addEventListener('scroll', throttledScroll);
         */
        throttle(func, limit = 100) {
            let inThrottle;

            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Calcule la distance entre deux points géographiques (formule de Haversine)
         * @param {number} lat1 - Latitude du point 1 (degrés)
         * @param {number} lng1 - Longitude du point 1 (degrés)
         * @param {number} lat2 - Latitude du point 2 (degrés)
         * @param {number} lng2 - Longitude du point 2 (degrés)
         * @returns {number} - Distance en kilomètres
         *
         * @example
         * const distance = GeoLeaf.Utils.getDistance(48.8566, 2.3522, 51.5074, -0.1278); // Paris -> London
         * console.log(`Distance: ${distance.toFixed(2)} km`); // Distance: 343.56 km
         */
        getDistance(lat1, lng1, lat2, lng2) {
            const R = 6371; // Rayon de la Terre en kilomètres
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLng = (lng2 - lng1) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        },

        /**
         * Résout la valeur d'un champ depuis plusieurs chemins possibles dans un objet
         * Élimine les longues chaînes conditionnelles de résolution de champs
         * @param {Object} obj - Objet source
         * @param {...string} paths - Chemins à tester dans l'ordre (ex: 'label', 'attributes.label', 'properties.label')
         * @returns {*} - Première valeur trouvée (string, object, array, etc.) ou chaîne vide si rien trouvé
         *
         * @example
         * const title = GeoLeaf.Utils.resolveField(poi,
         *     'label', 'attributes.label', 'properties.label',
         *     'name', 'attributes.name', 'properties.name'
         * );
         */
        resolveField(obj, ...paths) {
            if (!obj || typeof obj !== 'object') return '';

            for (const path of paths) {
                const keys = path.split('.');
                let value = obj;

                for (const key of keys) {
                    if (value && typeof value === 'object' && key in value) {
                        value = value[key];
                    } else {
                        value = null;
                        break;
                    }
                }

                // Return any truthy value (string, object, array, number, etc.)
                if (value != null) {
                    // For strings, ensure they're not empty
                    if (typeof value === 'string') {
                        if (value.trim()) return value;
                    } else {
                        // For non-strings (objects, arrays, numbers, booleans), return as-is
                        return value;
                    }
                }
            }

            return '';
        }
    };

    GeoLeaf.Utils = Utils;

})(typeof window !== "undefined" ? window : global);
