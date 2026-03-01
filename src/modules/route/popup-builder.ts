/**
 * GeoLeaf Route Popup Builder Module
 * Construction des popups/tooltips et panneau latéral pour les itinéraires.
 */

import { Log } from '../log/index.js';
import { escapeHtml } from '../security/index.js';
import type { RouteItem } from './route-types.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

interface GeoLeafGlobal {
    GeoLeaf?: {
        Config?: { getActiveProfile: () => Record<string, unknown> | null };
        _ContentBuilder?: { Assemblers?: { buildPopupHTML: (poi: unknown, config: unknown, opts: unknown) => string } };
        _Normalizer?: { normalizeFromRoute: (route: RouteItem) => unknown };
        POI?: { openSidePanelWithLayout: (poi: unknown, layout: unknown) => void };
    };
}

const _taxonomyCache: { profileId: string | null; categories: Record<string, unknown>; icons: Record<string, unknown> } = {
    profileId: null,
    categories: {},
    icons: {},
};

function _getTaxonomyCache(): { categories: Record<string, unknown>; icons: Record<string, unknown> } {
    const Config = (_g as GeoLeafGlobal).GeoLeaf?.Config;
    if (!Config?.getActiveProfile) return { categories: {}, icons: {} };
    const profile = Config.getActiveProfile() ?? {};
    const profileId = (profile.id as string) ?? null;
    if (_taxonomyCache.profileId !== profileId) {
        _taxonomyCache.profileId = profileId;
        _taxonomyCache.categories = (profile.taxonomy as { categories?: Record<string, unknown> })?.categories ?? {};
        _taxonomyCache.icons = (profile.icons as Record<string, unknown>) ?? {};
    }
    return { categories: _taxonomyCache.categories, icons: _taxonomyCache.icons };
}

function getContentBuilder(): { buildPopupHTML: (poi: unknown, config: unknown, opts: unknown) => string } | null {
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
        sourceType: 'route',
        geometryType: 'LineString',
        title: route.label ?? route.name ?? 'Itinéraire',
        description: attrs.description ?? route.description ?? '',
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
    const panels = profile?.panels as { route?: { popup?: { detailPopup?: unknown[] } } } | undefined;
    return panels?.route?.popup?.detailPopup ?? null;
}

function getRouteLayoutConfig(): unknown[] | null {
    const Config = (_g as GeoLeafGlobal).GeoLeaf?.Config;
    if (!Config?.getActiveProfile) return null;
    const profile = Config.getActiveProfile();
    const panels = profile?.panels as { route?: { layout?: unknown[] } } | undefined;
    return panels?.route?.layout ?? null;
}

