/**
 * GeoLeaf Route Popup Builder Module
 * Building des popups/tooltips et panel side for thes routes.
 */

import { Log } from "../log/index.js";
import { escapeHtml } from "../security/index.js";
import type { RouteItem } from "./route-types.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

interface GeoLeafGlobal {
    GeoLeaf?: {
        Config?: { getActiveProfile: () => Record<string, unknown> | null };
        _ContentBuilder?: {
            Assemblers?: {
                buildPopupHTML: (poi: unknown, config: unknown, opts: unknown) => string;
            };
        };
        _Normalizer?: { normalizeFromRoute: (route: RouteItem) => unknown };
        POI?: { openSidePanelWithLayout: (poi: unknown, layout: unknown) => void };
    };
}

const _taxonomyCache: {
    profileId: string | null;
    categories: Record<string, unknown>;
    icons: Record<string, unknown>;
} = {
    profileId: null,
    categories: {},
    icons: {},
};

function _getTaxonomyCache(): {
    categories: Record<string, unknown>;
    icons: Record<string, unknown>;
} {
    const Config = (_g as GeoLeafGlobal).GeoLeaf?.Config;
    if (!Config?.getActiveProfile) return { categories: {}, icons: {} };
    const profile = Config.getActiveProfile() ?? {};
    const profileId = (profile.id as string) ?? null;
    if (_taxonomyCache.profileId !== profileId) {
        _taxonomyCache.profileId = profileId;
        _taxonomyCache.categories =
            (profile.taxonomy as { categories?: Record<string, unknown> })?.categories ?? {};
        _taxonomyCache.icons = (profile.icons as Record<string, unknown>) ?? {};
    }
    return { categories: _taxonomyCache.categories, icons: _taxonomyCache.icons };
}

function getContentBuilder(): {
    buildPopupHTML: (poi: unknown, config: unknown, opts: unknown) => string;
} | null {
    return (_g as GeoLeafGlobal).GeoLeaf?._ContentBuilder?.Assemblers ?? null;
}

function getNormalizer(): { normalizeFromRoute: (route: RouteItem) => unknown } | null {
    return (_g as GeoLeafGlobal).GeoLeaf?._Normalizer ?? null;
}

function convertRouteToPOI(route: RouteItem): Record<string, unknown> {
    const Normalizer = getNormalizer();
    if (Normalizer?.normalizeFromRoute) {
        return Normalizer.normalizeFromRoute(route) as Record<string, unknown>;
    }
    const attrs = route.attributes ?? {};
    return {
        id: route.id,
        sourceType: "route",
        geometryType: "LineString",
        title: route.label ?? route.name ?? "Route",
        description: attrs.description ?? route.description ?? "",
        lat: null,
        lng: null,
        categoryId: attrs.categoryId ?? null,
        subCategoryId: attrs.subCategoryId ?? null,
        attributes: {
            ...attrs,
            label: route.label ?? route.name,
            photo: attrs.photo,
            distance_km: attrs.distance_km,
            duration_min: attrs.duration_min,
            difficulty: attrs.difficulty,
            tags: attrs.tags,
        },
        rawData: route,
    };
}

function getRoutePopupConfig(): unknown[] | null {
    const Config = (_g as GeoLeafGlobal).GeoLeaf?.Config;
    if (!Config?.getActiveProfile) return null;
    const profile = Config.getActiveProfile();
    const panels = profile?.panels as
        | { route?: { popup?: { detailPopup?: unknown[] } } }
        | undefined;
    return panels?.route?.popup?.detailPopup ?? null;
}

function getRouteLayoutConfig(): unknown[] | null {
    const Config = (_g as GeoLeafGlobal).GeoLeaf?.Config;
    if (!Config?.getActiveProfile) return null;
    const profile = Config.getActiveProfile();
    const panels = profile?.panels as { route?: { layout?: unknown[] } } | undefined;
    return panels?.route?.layout ?? null;
}

interface CatShape {
    icon?: string;
    colorFill?: string;
    colorStroke?: string;
    subcategories?: Record<string, { icon?: string; colorFill?: string; colorStroke?: string }>;
}

function _pickCatIcon(
    catData: CatShape | null,
    subCatData: { icon?: string; colorFill?: string; colorStroke?: string } | null | undefined,
    iconsConfig: { defaultIcon?: string }
): string {
    if (subCatData && subCatData.icon) return subCatData.icon;
    if (catData && catData.icon) return catData.icon;
    if (iconsConfig.defaultIcon) return iconsConfig.defaultIcon;
    return "activity-generic";
}

function _pickCatFill(
    catData: CatShape | null,
    subCatData: { colorFill?: string; colorStroke?: string } | null | undefined
): string {
    if (subCatData && subCatData.colorFill) return subCatData.colorFill;
    if (catData && catData.colorFill) return catData.colorFill;
    return "#666666";
}

