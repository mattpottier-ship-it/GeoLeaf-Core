/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Content Builder - Core Module
 *
 * Centralise les fonctions utilitaires, validateurs et résolution de badges
 * pour tous les renderers du Content Builder.
 *
 * @module ui/content-builder/core
 * @author GeoLeaf Team
 * @version 1.0.0
 * @since Sprint 4.5 (Janvier 2026)
 *
 * @example
 * // Accès au module Core
 * const Core = GeoLeaf._ContentBuilder.Core;
 *
 * // Validation image URL
 * const imageUrl = Core.validateImageUrl('https://example.com/photo.jpg');
 *
 * // Résolution badge taxonomie
 * const badge = Core.resolveBadge(poi, 'attributes.categoryId', 'default');
 *
 * // Formatage coordonnées
 * const coords = Core.formatCoordinates(45.7578, 4.8320);
 * // Retourne: "45.757800, 4.832000"
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    if (!GeoLeaf._ContentBuilder) GeoLeaf._ContentBuilder = {};

    // ========================================
    //   DÉPENDANCES & HELPERS
    // ========================================

    /**
     * Récupère la fonction resolveField depuis GeoLeaf.Utils avec fallback défensif.
     *
     * Cette fonction permet de résoudre des valeurs dans des objets POI en testant
     * plusieurs chemins (paths) dans l'ordre jusqu'à trouver une valeur valide.
     *
     * @function getResolveField
     * @returns {Function} Fonction resolveField(obj, ...paths) → value|null
     *
     * @example
     * const resolveField = getResolveField();
     * const name = resolveField(poi, 'attributes.name', 'attributes.nom', 'properties.name');
     * // Teste dans l'ordre: poi.attributes.name → poi.attributes.nom → poi.properties.name
     * // Retourne la première valeur non-null trouvée
     *
     * @example
     * // Avec fallback si Utils non chargé
     * const resolveField = getResolveField();
     * const value = resolveField({ attributes: { price: 42 } }, 'attributes.price');
     * // Retourne: 42
     */
    function getResolveField() {
        if (GeoLeaf.Utils && typeof GeoLeaf.Utils.resolveField === 'function') {
            return GeoLeaf.Utils.resolveField;
        }
        // Fallback minimal si Utils non chargé
        return function (obj, ...paths) {
            if (!obj) return null;
            for (const path of paths) {
                if (!path) continue;
                const parts = String(path).split('.');
                let current = obj;
                let found = true;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part];
                    } else {
                        found = false;
                        break;
                    }
                }
                if (found && current !== undefined && current !== null) {
                    return current;
                }
            }
            return null;
        };
    }

    /**
     * Récupère la fonction escapeHtml depuis GeoLeaf.Security avec fallback défensif.
     *
     * Essentiel pour prévenir les attaques XSS en échappant tous les caractères HTML
     * spéciaux avant insertion dans le DOM.
     *
     * @function getEscapeHtml
     * @returns {Function} Fonction escapeHtml(str) → string
     *
     * @example
     * const escapeHtml = getEscapeHtml();
     * const safe = escapeHtml('<script>alert("XSS")</script>');
     * // Retourne: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
     *
     * @example
     * // Utilisation dans un renderer
     * const escapeHtml = getEscapeHtml();
     * const html = '<div>' + escapeHtml(userInput) + '</div>';
     * // userInput est sécurisé contre XSS
     */
    function getEscapeHtml() {
        if (GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === 'function') {
            return GeoLeaf.Security.escapeHtml;
        }
        // Fallback minimal si Security non chargé
        return function (str) {
            if (str == null) return '';
            const div = document.createElement('div');
            div.textContent = String(str);
            return div.innerHTML;
        };
    }

    /**
     * Récupère le profil de configuration actif depuis GeoLeaf.Config.
     *
     * Le profil contient la taxonomie (catégories, sous-catégories), les styleRules,
     * et toutes les configurations spécifiques à la couche active.
     *
     * @function getActiveProfile
     * @returns {Object|null} Profil actif avec structure:
     *   - {Object} taxonomy - Catégories et sous-catégories
     *   - {Array} styleRules - Règles de style conditionnelles
     *   - {Object} detailPopup - Configuration popup POI
     *   - {Object} detailTooltip - Configuration tooltip POI
     *   - {Array} detailLayout - Configuration panel POI
     * @returns {null} Si Config non chargé ou pas de profil actif
     *
     * @example
     * const profile = getActiveProfile();
     * if (profile && profile.taxonomy) {
     *   const categories = profile.taxonomy.categories;
     *   // Accès aux catégories de la taxonomie
     * }
     */
    function getActiveProfile() {
        if (GeoLeaf.Config && typeof GeoLeaf.Config.getActiveProfile === 'function') {
            return GeoLeaf.Config.getActiveProfile() || null;
        }
        return null;
    }

    /**
     * Récupère le système de logging GeoLeaf.Log avec fallback sur console.
     *
     * Permet d'utiliser les méthodes debug(), info(), warn(), error() de manière
     * cohérente dans tout le Content Builder.
     *
     * @function getLog
     * @returns {Object} Logger avec méthodes:
     *   - {Function} debug(message, ...args) - Logs de débogage
     *   - {Function} info(message, ...args) - Logs informatifs
     *   - {Function} warn(message, ...args) - Avertissements
     *   - {Function} error(message, ...args) - Erreurs
     *
     * @example
     * const log = getLog();
     * log.info('[ContentBuilder] Rendering popup');
     * log.warn('[ContentBuilder] Image URL invalide:', url);
     * log.error('[ContentBuilder] POI invalide:', poi);
     */
    function getLog() {
        return GeoLeaf.Log || console;
    }

    // ========================================
    //   VALIDATORS
    // ========================================

    /**
     * Valide une URL d'image en vérifiant les protocoles autorisés et la structure.
     *
     * Utilise GeoLeaf.Security.validateUrl si disponible, sinon applique une validation
     * basique avec whitelist de protocoles (https://, http://, data:image//, /, ./).
     *
     * @function validateImageUrl
     * @param {string} url - URL à valider
     * @returns {string|null} URL valide (trimmed) ou null si invalide
     *
     * @example
     * // URL HTTPS valide
     * const url1 = validateImageUrl('https://example.com/photo.jpg');
     * // Retourne: 'https://example.com/photo.jpg'
     *
     * @example
     * // Data URL valide
     * const url2 = validateImageUrl('data:image/png;base64,iVBORw0KG...');
     * // Retourne: 'data:image/png;base64,iVBORw0KG...'
     *
     * @example
     * // Chemin relatif valide
     * const url3 = validateImageUrl('/images/photo.jpg');
     * // Retourne: '/images/photo.jpg'
     *
     * @example
     * // URL invalide (protocole interdit)
     * const url4 = validateImageUrl('javascript:alert(1)');
     * // Retourne: null
     */
    function validateImageUrl(url) {
        if (!url || typeof url !== 'string') return null;

        // Utiliser le validator de GeoLeaf.Security si disponible
        if (GeoLeaf.Security && typeof GeoLeaf.Security.validateUrl === 'function') {
            try {
                return GeoLeaf.Security.validateUrl(url);
            } catch (e) {
                getLog().warn('[ContentBuilder.Core] URL image invalide:', e.message);
                return null;
            }
        }

        // Fallback : validation basique
        const trimmed = url.trim();
        if (/^https?:\/\//i.test(trimmed) ||
            /^data:image\//i.test(trimmed) ||
            trimmed.startsWith('/') ||
            trimmed.startsWith('./') ||
            trimmed.startsWith('../')) {
            return trimmed;
        }

        return null;
    }

    /**
     * Valide des coordonnées géographiques (latitude, longitude) avec support
     * de plusieurs formats d'entrée.
     *
     * Supporte:
     * - Format array: [lat, lng]
     * - Format objet: {lat: number, lng: number}
     * - Validation limites: lat ∈ [-90, 90], lng ∈ [-180, 180]
     *
     * @function validateCoordinates
     * @param {Array<number>|Object|*} value - Coordonnées à valider
     * @returns {{lat: number, lng: number}|null} Coordonnées valides ou null
     *
     * @example
     * // Format array
     * const coords1 = validateCoordinates([45.7578, 4.8320]);
     * // Retourne: { lat: 45.7578, lng: 4.8320 }
     *
     * @example
     * // Format objet
     * const coords2 = validateCoordinates({ lat: 45.7578, lng: 4.8320 });
     * // Retourne: { lat: 45.7578, lng: 4.8320 }
     *
     * @example
     * // Coordonnées invalides (hors limites)
     * const coords3 = validateCoordinates([95, 200]);
     * // Retourne: null (lat > 90, lng > 180)
     *
     * @example
     * // Format invalide
     * const coords4 = validateCoordinates('45.7578, 4.8320');
     * // Retourne: null (string non supporté)
     */
    function validateCoordinates(value) {
        if (value == null) return null;

        let lat, lng;

        // Format array [lat, lng]
        if (Array.isArray(value) && value.length >= 2) {
            lat = parseFloat(value[0]);
            lng = parseFloat(value[1]);
        }
        // Format objet {lat, lng}
        else if (typeof value === 'object' && value.lat !== undefined && value.lng !== undefined) {
            lat = parseFloat(value.lat);
            lng = parseFloat(value.lng);
        }
        // Format invalide
        else {
            return null;
        }

        // Validation des valeurs
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -90 || lat > 90) return null;
        if (lng < -180 || lng > 180) return null;

        return { lat, lng };
    }

    /**
     * Valide une valeur numérique en la convertissant si nécessaire.
     *
     * Accepte number, string convertible en number.
     * Rejette NaN, null, undefined, chaînes vides.
     *
     * @function validateNumber
     * @param {number|string|*} value - Valeur à valider
     * @returns {number|null} Nombre valide ou null si invalide
     *
     * @example
     * // Number direct
     * const num1 = validateNumber(42.5);
     * // Retourne: 42.5
     *
     * @example
     * // String convertible
     * const num2 = validateNumber('42.5');
     * // Retourne: 42.5
     *
     * @example
     * // Valeurs invalides
     * validateNumber(null);      // null
     * validateNumber('');        // null
     * validateNumber('abc');     // null
     * validateNumber(NaN);       // null
     * validateNumber(undefined); // null
     */
    function validateNumber(value) {
        if (value == null || value === '') return null;
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) ? null : num;
    }

    /**
     * Valide un rating (note) dans l'échelle 0-5.
     *
     * Utilise validateNumber puis vérifie que la valeur est dans [0, 5].
     * Utile pour les systèmes de notation 5 étoiles.
     *
     * @function validateRating
     * @param {number|string|*} value - Rating à valider
     * @returns {number|null} Rating valide ∈ [0, 5] ou null si invalide
     *
     * @example
     * // Rating valide
     * const rating1 = validateRating(4.5);
     * // Retourne: 4.5
     *
     * @example
     * // Rating valide (limites)
     * const rating2 = validateRating(0);   // 0 (valide)
     * const rating3 = validateRating(5);   // 5 (valide)
     *
     * @example
     * // Rating invalide (hors limites)
     * const rating4 = validateRating(-1);  // null (< 0)
     * const rating5 = validateRating(6);   // null (> 5)
     * const rating6 = validateRating('excellent'); // null (non numérique)
     */
    function validateRating(value) {
        const num = validateNumber(value);
        if (num === null) return null;
        if (num < 0 || num > 5) return null;
        return num;
    }

    // ========================================
    //   BADGE RESOLVER (Taxonomie + Styles)
    // ========================================

    /**
     * Résout un badge en appliquant la taxonomie et les styleRules de la couche.
     *
     * Processus:
     * 1. Récupère la valeur via resolveField (ex: categoryId)
     * 2. Cherche le label dans taxonomy.categories ou subcategories
     * 3. Applique les couleurs depuis GeoLeaf.Helpers.StyleResolver
     * 4. Retourne { displayValue, style } pour affichage HTML
     *
     * Gère 2 types de champs:
     * - categoryId: résolution catégorie principale
     * - subCategoryId: résolution sous-catégorie (avec parent categoryId)
     *
     * @function resolveBadge
     * @param {Object} poi - POI avec attributs et _layerConfig
     * @param {Object} poi.attributes - Attributs du POI (categoryId, subCategoryId, etc.)
     * @param {Object} poi._layerConfig - Configuration de la couche (styleRules)
     * @param {string} field - Chemin du champ (ex: 'attributes.categoryId')
     * @param {string} [variant] - Variante du badge (non utilisé actuellement)
     * @returns {{displayValue: string, style: string}} Badge résolu
     * @returns {string} returns.displayValue - Label du badge (taxonomie ou valeur brute)
     * @returns {string} returns.style - CSS inline (background-color, border-color)
     *
     * @example
     * // Résolution catégorie principale
     * const badge1 = resolveBadge(
     *   { attributes: { categoryId: 'restaurant' }, _layerConfig: { id: 'pois' } },
     *   'attributes.categoryId'
     * );
     * // Retourne: {
     * //   displayValue: 'Restaurant',
     * //   style: 'background-color: #e74c3c; border-color: #c0392b;'
     * // }
     *
     * @example
     * // Résolution sous-catégorie
     * const badge2 = resolveBadge(
     *   { attributes: { categoryId: 'restaurant', subCategoryId: 'gastronomique' } },
     *   'attributes.subCategoryId'
     * );
     * // Retourne: { displayValue: 'Gastronomique', style: '...' }
     *
     * @example
     * // Valeur non mappée dans taxonomie
     * const badge3 = resolveBadge(
     *   { attributes: { categoryId: 'unknown' } },
     *   'attributes.categoryId'
     * );
     * // Retourne: { displayValue: 'unknown', style: '' }
     */
    function resolveBadge(poi, field, variant) {
        const resolveField = getResolveField();
        const value = resolveField(poi, field);

        if (value == null || value === '') {
            return { displayValue: '', style: '' };
        }

        const profile = getActiveProfile();
        const taxonomy = profile?.taxonomy;
        let displayValue = String(value);
        let style = '';

        // Pas de taxonomie : retour simple
        if (!taxonomy || !field) {
            return { displayValue, style };
        }

        const attrs = poi.attributes || {};

        // Résolution catégorie principale
        if (field.includes('categoryId') && !field.includes('subCategoryId')) {
            const catData = taxonomy.categories?.[value];
            if (catData?.label) {
                displayValue = catData.label;
            }

            // Couleurs depuis styleRules de la couche
            if (GeoLeaf.Helpers?.StyleResolver && poi._layerConfig) {
                const styleColors = GeoLeaf.Helpers.StyleResolver.getColorsFromLayerStyle(
                    poi,
                    poi._layerConfig.id
                );
                if (styleColors) {
                    if (styleColors.fillColor) {
                        style += 'background-color: ' + styleColors.fillColor + ';';
                    }
                    if (styleColors.color) {
                        style += 'border-color: ' + styleColors.color + ';';
                    }
                }
            }
        }
        // Résolution sous-catégorie
        else if (field.includes('subCategoryId')) {
            const catId = attrs.categoryId || attrs.category;
            const catData = taxonomy.categories?.[catId];
            const subCatData = catData?.subcategories?.[value];

            if (subCatData?.label) {
                displayValue = subCatData.label;
            }

            // Couleurs depuis styleRules de la couche
            if (GeoLeaf.Helpers?.StyleResolver && poi._layerConfig) {
                const styleColors = GeoLeaf.Helpers.StyleResolver.getColorsFromLayerStyle(
                    poi,
                    poi._layerConfig.id
                );
                if (styleColors) {
                    if (styleColors.fillColor) {
                        style += 'background-color: ' + styleColors.fillColor + ';';
                    }
                    if (styleColors.color) {
                        style += 'border-color: ' + styleColors.color + ';';
                    }
                }
            }
        }

        return { displayValue, style };
    }

    /**
     * Résout un badge pour tooltip (texte uniquement, sans styles).
     *
     * Version simplifiée de resolveBadge:
     * - Retourne uniquement le texte (displayValue)
     * - Pas de styles CSS
     * - Optimisé pour tooltips HTML limités
     *
     * Supporte également categoryId et subCategoryId avec résolution taxonomie.
     *
     * @function resolveBadgeTooltip
     * @param {Object} poi - POI avec attributs
     * @param {Object} poi.attributes - Attributs du POI
     * @param {string} field - Chemin du champ (ex: 'attributes.categoryId')
     * @returns {string} Label du badge (ou valeur brute si pas de taxonomie)
     *
     * @example
     * // Résolution catégorie avec taxonomie
     * const text1 = resolveBadgeTooltip(
     *   { attributes: { categoryId: 'restaurant' } },
     *   'attributes.categoryId'
     * );
     * // Retourne: 'Restaurant' (label taxonomie)
     *
     * @example
     * // Résolution sous-catégorie
     * const text2 = resolveBadgeTooltip(
     *   { attributes: { categoryId: 'restaurant', subCategoryId: 'gastronomique' } },
     *   'attributes.subCategoryId'
     * );
     * // Retourne: 'Gastronomique'
     *
     * @example
     * // Valeur vide
     * const text3 = resolveBadgeTooltip(
     *   { attributes: {} },
     *   'attributes.unknownField'
     * );
     * // Retourne: ''
     */
    function resolveBadgeTooltip(poi, field) {
        const resolveField = getResolveField();
        const value = resolveField(poi, field);

        if (value == null || value === '') return '';

        const profile = getActiveProfile();
        const taxonomy = profile?.taxonomy;

        if (!taxonomy) return String(value);

        const attrs = poi.attributes || {};

        // Sous-catégorie
        if (field.includes('subCategoryId')) {
            const catId = attrs.categoryId || attrs.category;
            const catData = taxonomy.categories?.[catId];
            const subCatData = catData?.subcategories?.[value];
            if (subCatData?.label) return subCatData.label;
        }
        // Catégorie
        else if (field.includes('categoryId')) {
            const catData = taxonomy.categories?.[value];
            if (catData?.label) return catData.label;
        }

        return String(value);
    }

    // ========================================
    //   UTILITAIRES DE FORMATAGE
    // ========================================

    /**
     * Formate un nombre avec la locale française (séparateurs FR).
     *
     * Utilise toLocaleString('fr-FR'):
     * - Séparateur de milliers: espace (\u202f)
     * - Séparateur de décimales: virgule
     *
     * @function formatNumber
     * @param {number} num - Nombre à formater
     * @returns {string} Nombre formaté avec conventions françaises
     *
     * @example
     * // Entier
     * const str1 = formatNumber(1234567);
     * // Retourne: '1\u202f234\u202f567'
     *
     * @example
     * // Décimal
     * const str2 = formatNumber(1234.56);
     * // Retourne: '1\u202f234,56'
     *
     * @example
     * // Petit nombre
     * const str3 = formatNumber(42);
     * // Retourne: '42'
     */
    function formatNumber(num) {
        return num.toLocaleString('fr-FR');
    }

    /**
     * Formate des coordonnées géographiques en chaîne "lat, lng".
     *
     * Utilise toFixed pour contrôler la précision décimale.
     * Précision recommandée: 6 décimales (~10cm de précision).
     *
     * @function formatCoordinates
     * @param {number} lat - Latitude (∈ [-90, 90])
     * @param {number} lng - Longitude (∈ [-180, 180])
     * @param {number} [precision=6] - Nombre de décimales (1-15)
     * @returns {string} Coordonnées formatées "lat, lng"
     *
     * @example
     * // Précision par défaut (6 décimales)
     * const str1 = formatCoordinates(45.7578137, 4.8320114);
     * // Retourne: '45.757814, 4.832011'
     *
     * @example
     * // Haute précision (8 décimales)
     * const str2 = formatCoordinates(45.7578137, 4.8320114, 8);
     * // Retourne: '45.75781370, 4.83201140'
     *
     * @example
     * // Faible précision (2 décimales)
     * const str3 = formatCoordinates(45.7578137, 4.8320114, 2);
     * // Retourne: '45.76, 4.83'
     */
    function formatCoordinates(lat, lng, precision = 6) {
        return lat.toFixed(precision) + ', ' + lng.toFixed(precision);
    }

    /**
     * Formate un rating (note) au format "X.X/5".
     *
     * Utilise toFixed pour afficher le nombre de décimales souhaité.
     * Compatible avec les systèmes de notation 5 étoiles.
     *
     * @function formatRating
     * @param {number} rating - Note à formater (∈ [0, 5])
     * @param {number} [precision=1] - Nombre de décimales (0-2)
     * @returns {string} Rating formaté (ex: "4.5/5", "3/5")
     *
     * @example
     * // Précision par défaut (1 décimale)
     * const str1 = formatRating(4.567);
     * // Retourne: '4.6/5'
     *
     * @example
     * // Sans décimale
     * const str2 = formatRating(4.567, 0);
     * // Retourne: '5/5'
     *
     * @example
     * // 2 décimales
     * const str3 = formatRating(4.567, 2);
     * // Retourne: '4.57/5'
     *
     * @example
     * // Note parfaite
     * const str4 = formatRating(5);
     * // Retourne: '5.0/5'
     */
    function formatRating(rating, precision = 1) {
        return rating.toFixed(precision) + '/5';
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._ContentBuilder.Core = {
        // Helpers dépendances
        getResolveField,
        getEscapeHtml,
        getActiveProfile,
        getLog,

        // Validators
        validateImageUrl,
        validateCoordinates,
        validateNumber,
        validateRating,

        // Badge resolver
        resolveBadge,
        resolveBadgeTooltip,

        // Formatters
        formatNumber,
        formatCoordinates,
        formatRating
    };

    getLog().info('[GeoLeaf._ContentBuilder.Core] Module Core chargé - Helpers + Validators + Badge resolver');

})(typeof window !== 'undefined' ? window : global);
