/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Normalizers
 * Fonctions de normalisation et extraction de données POI
 */
import { Log } from '../log/index.js';
import { Security } from '../security/index.js';
import { resolveField } from '../utils/index.js';

// ========================================
//   NORMALISATION POI
// ========================================

/**
 * Normalise un POI vers la structure standard { id, latlng, title, attributes: {...} }.
 * Transforme l'ancien format vers le nouveau format attendu par le profile.json.
 *
 * @param {object} poi - POI au format brut (ancien ou nouveau).
 * @returns {object} POI normalisé.
 */
function normalizePoi(poi) {
    if (!poi) return null;


    const p = poi;
    // Préférer les champs "attributes" du nouveau schéma
    const attr = (p && typeof p.attributes === 'object' && p.attributes) ? p.attributes : {};
    const props = p.properties || {};

    // Helper to sanitize URLs
    const sanitizeUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        if (trimmed.match(/^(https?:\/\/|data:image\/)/i)) {
            return trimmed;
        }
        return null;
    };

    // Helper to escape HTML - utilise Security.escapeHtml
    const escapeHtml = Security.escapeHtml || ((str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    });

    // Utilise resolveField : importé depuis utils/index.js

    // Construire la structure normalisée
    const normalized = {
        id: p.id || null,
        latlng: p.latlng || null,
        // Le titre provient du champ label (nouvelle structure) ou des anciens champs
        title: escapeHtml(resolveField(p, 'title', 'label', 'name', 'attributes.title', 'properties.label', 'properties.name') || 'Sans nom'),
        // Préserver aussi label et name au niveau racine
        label: escapeHtml(resolveField(p, 'label', 'name', 'title')),
        name: escapeHtml(resolveField(p, 'name', 'label', 'title')),
        description: escapeHtml(resolveField(p, 'description', 'attributes.description')),
        // ✅ IMPORTANT: Préserver les properties originales pour la résolution de champs comme "properties.Name"
        properties: p.properties || {},
        attributes: {
            // D'abord, copier TOUS les attributs originaux pour préserver les champs spécifiques
            ...attr,
            // Puis ajouter/surcharger avec les mappings normalisés
            // Description courte : premier niveau du POI
            shortDescription: escapeHtml(resolveField(p, 'description', 'attributes.shortDescription', 'properties.description')),
            // Description longue : champ attributes.description_long ou anciens champs
            longDescription: escapeHtml(resolveField(p, 'attributes.description_long', 'description_long', 'properties.description_long', 'attributes.longDescription')),
            // Catégories : préférer attributes.categoryId puis fallback anciens champs
            categoryId: attr.categoryId || p.categoryId || p.category || props.category || null,
            subCategoryId: attr.subCategoryId || p.subCategoryId || p.sub_category || props.sub_category || null,
            // Image principale : attributes.photo ou attributes.mainImage, sinon première image de la galerie
            mainImage: sanitizeUrl(attr.photo || attr.mainImage || props.photo || (attr.gallery && attr.gallery[0]) || (p.gallery && p.gallery[0]) || null),
            // Galerie d'images : provenant de attributes.gallery ou anciens champs
            gallery: ((attr.gallery || p.gallery || props.gallery || p.images || props.images) || [])
                .map(img => {
                    if (typeof img === 'string') return sanitizeUrl(img);
                    if (img && img.url) return sanitizeUrl(img.url);
                    return null;
                })
                .filter(Boolean),
            price: attr.price || p.price || props.price || null,
            // Horaires d'ouverture : attributes.opening_hours (snake_case) ou openingHours camelCase
            openingHours: attr.opening_hours || attr.openingHours || p.opening_hours || props.opening_hours || p.openingHours || props.openingHours || null,
            openingHoursTable: null, // Sera construit à partir de openingHours si nécessaire
            reviews: attr.reviews ||
                     (attr.attributes && attr.attributes.reviews) ||
                     p.reviews ||
                     props.reviews ||
                     (props.attributes && props.attributes.reviews) ||
                     null,
            // Tags : préférer attributes.tags
            tags: (attr.tags || p.tags || props.tags || [])
                .map(t => escapeHtml(String(t))),
            // Lien / site web : attributes.link (nouveau) ou anciens champs
            website: sanitizeUrl(attr.link || attr.website || p.link || props.link || p.website || props.website || null),
            address: escapeHtml(resolveField(p, 'attributes.address', 'address', 'properties.address')),
            phone: escapeHtml(resolveField(p, 'attributes.phone', 'phone', 'properties.phone')),
            email: escapeHtml(resolveField(p, 'attributes.email', 'email', 'properties.email')),
            services: (attr.services || p.services || props.services || [])
                .map(s => escapeHtml(String(s)))
        }
    };

    // Construire openingHoursTable si openingHours existe
    if (normalized.attributes.openingHours && Array.isArray(normalized.attributes.openingHours)) {
        normalized.attributes.openingHoursTable = normalized.attributes.openingHours.map(raw => {
            if (raw == null) return null;
            const text = String(raw).trim();
            if (!text) return null;

            const parts = text.split(':');
            if (parts.length > 1) {
                const day = parts.shift().trim();
                const rest = parts.join(':').trim();

                let open = '';
                let close = '';
                const hoursParts = rest.split(/[–-]/);
                if (hoursParts.length > 1) {
                    open = hoursParts[0].trim();
                    close = hoursParts.slice(1).join('–').trim();
                } else {
                    open = rest;
                }

                return { day, open, close };
            }

            return { day: text, open: '', close: '' };
        }).filter(Boolean);
    }

    // ✅ IMPORTANT: Préserver les métadonnées de configuration de couche
    // Ces champs sont ajoutés par GeoJSON._convertFeatureToPOI
    if (poi._sidepanelConfig) {
        normalized._sidepanelConfig = poi._sidepanelConfig;
    }
    if (poi._layerConfig) {
        normalized._layerConfig = poi._layerConfig;
    }

    return normalized;
}