function _pickCatStroke(
    catData: CatShape | null,
    subCatData: { colorFill?: string; colorStroke?: string } | null | undefined
): string {
    if (subCatData && subCatData.colorStroke) return subCatData.colorStroke;
    if (catData && catData.colorStroke) return catData.colorStroke;
    return "#222222";
}

function _resolveIconData(
    categoryId: unknown,
    subCategoryId: unknown,
    categories: Record<string, CatShape>,
    iconsConfig: { defaultIcon?: string; symbolPrefix?: string }
): { iconId: string; colorFill: string; colorStroke: string } {
    const catData = categoryId ? categories[categoryId as string] : null;
    const subCatData =
        catData && subCategoryId ? catData.subcategories?.[subCategoryId as string] : null;
    return {
        iconId: _pickCatIcon(catData, subCatData, iconsConfig),
        colorFill: _pickCatFill(catData, subCatData),
        colorStroke: _pickCatStroke(catData, subCatData),
    };
}

function _buildIconHtml(
    iconId: string,
    colorFill: string,
    colorStroke: string,
    symbolPrefix: string
): string {
    if (!iconId) return "";
    const symbolId = symbolPrefix + String(iconId).trim().toLowerCase().replace(/\s+/g, "-");
    return (
        '<svg class="gl-poi-popup__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="10" fill="' +
        colorFill +
        '" stroke="' +
        colorStroke +
        '" stroke-width="1.5"/>' +
        '<svg x="4" y="4" width="16" height="16"><use href="#' +
        symbolId +
        '" style="color: #ffffff"/></svg>' +
        "</svg>"
    );
}

function _buildRouteMeta(attrs: Record<string, unknown>): string {
    const diffLabels: Record<string, string> = {
        easy: "Facile",
        medium: "Moyen",
        hard: "Difficile",
    };
    const metaItems: string[] = [];
    if (attrs.distance_km) metaItems.push("📏 " + attrs.distance_km + " km");
    if (attrs.duration_min) metaItems.push("⏱️ " + attrs.duration_min + " min");
    if (attrs.difficulty)
        metaItems.push(
            "⚡ " +
                (diffLabels[attrs.difficulty as string]
                    ? diffLabels[attrs.difficulty as string]
                    : String(attrs.difficulty))
        );
    return metaItems.length > 0
        ? '<p class="gl-poi-popup__meta-text">' + metaItems.join(" • ") + "</p>"
        : "";
}

function _buildTagBadges(attrs: Record<string, unknown>): string {
    if (!Array.isArray(attrs.tags)) return "";
    const badges: string[] = [];
    for (const tag of attrs.tags) {
        if (tag && typeof tag === "string")
            badges.push(
                '<span class="gl-poi-badge gl-poi-badge--tag">' + escapeHtml(tag) + "</span>"
            );
    }
    return badges.length ? '<div class="gl-poi-popup__badges">' + badges.join("") + "</div>" : "";
}

function _extractRouteData(route: RouteItem): {
    attrs: Record<string, unknown>;
    label: string;
    description: string;
    photo: string | null;
    routeId: string;
    categoryId: unknown;
    subCategoryId: unknown;
} {
    const attrs = (route.attributes ? route.attributes : {}) as Record<string, unknown>;
    const rawLabel = route.label ? route.label : route.name ? route.name : "Route";
    const rawDesc = attrs.description
        ? attrs.description
        : route.description
          ? route.description
          : "";
    return {
        attrs,
        label: escapeHtml(String(rawLabel)),
        description: escapeHtml(String(rawDesc)),
        photo: (attrs.photo ? attrs.photo : route.photo) as string | null,
        routeId: escapeHtml(String(route.id ? route.id : "")),
        categoryId: attrs.categoryId ? attrs.categoryId : null,
        subCategoryId: attrs.subCategoryId ? attrs.subCategoryId : null,
    };
}

function buildFallbackRoutePopup(route: RouteItem): string {
    const { attrs, label, description, photo, routeId, categoryId, subCategoryId } =
        _extractRouteData(route);
    const taxCache = _getTaxonomyCache();
    const categories = taxCache.categories as Record<string, CatShape>;
    const iconsConfig = taxCache.icons as { defaultIcon?: string; symbolPrefix?: string };
    const { iconId, colorFill, colorStroke } = _resolveIconData(
        categoryId,
        subCategoryId,
        categories,
        iconsConfig
    );
    const symbolPrefix = iconsConfig.symbolPrefix ? iconsConfig.symbolPrefix : "gl-poi-cat-";
    const iconHtml = _buildIconHtml(iconId, colorFill, colorStroke, symbolPrefix);
    const metaText = _buildRouteMeta(attrs);
    const tagBadgesHtml = _buildTagBadges(attrs);
    const photoHtml = photo
        ? '<div class="gl-poi-popup__photo"><img src="' + photo + '" alt="' + label + '" /></div>'
        : "";
    const descHtml = description ? '<p class="gl-poi-popup__desc">' + description + "</p>" : "";
    return (
        '<div class="gl-poi-popup">' +
        photoHtml +
        '<div class="gl-poi-popup__body">' +
        '<div class="gl-poi-popup__title-wrapper">' +
        '<h3 class="gl-poi-popup__title">' +
        iconHtml +
        '<span class="gl-poi-popup__title-text">' +
        label +
        "</span></h3>" +
        "</div>" +
        descHtml +
        metaText +
        tagBadgesHtml +
        '<a class="gl-poi-popup__link" href="#" data-route-id="' +
        routeId +
        '">Voir plus &gt;&gt;&gt;</a>' +
        "</div></div>"
    );
}