function buildFallbackRoutePopup(route: RouteItem): string {
    const attrs = route.attributes ?? {};
    const label = escapeHtml(String(route.label ?? route.name ?? 'Itinéraire'));
    const description = escapeHtml(String(attrs.description ?? route.description ?? ''));
    const photo = (attrs.photo ?? route.photo) as string | null;
    const routeId = escapeHtml(String(route.id ?? ''));

    const categoryId = attrs.categoryId ?? null;
    const subCategoryId = attrs.subCategoryId ?? null;
    const taxCache = _getTaxonomyCache();
    interface CatShape {
        icon?: string;
        colorFill?: string;
        colorStroke?: string;
        subcategories?: Record<string, { icon?: string; colorFill?: string; colorStroke?: string }>;
    }
    const categories = taxCache.categories as Record<string, CatShape>;
    const iconsConfig = taxCache.icons as { defaultIcon?: string; symbolPrefix?: string };
    const catData = categoryId ? categories[categoryId] : null;
    const subCatData = catData && subCategoryId ? catData.subcategories?.[subCategoryId] : null;

    const iconId = subCatData?.icon ?? catData?.icon ?? iconsConfig.defaultIcon ?? 'activity-generic';
    const colorFill = subCatData?.colorFill ?? catData?.colorFill ?? '#666666';
    const colorStroke = subCatData?.colorStroke ?? catData?.colorStroke ?? '#222222';

    let iconHtml = '';
    if (iconId) {
        const iconPrefix = iconsConfig.symbolPrefix ?? 'gl-poi-cat-';
        const symbolId = iconPrefix + String(iconId).trim().toLowerCase().replace(/\s+/g, '-');
        iconHtml =
            '<svg class="gl-poi-popup__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="10" fill="' + colorFill + '" stroke="' + colorStroke + '" stroke-width="1.5"/>' +
            '<svg x="4" y="4" width="16" height="16"><use href="#' + symbolId + '" style="color: #ffffff"/></svg>' +
            '</svg>';
    }

    const metaItems: string[] = [];
    if (attrs.distance_km) metaItems.push('📏 ' + attrs.distance_km + ' km');
    if (attrs.duration_min) metaItems.push('⏱️ ' + attrs.duration_min + ' min');
    if (attrs.difficulty) {
        const diffLabels: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
        metaItems.push('⚡ ' + (diffLabels[attrs.difficulty as string] ?? String(attrs.difficulty)));
    }
    const metaText = metaItems.length > 0 ? '<p class="gl-poi-popup__meta-text">' + metaItems.join(' • ') + '</p>' : '';

    const tagBadges: string[] = [];
    if (Array.isArray(attrs.tags)) {
        for (const tag of attrs.tags) {
            if (tag && typeof tag === 'string') tagBadges.push('<span class="gl-poi-badge gl-poi-badge--tag">' + escapeHtml(tag) + '</span>');
        }
    }

    return (
        '<div class="gl-poi-popup">' +
        (photo ? '<div class="gl-poi-popup__photo"><img src="' + photo + '" alt="' + label + '" /></div>' : '') +
        '<div class="gl-poi-popup__body">' +
        '<div class="gl-poi-popup__title-wrapper">' +
        '<h3 class="gl-poi-popup__title">' + iconHtml + '<span class="gl-poi-popup__title-text">' + label + '</span></h3>' +
        '</div>' +
        (description ? '<p class="gl-poi-popup__desc">' + description + '</p>' : '') +
        metaText +
        (tagBadges.length ? '<div class="gl-poi-popup__badges">' + tagBadges.join('') + '</div>' : '') +
        '<a class="gl-poi-popup__link" href="#" data-route-id="' + routeId + '">Voir plus &gt;&gt;&gt;</a>' +
        '</div></div>'
    );
}

const RoutePopupBuilder = {
    addRouteTooltip(polyline: { bindTooltip: (content: string, opts: unknown) => void }, route: RouteItem): void {
        const label = route.label ?? route.name ?? 'Itinéraire';
        polyline.bindTooltip(escapeHtml(label), { sticky: true, className: 'gl-route-tooltip' });
    },

    addRoutePopup(polyline: { bindPopup: (content: string, opts: unknown) => void; on: (event: string, fn: () => void) => void }, route: RouteItem, _routeModule?: unknown): void {
        const popupContent = RoutePopupBuilder.buildRoutePopupContent(route);
        polyline.bindPopup(popupContent, { maxWidth: 300 });
        polyline.on('popupopen', () => {
            Log.info?.('[Route Popup] Popup opened for route:', route.id);
            setTimeout(() => {
                const selector = '.gl-poi-popup__link[data-route-id="' + route.id + '"]';
                const linkEl = document.querySelector(selector);
                if (linkEl && !(linkEl as { _geoleafClickBound?: boolean })._geoleafClickBound) {
                    (linkEl as { _geoleafClickBound?: boolean })._geoleafClickBound = true;
                    linkEl.addEventListener('click', (e) => {
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
            return ContentBuilder.buildPopupHTML(routeAsPoi, config, { resolveCategoryDisplay: null });
        }
        return buildFallbackRoutePopup(route);
    },

    openRouteSidePanel(route: RouteItem): void {
        const g = _g as GeoLeafGlobal;
        if (!g.GeoLeaf?.POI?.openSidePanelWithLayout) {
            Log.warn?.('[Route Popup] Cannot open side panel: POI.openSidePanelWithLayout not available');
            return;
        }
        const attrs = route.attributes ?? {};
        const layout = getRouteLayoutConfig();
        const metadata: string[] = [];
        if (attrs.distance_km) metadata.push('📏 Distance : ' + attrs.distance_km + ' km');
        if (attrs.duration_min) metadata.push('⏱️ Durée : ' + attrs.duration_min + ' minutes');
        if (attrs.difficulty) {
            const diffLabels: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
            metadata.push('⚡ Difficulté : ' + (diffLabels[attrs.difficulty as string] ?? String(attrs.difficulty)));
        }
        const routeAsPoi = {
            id: route.id,
            label: route.label ?? route.name,
            title: route.label ?? route.name,
            name: route.label ?? route.name,
            description: attrs.description ?? route.description,
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
        g.GeoLeaf.POI.openSidePanelWithLayout(routeAsPoi, layout);
    },
};

export { RoutePopupBuilder };
