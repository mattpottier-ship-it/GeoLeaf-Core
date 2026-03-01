/**
 * GeoLeaf Route Layer Manager Module
 * Gestion des layers Leaflet pour les itinéraires
 */

import { Log } from "../log/index.js";
import type { RouteContext } from "./route-types.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

interface LeafletRouteHelpers {
    polyline: (latlngs: unknown[], options: unknown) => { addTo: (g: unknown) => unknown };
    circleMarker: (
        latlng: [number, number],
        options: unknown
    ) => { addTo: (g: unknown) => unknown };
}
interface GeoLeafGlobal {
    GeoLeaf?: { Config?: { get: (path: string, defaultValue?: unknown) => unknown } };
    L?: LeafletRouteHelpers;
}

const RouteLayerManager = {
    applyRoute(
        context: RouteContext,
        coords: [number, number][],
        clearCallback: (() => void) | undefined,
        fireEventsCallback: ((coords: [number, number][]) => void) | undefined
    ): void {
        if (!Array.isArray(coords)) {
            coords = [];
        }

        if (typeof clearCallback === "function") {
            clearCallback();
        }

        const g = _g as GeoLeafGlobal;
        if (!context.routeLayer && context.layerGroup && context.map) {
            const interactiveShapes = g.GeoLeaf?.Config?.get?.(
                "ui.interactiveShapes",
                false
            ) as boolean;
            const lineStyle = Object.assign({}, context.options?.lineStyle ?? {}, {
                interactive: interactiveShapes,
            });
            if (g.L?.polyline) {
                (context as { routeLayer?: unknown }).routeLayer = g.L.polyline(
                    [],
                    lineStyle
                ).addTo(context.layerGroup);
            }
        }

        const routeLayer = context.routeLayer as
            | { setLatLngs: (latlngs: [number, number][]) => void; getBounds: () => unknown }
            | undefined;
        if (routeLayer) {
            routeLayer.setLatLngs(coords);
        }

        if (context.options?.fitBoundsOnLoad && coords.length > 1 && context.map && routeLayer) {
            const bounds = routeLayer.getBounds();
            const fitOpt: { maxZoom?: number } = {};
            if (context.options.maxZoomOnFit) fitOpt.maxZoom = context.options.maxZoomOnFit;
            const map = context.map as { fitBounds: (b: unknown, o?: unknown) => void };
            if (map.fitBounds) map.fitBounds(bounds, fitOpt);
        }

        if (typeof fireEventsCallback === "function") {
            fireEventsCallback(coords);
        }
    },

    addWaypoint(
        layerGroup: unknown,
        latlng: [number, number],
        waypointStyle: Record<string, unknown>
    ): void {
        if (!layerGroup) return;
        const g = _g as GeoLeafGlobal;
        const interactiveShapes = g.GeoLeaf?.Config?.get?.(
            "ui.interactiveShapes",
            false
        ) as boolean;
        const style = Object.assign({}, waypointStyle, { interactive: interactiveShapes });
        if (g.L?.circleMarker) {
            g.L.circleMarker(latlng, style).addTo(layerGroup as { addLayer: (l: unknown) => void });
        }
    },

    addSegment(routeLayer: unknown, coords: [number, number][]): void {
        if (!routeLayer) return;
        const layer = routeLayer as {
            getLatLngs: () => [number, number][];
            setLatLngs: (c: [number, number][]) => void;
        };
        const current = layer.getLatLngs?.() ?? [];
        layer.setLatLngs?.([...current, ...coords]);
    },

    fireRouteLoadedEvents(map: unknown, routeLayer: unknown, coords: [number, number][]): void {
        try {
            const m = map as { fire?: (event: string, data: unknown) => void };
            if (m?.fire) {
                m.fire("geoleaf:route:loaded", {
                    coords,
                    layer: routeLayer,
                    source: "geoleaf.route",
                });
            }
        } catch (e) {
            Log.warn(
                "[GeoLeaf.Route] Impossible d'émettre l'événement Leaflet geoleaf:route:loaded.",
                e
            );
        }

        if (typeof document !== "undefined" && typeof document.dispatchEvent === "function") {
            const detail = {
                coords: Array.isArray(coords) ? coords.slice() : [],
                map,
                layer: routeLayer,
                source: "geoleaf.route",
            };
            try {
                const event = new CustomEvent("geoleaf:route:loaded", { detail });
                document.dispatchEvent(event);
            } catch {
                try {
                    const legacyEvent = document.createEvent("CustomEvent");
                    (
                        legacyEvent as unknown as {
                            initCustomEvent: (
                                a: string,
                                b: boolean,
                                c: boolean,
                                d: unknown
                            ) => void;
                        }
                    ).initCustomEvent("geoleaf:route:loaded", true, true, detail);
                    document.dispatchEvent(legacyEvent);
                } catch (err) {
                    Log.warn(
                        "[GeoLeaf.Route] Impossible d'émettre le CustomEvent geoleaf:route:loaded.",
                        err
                    );
                }
            }
        }
    },
};

export { RouteLayerManager };
