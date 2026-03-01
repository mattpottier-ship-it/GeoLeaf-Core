/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { StorageHelper } from "./storage.js";

/** POI-like object with optional id, title/label, latlng or location */
interface PoiLike {
    id?: string;
    title?: string;
    label?: string;
    latlng?: [number, number];
    location?: { lat: number; lng: number };
    attributes?: Record<string, unknown>;
    reviews?: unknown;
    [key: string]: unknown;
}

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
    _safeAssign(
        target: Record<string, unknown>,
        source: Record<string, unknown>
    ): Record<string, unknown> {
        const dangerousKeys = ["__proto__", "constructor", "prototype"];
        for (const key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            if (dangerousKeys.includes(key)) {
                Log.warn(
                    "[GeoLeaf.Config.Normalization] Tentative de pollution de prototype bloquée",
                    { key }
                );
                continue;
            }
            target[key] = source[key];
        }
        return target;
    },

    isPoiStructNormalized(poi: unknown): poi is PoiLike {
        if (!poi || typeof poi !== "object") return false;
        const p = poi as PoiLike;
        if (typeof p.id !== "string" || p.id.trim() === "") return false;
        const hasTitle = typeof p.title === "string" && p.title.trim() !== "";
        const hasLabel = typeof p.label === "string" && p.label.trim() !== "";
        if (!hasTitle && !hasLabel) return false;
        if (Array.isArray(p.latlng) && p.latlng.length >= 2) {
            const [lat, lng] = p.latlng;
            if (
                typeof lat === "number" &&
                !Number.isNaN(lat) &&
                typeof lng === "number" &&
                !Number.isNaN(lng)
            ) {
                return true;
            }
        }
        if (p.location && typeof p.location === "object") {
            const { lat, lng } = p.location;
            if (
                typeof lat === "number" &&
                !Number.isNaN(lat) &&
                typeof lng === "number" &&
                !Number.isNaN(lng)
            ) {
                return true;
            }
        }
        return false;
    },

    mapRawPoiToNormalized(
        rawPoi: Record<string, unknown>,
        mappingDef: Record<string, string>
    ): {
        id: string;
        title: string;
        location: { lat: number; lng: number };
        attributes: Record<string, unknown>;
    } | null {
        if (!rawPoi || !mappingDef || typeof mappingDef !== "object") return null;
        if (!StorageHelper) {
            Log.error("[GeoLeaf.Config.Normalization] Module Storage non disponible.");
            return null;
        }
        const normalized: Record<string, unknown> = {
            id: "",
            title: "",
            location: { lat: 0, lng: 0 },
            attributes: {},
        };
        Object.keys(mappingDef).forEach((targetPath) => {
            const sourcePath = mappingDef[targetPath];
            if (!sourcePath) return;
            const value = StorageHelper.getValueByPath(rawPoi, sourcePath);
            if (typeof value === "undefined") return;
            StorageHelper.setValueByPath(normalized, targetPath, value);
        });
        if (
            !normalized.attributes ||
            typeof normalized.attributes !== "object" ||
            Array.isArray(normalized.attributes)
        ) {
            normalized.attributes = {};
        }
        return normalized as {
            id: string;
            title: string;
            location: { lat: number; lng: number };
            attributes: Record<string, unknown>;
        };
    },

    normalizePoiWithMapping(
        rawPoiArray: PoiLike[],
        mappingConfig: { mapping?: Record<string, string> } | null
    ): PoiLike[] {
        if (!Array.isArray(rawPoiArray)) return [];
        const hasMapping =
            mappingConfig &&
            typeof mappingConfig === "object" &&
            mappingConfig.mapping &&
            typeof mappingConfig.mapping === "object";
        if (!hasMapping) {
            Log.debug(
                "[GeoLeaf.Config.Normalization] Aucun mapping.json fourni ; " +
                    "les POI sont utilisés tels quels (aucune normalisation structurelle)."
            );
            return rawPoiArray;
        }
        const mappingDef = mappingConfig.mapping!;
        const result: PoiLike[] = [];
        rawPoiArray.forEach((rawPoi, index) => {
            if (this.isPoiStructNormalized(rawPoi)) {
                result.push(rawPoi);
                return;
            }
            const normalized = this.mapRawPoiToNormalized(
                rawPoi as unknown as Record<string, unknown>,
                mappingDef
            );
            if (normalized && this.isPoiStructNormalized(normalized)) {
                result.push(normalized);
            } else {
                Log.warn(
                    "[GeoLeaf.Config.Normalization] POI non normalisé même après application du mapping ; POI ignoré.",
                    { poiIndex: index, poiId: rawPoi && (rawPoi as PoiLike).id }
                );
            }
        });
        return result;
    },

    normalizePoiArray(poiArray: PoiLike[]): PoiLike[] {
        if (!Array.isArray(poiArray)) return poiArray;
        return poiArray.map((poi, index) => {
            if (!poi || typeof poi !== "object") return poi;
            const normalized = poi as Record<string, unknown>;
            const baseAttributes =
                normalized.attributes &&
                typeof normalized.attributes === "object" &&
                !Array.isArray(normalized.attributes)
                    ? (normalized.attributes as Record<string, unknown>)
                    : {};
            const attributes = Object.assign(Object.create(null), baseAttributes) as Record<
                string,
                unknown
            >;
            const reviewsObj = attributes.reviews as { recent?: unknown[] } | undefined;
            const poiReviews = normalized.reviews as { recent?: unknown[] } | undefined;
            if (
                reviewsObj &&
                typeof reviewsObj === "object" &&
                !Array.isArray(reviewsObj) &&
                Array.isArray(reviewsObj.recent)
            ) {
                attributes.reviews = { ...reviewsObj, recent: reviewsObj.recent.slice(0, 5) };
            } else if (
                poiReviews &&
                typeof poiReviews === "object" &&
                !Array.isArray(poiReviews) &&
                Array.isArray(poiReviews.recent)
            ) {
                attributes.reviews = { ...poiReviews, recent: poiReviews.recent.slice(0, 5) };
            } else if (Array.isArray(attributes.reviews)) {
                attributes.reviews = (attributes.reviews as unknown[]).slice(0, 5);
            } else if (Array.isArray(normalized.reviews)) {
                attributes.reviews = (normalized.reviews as unknown[]).slice(0, 5);
            } else if (normalized.reviews !== undefined || attributes.reviews !== undefined) {
                Log.warn(
                    "[GeoLeaf.Config.Normalization] Format de `reviews` inattendu pour le POI :",
                    {
                        poiIndex: index,
                        poiId: normalized.id,
                        reviewsType: typeof normalized.reviews,
                        attributesReviewsType: typeof attributes.reviews,
                    }
                );
                attributes.reviews = [];
            } else {
                attributes.reviews = [];
            }
            normalized.attributes = attributes;
            return normalized as PoiLike;
        });
    },
};

const ConfigNormalizer = NormalizationModule;
export { ConfigNormalizer };
