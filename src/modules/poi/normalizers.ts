/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Normalizers
 * Fonctions de normalisation et extraction de data POI
 */
import { Log } from "../log/index.js";
import { Security } from "../security/index.js";
import { resolveField } from "../utils";

// ========================================
//   NORMALISATION POI — HELPERS
// ========================================

/** Sanitize a URL: accept only http/https/data:image. */
function _sanitizeUrl(url: any): string | null {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (trimmed.match(/^(https?:\/\/|data:image\/)/i)) return trimmed;
    return null;
}

/** Escape HTML via Security.escapeHtml or a safe fallback. */
function _escapeHtml(str: any): string {
    if (Security.escapeHtml) return Security.escapeHtml(str);
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/** Resolve category IDs with multi-source fallback. */
function _resolveCategories(attr: any, p: any, props: any) {
    return {
        categoryId: attr.categoryId || p.categoryId || p.category || props.category || null,
        subCategoryId:
            attr.subCategoryId || p.subCategoryId || p.sub_category || props.sub_category || null,
    };
}

/** Resolve contact fields with multi-source fallback. */
function _resolveContact(p: any, attr: any, props: any) {
    return {
        website: _sanitizeUrl(
            attr.link || attr.website || p.link || props.link || p.website || props.website || null
        ),
        address: _escapeHtml(
            String(resolveField(p, "attributes.address", "address", "properties.address") ?? "")
        ),
        phone: _escapeHtml(
            String(resolveField(p, "attributes.phone", "phone", "properties.phone") ?? "")
        ),
        email: _escapeHtml(
            String(resolveField(p, "attributes.email", "email", "properties.email") ?? "")
        ),
    };
}

/** Resolve main image URL with fallback to gallery first item. */
function _resolveMainImage(attr: any, p: any, props: any): string | null {
    const galleryFirst = (attr.gallery && attr.gallery[0]) || (p.gallery && p.gallery[0]);
    return _sanitizeUrl(attr.photo || attr.mainImage || props.photo || galleryFirst || null);
}

/** Collect raw gallery array from multiple sources. */
function _rawGallery(attr: any, p: any, props: any): any[] {
    return attr.gallery || p.gallery || props.gallery || p.images || props.images || [];
}

/** Map a single gallery item to a sanitized URL. */
function _mapGalleryItem(img: any): string | null {
    if (typeof img === "string") return _sanitizeUrl(img);
    if (img && img.url) return _sanitizeUrl(img.url);
    return null;
}

/** Resolve reviews from multiple sources. */
function _resolveReviews(attr: any, p: any, props: any) {
    return (
        attr.reviews ||
        (attr.attributes && attr.attributes.reviews) ||
        p.reviews ||
        props.reviews ||
        (props.attributes && props.attributes.reviews) ||
        null
    );
}

/** Resolve opening hours from multiple sources. */
function _resolveOpeningHours(attr: any, p: any, props: any) {
    return (
        attr.opening_hours ||
        attr.openingHours ||
        p.opening_hours ||
        props.opening_hours ||
        p.openingHours ||
        props.openingHours ||
        null
    );
}

/** Parse a single raw opening hours entry into a structured object. */
function _parseOpeningHoursEntry(raw: any) {
    if (raw == null) return null;
    const text = String(raw).trim();
    if (!text) return null;
    const parts = text.split(":");
    if (parts.length <= 1) return { day: text, open: "", close: "" };
    const day = (parts.shift() ?? "").trim();
    const rest = parts.join(":").trim();
    const hoursParts = rest.split(/[–-]/);
    if (hoursParts.length > 1) {
        return { day, open: hoursParts[0].trim(), close: hoursParts.slice(1).join("–").trim() };
    }
    return { day, open: rest, close: "" };
}

/** Build openingHoursTable from an array of raw entries. */
function _buildOpeningHoursTable(openingHours: any[]): any[] {
    return openingHours.map(_parseOpeningHoursEntry).filter(Boolean);
}

/** Build descriptions sub-object. */
function _resolveDescriptions(p: any) {
    return {
        shortDescription: _escapeHtml(
            String(
                resolveField(
                    p,
                    "description",
                    "attributes.shortDescription",
                    "properties.description"
                ) ?? ""
            )
        ),
        longDescription: _escapeHtml(
            String(
                resolveField(
                    p,
                    "attributes.description_long",
                    "description_long",
                    "properties.description_long",
                    "attributes.longDescription"
                ) ?? ""
            )
        ),
    };
}

// ========================================
//   NORMALISATION POI
// ========================================

function _resolvePoiAttr(poi: any): any {
    if (!poi.attributes) return {};
    if (typeof poi.attributes !== "object") return {};
    return poi.attributes;
}

function _resolvePoiPrice(attr: any, p: any, props: any): any {
    if (attr.price) return attr.price;
    if (p.price) return p.price;
    if (props.price) return props.price;
    return null;
}

function _resolvePoiTags(attr: any, p: any, props: any): string[] {
    const raw = attr.tags || p.tags || props.tags || [];
    return raw.map((t: any) => _escapeHtml(String(t)));
}

function _resolvePoiServices(attr: any, p: any, props: any): string[] {
    const raw = attr.services || p.services || props.services || [];
    return raw.map((s: any) => _escapeHtml(String(s)));
}

function _buildNormalizedAttributes(
    attr: any,
    p: any,
    props: any,
    descriptions: any,
    categories: any,
    contact: any
): any {
    const gallery = _rawGallery(attr, p, props).map(_mapGalleryItem).filter(Boolean);
    const openingHours = _resolveOpeningHours(attr, p, props);
    const openingHoursTable =
        openingHours && Array.isArray(openingHours) ? _buildOpeningHoursTable(openingHours) : null;
    return {
        ...attr,
        ...descriptions,
        ...categories,
        mainImage: _resolveMainImage(attr, p, props),
        gallery,
        price: _resolvePoiPrice(attr, p, props),
        openingHours,
        openingHoursTable,
        reviews: _resolveReviews(attr, p, props),
        tags: _resolvePoiTags(attr, p, props),
        ...contact,
        services: _resolvePoiServices(attr, p, props),
    };
}

function _preservePoiMetadata(normalized: any, poi: any): void {
    if (poi._sidepanelConfig) normalized._sidepanelConfig = poi._sidepanelConfig;
    if (poi._layerConfig) normalized._layerConfig = poi._layerConfig;
}

/**
 * Normalise un POI to the structure standard { id, latlng, title, attributes: {...} }.
 * Transforme l'old format to the nouveau format expected par the profilee.json.
 *
 * @param {object} poi - POI au format brut (old ou nouveau).
 * @returns {object} POI normalized.
 */
function normalizePoi(poi: any) {
    if (!poi) return null;
    const p = poi;
    const attr = _resolvePoiAttr(p);
    const props = p.properties || {};
    const descriptions = _resolveDescriptions(p);
    const categories = _resolveCategories(attr, p, props);
    const contact = _resolveContact(p, attr, props);
    const normalized: any = {
        id: p.id || null,
        latlng: p.latlng || null,
        title: _escapeHtml(
            String(
                resolveField(
                    p,
                    "title",
                    "label",
                    "name",
                    "attributes.title",
                    "properties.label",
                    "properties.name"
                ) || "Sans nom"
            )
        ),
        label: _escapeHtml(String(resolveField(p, "label", "name", "title") ?? "")),
        name: _escapeHtml(String(resolveField(p, "name", "label", "title") ?? "")),
        description: _escapeHtml(
            String(resolveField(p, "description", "attributes.description") ?? "")
        ),
        properties: p.properties || {},
        attributes: _buildNormalizedAttributes(attr, p, props, descriptions, categories, contact),
    };
    _preservePoiMetadata(normalized, poi);
    return normalized;
}

/** Log a debug message when Log is available. */
function _dbg(...args: any[]) {
    if (Log && typeof Log.debug === "function") Log.debug(...args);
}

/**
 * Extrait the value of a field from un POI normalized using dot notation.
 *
 * @param {object} normalizedPoi - POI normalized.
 * @param {string} fieldPath - Path du field (ex: "title", "attributes.gallery", "attributes.reviews.rating").
 * @returns {*} Value du field ou null si introuvable.
 */
function getFieldValue(normalizedPoi: any, fieldPath: string) {
    if (!normalizedPoi || !fieldPath) return null;
    _dbg("[POI.getFieldValue] Recherche fieldPath:", fieldPath, "| POI:", normalizedPoi.id);

    const parts = fieldPath.split(".");
    let value = normalizedPoi;

    for (const part of parts) {
        if (value == null || typeof value !== "object") {
            _dbg("[POI.getFieldValue] Path interrupted at part:", part, "| value actuelle:", value);
            return null;
        }
        value = value[part];
    }

    _dbg("[POI.getFieldValue] Value found for", fieldPath, ":", value);

    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        _dbg("[POI.getFieldValue] Valeur vide ou table vide, retourne null");
        return null;
    }

    return value;
}

