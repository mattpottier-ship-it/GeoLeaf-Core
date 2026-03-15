/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf Route Style Resolver Module
 * Resolution des styles d'routes (colors, endpoints)
 */

// import { Log } from '../log/index.js';
import type { RouteItem, RouteWaypointStyle } from "./route-types.js";

interface ProfileWithTaxonomy {
    taxonomy?: {
        categories?: Record<
            string,
            { colorRoute?: string; subcategories?: Record<string, { colorRoute?: string }> }
        >;
    };
}

function _applyRoutePropertyStyle(finalStyle: Record<string, unknown>, p: any): void {
    if (typeof p.color === "string" && p.color.trim() !== "") finalStyle.color = p.color.trim();
    if (typeof p.weight === "number") finalStyle.weight = p.weight;
    if (typeof p.opacity === "number") finalStyle.opacity = p.opacity;
    if (typeof p.dashArray === "string" && p.dashArray.trim() !== "")
        finalStyle.dashArray = p.dashArray.trim();
}

function _applyEndpointOverrides(
    cfg: { showStart: boolean; showEnd: boolean; startStyle: any; endStyle: any },
    src: any
): void {
    if (!src || typeof src !== "object") return;
    if (typeof src.showStart === "boolean") cfg.showStart = src.showStart;
    if (typeof src.showEnd === "boolean") cfg.showEnd = src.showEnd;
    const startObj = src.start ?? src.startStyle;
    const endObj = src.end ?? src.endStyle;
    if (startObj) Object.assign(cfg.startStyle, startObj);
    if (endObj) Object.assign(cfg.endStyle, endObj);
}

const RouteStyleResolver = {
    getRouteColor(
        route: RouteItem | null,
        profile: ProfileWithTaxonomy | null,
        routeConfigDefault: { color?: string } | null
    ): string | null {
        if (!route?.attributes) {
            return routeConfigDefault?.color ?? null;
        }

        const attrs = route.attributes;
        const categoryId = attrs.categoryId;
        const subCategoryId = attrs.subCategoryId;
        const taxonomy = profile?.taxonomy?.categories ?? {};

        if (categoryId && subCategoryId) {
            const category = taxonomy[categoryId];
            const subCategory = category?.subcategories?.[subCategoryId];
            if (subCategory?.colorRoute) return subCategory.colorRoute;
        }
        if (categoryId) {
            const category = taxonomy[categoryId];
            if (category?.colorRoute) return category.colorRoute;
        }
        return routeConfigDefault?.color ?? null;
    },

    resolveRouteStyle(
        route: RouteItem,
        activeProfile: ProfileWithTaxonomy | null,
        routeConfigDefault: RouteItem["properties"] | null,
        defaultStyle: Record<string, unknown> | null
    ): Record<string, unknown> {
        const finalStyle = Object.assign({}, defaultStyle ?? {});

        if (routeConfigDefault && typeof routeConfigDefault === "object") {
            Object.assign(finalStyle, routeConfigDefault);
        }

        const taxonomyColor = this.getRouteColor(
            route,
            activeProfile,
            routeConfigDefault as { color?: string } | null
        );
        if (taxonomyColor) {
            (finalStyle as Record<string, unknown>).color = taxonomyColor;
        }

        if (route.properties && typeof route.properties === "object") {
            _applyRoutePropertyStyle(finalStyle, route.properties);
        }

        return finalStyle;
    },

    resolveEndpointConfig(
        route: RouteItem | null,
        profileEndpoints: {
            showStart?: boolean;
            showEnd?: boolean;
            start?: RouteWaypointStyle;
            end?: RouteWaypointStyle;
        } | null,
        moduleOptions: {
            showStart?: boolean;
            showEnd?: boolean;
            waypointStyle?: RouteWaypointStyle;
            startWaypointStyle?: RouteWaypointStyle;
            endWaypointStyle?: RouteWaypointStyle;
        }
    ): {
        showStart: boolean;
        showEnd: boolean;
        startStyle: RouteWaypointStyle;
        endStyle: RouteWaypointStyle;
    } {
        const opt = moduleOptions ?? {};
        const baseStart: RouteWaypointStyle = opt.startWaypointStyle ??
            opt.waypointStyle ?? {
                radius: 6,
                color: "#ffffff",
                fillColor: "#2b7cff",
                fillOpacity: 1,
                weight: 2,
            };
        const baseEnd: RouteWaypointStyle = opt.endWaypointStyle ??
            opt.waypointStyle ?? {
                radius: 6,
                color: "#ffffff",
                fillColor: "#ff7b32",
                fillOpacity: 1,
                weight: 2,
            };

        const cfg = {
            showStart: typeof opt.showStart === "boolean" ? opt.showStart : true,
            showEnd: typeof opt.showEnd === "boolean" ? opt.showEnd : true,
            startStyle: Object.assign({}, baseStart),
            endStyle: Object.assign({}, baseEnd),
        };

        _applyEndpointOverrides(cfg, profileEndpoints);
        _applyEndpointOverrides(cfg, route?.properties as any);

        return cfg;
    },
};

export { RouteStyleResolver };
