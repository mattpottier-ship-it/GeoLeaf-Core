/**
 * GeoLeaf Route Style Resolver Module
 * Résolution des styles d'itinéraires (couleurs, endpoints)
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
            const p = route.properties;
            if (typeof p.color === "string" && p.color.trim() !== "")
                (finalStyle as Record<string, unknown>).color = p.color.trim();
            if (typeof p.weight === "number")
                (finalStyle as Record<string, unknown>).weight = p.weight;
            if (typeof p.opacity === "number")
                (finalStyle as Record<string, unknown>).opacity = p.opacity;
            if (typeof p.dashArray === "string" && p.dashArray.trim() !== "")
                (finalStyle as Record<string, unknown>).dashArray = p.dashArray.trim();
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

        if (profileEndpoints && typeof profileEndpoints === "object") {
            if (typeof profileEndpoints.showStart === "boolean")
                cfg.showStart = profileEndpoints.showStart;
            if (typeof profileEndpoints.showEnd === "boolean")
                cfg.showEnd = profileEndpoints.showEnd;
            if (profileEndpoints.start && typeof profileEndpoints.start === "object") {
                Object.assign(cfg.startStyle, profileEndpoints.start);
            }
            if (profileEndpoints.end && typeof profileEndpoints.end === "object") {
                Object.assign(cfg.endStyle, profileEndpoints.end);
            }
        }

        if (route?.properties && typeof route.properties === "object") {
            const p = route.properties;
            if (typeof p.showStart === "boolean") cfg.showStart = p.showStart;
            if (typeof p.showEnd === "boolean") cfg.showEnd = p.showEnd;
            if (p.startStyle && typeof p.startStyle === "object")
                Object.assign(cfg.startStyle, p.startStyle);
            if (p.endStyle && typeof p.endStyle === "object")
                Object.assign(cfg.endStyle, p.endStyle);
        }

        return cfg;
    },
};

export { RouteStyleResolver };