/** Resolve lat/lng from poi.latlng (array or object). */
function _resolveFromLatlng(poi: any): { lat: any; lng: any } {
    if (Array.isArray(poi.latlng) && poi.latlng.length >= 2) {
        return { lat: poi.latlng[0], lng: poi.latlng[1] };
    }
    if (poi.latlng && typeof poi.latlng === "object") {
        return { lat: poi.latlng.lat, lng: poi.latlng.lng || poi.latlng.lon };
    }
    return { lat: undefined, lng: undefined };
}

/** Resolve lat/lng from flat coordinate fields. */
function _resolveFromFlatFields(poi: any): { lat: any; lng: any } {
    if (typeof poi.lat === "number" && typeof poi.lng === "number") {
        return { lat: poi.lat, lng: poi.lng };
    }
    if (typeof poi.latitude === "number" && typeof poi.longitude === "number") {
        return { lat: poi.latitude, lng: poi.longitude };
    }
    return { lat: undefined, lng: undefined };
}

/** Resolve lat/lng from GeoJSON geometry.coordinates. */
function _resolveFromGeometry(poi: any): { lat: any; lng: any } {
    if (poi.geometry && Array.isArray(poi.geometry.coordinates)) {
        return { lat: poi.geometry.coordinates[1], lng: poi.geometry.coordinates[0] };
    }
    return { lat: undefined, lng: undefined };
}

/** Extract raw lat/lng from all known POI formats. */
function _extractRawCoords(poi: any): { lat: any; lng: any } {
    if (poi.latlng) return _resolveFromLatlng(poi);
    const flat = _resolveFromFlatFields(poi);
    if (flat.lat !== undefined) return flat;
    return _resolveFromGeometry(poi);
}

/**
 * Extrait les coordinates of a POI et les normalise en [lat, lng].
 *
 * @param {object} poi - POI brut.
 * @returns {Array<number>|null} Coordinates [lat, lng] ou null si invalids.
 */
function extractCoordinates(poi: any) {
    if (!poi) return null;
    const { lat, lng } = _extractRawCoords(poi);
    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
}

/**
 * Generates a ID unique for a POI sans ID.
 *
 * @param {object} poi - POI.
 * @returns {string} ID generated.
 */
function generatePoiId(poi: any) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const label = (poi.title || poi.label || poi.name || "poi")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .substring(0, 20);
    return `poi-${label}-${timestamp}-${random}`;
}

// ========================================
//   EXPORT
// ========================================

const POINormalizers = {
    normalizePoi,
    getFieldValue,
    extractCoordinates,
    generatePoiId,
};

// ── ESM Export ──
export { POINormalizers };