function _buildRouteSidePanelPoi(route: RouteItem): Record<string, unknown> {
    const attrs = (route.attributes ? route.attributes : {}) as Record<string, unknown>;
    const title = route.label ? route.label : route.name;
    const diffLabels: Record<string, string> = {
        easy: "Facile",
        medium: "Moyen",
        hard: "Difficile",
    };
    const metadata: string[] = [];
    if (attrs.distance_km) metadata.push("📏 Distance : " + attrs.distance_km + " km");
    if (attrs.duration_min) metadata.push("⏱️ Duration: " + attrs.duration_min + " minutes");
    if (attrs.difficulty)
        metadata.push(
            "⚡ Difficulty: " +
                (diffLabels[attrs.difficulty as string]
                    ? diffLabels[attrs.difficulty as string]
                    : String(attrs.difficulty))
        );
    return {
        id: route.id,
        label: title,
        title,
        name: title,
        description: attrs.description ? attrs.description : route.description,
        attributes: {
            ...attrs,
            metadata: metadata.length > 0 ? metadata : null,
            photo: attrs.photo,
            mainImage: attrs.photo,
            description: attrs.description,
            shortDescription: attrs.description,
            description_long: (attrs as Record<string, unknown>).description_long,
            longDescription: (attrs as Record<string, unknown>).description_long,
            categoryId: attrs.categoryId,
            subCategoryId: attrs.subCategoryId,
            difficulty: attrs.difficulty,
            distance_km: attrs.distance_km,
            duration_min: attrs.duration_min,
            tags: attrs.tags,
            link: attrs.link,
        },
    };
}

const RoutePopupBuilder = {
    addRouteTooltip(
        polyline: { bindTooltip: (content: string, opts: unknown) => void },
        route: RouteItem
    ): void {
        const label = route.label ?? route.name ?? "Route";
        polyline.bindTooltip(escapeHtml(label), { sticky: true, className: "gl-route-tooltip" });
    },

    addRoutePopup(
        polyline: {
            bindPopup: (content: string, opts: unknown) => void;
            on: (event: string, fn: () => void) => void;
        },
        route: RouteItem,
        _routeModule?: unknown
    ): void {
        const popupContent = RoutePopupBuilder.buildRoutePopupContent(route);
        polyline.bindPopup(popupContent, { maxWidth: 300 });
        polyline.on("popupopen", () => {
            Log.info?.("[Route Popup] Popup opened for route:", route.id);
            setTimeout(() => {
                const selector = '.gl-poi-popup__link[data-route-id="' + route.id + '"]';
                const linkEl = document.querySelector(selector);
                if (linkEl && !(linkEl as { _geoleafClickBound?: boolean })._geoleafClickBound) {
                    (linkEl as { _geoleafClickBound?: boolean })._geoleafClickBound = true;
                    linkEl.addEventListener("click", (e) => {
                        e.preventDefault();
                        RoutePopupBuilder.openRouteSidePanel(route);
                    });
                }
            }, 50);
        });
    },

    buildRoutePopupContent(route: RouteItem): string {
        const ContentBuilder = getContentBuilder();
        const config = getRoutePopupConfig();
        const routeAsPoi = convertRouteToPOI(route);
        if (ContentBuilder?.buildPopupHTML && config) {
            return ContentBuilder.buildPopupHTML(routeAsPoi, config, {
                resolveCategoryDisplay: null,
            });
        }
        return buildFallbackRoutePopup(route);
    },

    openRouteSidePanel(route: RouteItem): void {
        const g = _g as GeoLeafGlobal;
        if (!(g.GeoLeaf && g.GeoLeaf.POI && g.GeoLeaf.POI.openSidePanelWithLayout)) {
            Log.warn?.(
                "[Route Popup] Cannot open side panel: POI.openSidePanelWithLayout not available"
            );
            return;
        }
        g.GeoLeaf.POI.openSidePanelWithLayout(
            _buildRouteSidePanelPoi(route),
            getRouteLayoutConfig()
        );
    },
};

export { RoutePopupBuilder };