/**
 * Extrait la valeur d'un champ depuis un POI normalisé en utilisant la notation pointée.
 *
 * @param {object} normalizedPoi - POI normalisé.
 * @param {string} fieldPath - Chemin du champ (ex: "title", "attributes.gallery", "attributes.reviews.rating").
 * @returns {*} Valeur du champ ou null si introuvable.
 */
function getFieldValue(normalizedPoi, fieldPath) {
    if (!normalizedPoi || !fieldPath) return null;

    if (Log && typeof Log.debug === 'function') {
        Log.debug("[POI.getFieldValue] Recherche fieldPath:", fieldPath, "| POI:", normalizedPoi.id);
    }

    const parts = fieldPath.split('.');
    let value = normalizedPoi;

    for (const part of parts) {
        if (value == null || typeof value !== 'object') {
            if (Log && typeof Log.debug === 'function') {
                Log.debug("[POI.getFieldValue] Chemin interrompu à la partie:", part, "| value actuelle:", value);
            }
            return null;
        }
        value = value[part];
    }

    if (Log && typeof Log.debug === 'function') {
        Log.debug("[POI.getFieldValue] Valeur trouvée pour", fieldPath, ":", value);
    }

    // Retourner null pour les valeurs vides
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        if (Log && typeof Log.debug === 'function') {
            Log.debug("[POI.getFieldValue] Valeur vide ou tableau vide, retourne null");
        }
        return null;
    }

    return value;
}

/**
 * Extrait les coordonnées d'un POI et les normalise en [lat, lng].
 *
 * @param {object} poi - POI brut.
 * @returns {Array<number>|null} Coordonnées [lat, lng] ou null si invalides.
 */
function extractCoordinates(poi) {
    if (!poi) return null;

    let lat, lng;

    // Format 1: poi.latlng = [lat, lng]
    if (Array.isArray(poi.latlng) && poi.latlng.length >= 2) {
        lat = poi.latlng[0];
        lng = poi.latlng[1];
    }
    // Format 2: poi.latlng = {lat, lng}
    else if (poi.latlng && typeof poi.latlng === 'object') {
        lat = poi.latlng.lat;
        lng = poi.latlng.lng || poi.latlng.lon;
    }
    // Format 3: poi.lat, poi.lng
    else if (typeof poi.lat === 'number' && typeof poi.lng === 'number') {
        lat = poi.lat;
        lng = poi.lng;
    }
    // Format 4: poi.latitude, poi.longitude
    else if (typeof poi.latitude === 'number' && typeof poi.longitude === 'number') {
        lat = poi.latitude;
        lng = poi.longitude;
    }
    // Format 5: poi.geometry.coordinates (GeoJSON)
    else if (poi.geometry && Array.isArray(poi.geometry.coordinates)) {
        // GeoJSON: [lng, lat] (inversé!)
        lng = poi.geometry.coordinates[0];
        lat = poi.geometry.coordinates[1];
    }

    // Validation
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return null;
    }

    // Validation bounds
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
    }

    return [lat, lng];
}

/**
 * Génère un ID unique pour un POI sans ID.
 *
 * @param {object} poi - POI.
 * @returns {string} ID généré.
 */
function generatePoiId(poi) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const label = (poi.title || poi.label || poi.name || 'poi').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    return `poi-${label}-${timestamp}-${random}`;
}

// ========================================
//   EXPORT
// ========================================

const POINormalizers = {
    normalizePoi,
    getFieldValue,
    extractCoordinates,
    generatePoiId
};

// ── ESM Export ──
export { POINormalizers };
