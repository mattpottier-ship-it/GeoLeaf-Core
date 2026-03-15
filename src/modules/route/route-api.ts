/** GeoLeaf Route API */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { RouteLoaders } from "./loaders.js";
import { RouteStyleResolver } from "./style-resolver.js";
import { RoutePopupBuilder } from "./popup-builder.js";
import { RouteLayerManager } from "./layer-manager.js";
import type { RouteOptions, RouteItem } from "./route-types.js";

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

interface GeoLeafGlobal {
    GeoLeaf?: {
        Config?: {
            get: (path: string, defaultValue?: unknown) => unknown;
            getActiveProfile?: () => Record<string, unknown> | null;
        };
        Core?: { getMap?: () => unknown };
        Utils?: {
            ensureMap?: (m: unknown) => unknown;
            mergeOptions?: (a: unknown, b: unknown) => unknown;
        };
    };
    L?: {
        layerGroup: () => {
            addTo: (map: unknown) => unknown;
            clearLayers: () => void;
            eachLayer: (fn: (layer: unknown) => void) => void;
            getBounds: () => unknown;
        };
        polyline: (
            latlngs: unknown[],
            options: unknown
        ) => {
            addTo: (g: unknown) => unknown;
            setLatLngs: (c: unknown[]) => void;
            getLatLngs: () => unknown[];
            getBounds: () => unknown;
            options?: Record<string, unknown>;
            bindTooltip?: unknown;
            bindPopup?: unknown;
            on?: unknown;
        };
        circleMarker: (
            latlng: [number, number],
            options: unknown
        ) => { addTo: (g: unknown) => unknown };
    };
}

function _getActiveProfile(g: GeoLeafGlobal): Record<string, unknown> | null {
    if (!g.GeoLeaf) return null;
    if (!g.GeoLeaf.Config) return null;
    if (!g.GeoLeaf.Config.getActiveProfile) return null;
    return g.GeoLeaf.Config.getActiveProfile();
}

function _getInteractiveShapes(g: GeoLeafGlobal): boolean {
    if (!g.GeoLeaf) return false;
    if (!g.GeoLeaf.Config) return false;
    if (!g.GeoLeaf.Config.get) return false;
    return g.GeoLeaf.Config.get("ui.interactiveShapes", false) as boolean;
}

function _fitBoundsOnCoords(self: any, _g2: GeoLeafGlobal): void {
    if (!self._options.fitBoundsOnLoad) return;
    try {
        const bounds = (self._layerGroup as { getBounds: () => unknown }).getBounds?.();
        const fitOpt: { maxZoom?: number } = {};
        if (self._options.maxZoomOnFit) fitOpt.maxZoom = self._options.maxZoomOnFit;
        (self._map as { fitBounds: (b: unknown, o?: unknown) => void }).fitBounds?.(bounds, fitOpt);
    } catch (e) {
        Log.warn("[GeoLeaf.Route] Error during fitBounds on routes:", e);
    }
}

function _loadProfileConfig(g: GeoLeafGlobal): {
    routeConfigDefault: Record<string, unknown> | null;
    profileEndpoints: unknown;
} {
    let routeConfigDefault: Record<string, unknown> | null = null;
    let profileEndpoints: unknown = null;
    try {
        if (!g.GeoLeaf) return { routeConfigDefault, profileEndpoints };
        if (!g.GeoLeaf.Config) return { routeConfigDefault, profileEndpoints };
        if (!g.GeoLeaf.Config.getActiveProfile) return { routeConfigDefault, profileEndpoints };
        const activeProfile = g.GeoLeaf.Config.getActiveProfile();
        const defaultSettings = activeProfile?.defaultSettings as
            | { routeConfig?: { default?: Record<string, unknown>; endpoints?: unknown } }
            | undefined;
        if (
            defaultSettings?.routeConfig?.default &&
            typeof defaultSettings.routeConfig.default === "object"
        ) {
            routeConfigDefault = defaultSettings.routeConfig.default;
        }
        if (
            defaultSettings?.routeConfig?.endpoints &&
            typeof defaultSettings.routeConfig.endpoints === "object"
        ) {
            profileEndpoints = defaultSettings.routeConfig.endpoints;
        }
    } catch (e) {
        Log.warn(
            "[GeoLeaf.Route] Impossible de lire la config/endpoints depuis le profile actif.",
            e
        );
    }
    return { routeConfigDefault, profileEndpoints };
}

function _addRouteEndpoints(
    self: any,
    coords: [number, number][],
    endpointCfg: Record<string, unknown>,
    interactiveShapes: boolean,
    route: RouteItem,
    g: GeoLeafGlobal
): void {
    if (!coords.length) return;
    const startLatLng = coords[0];
    const endLatLng = coords[coords.length - 1];
    if (endpointCfg.showStart) {
        const startStyle = Object.assign({}, endpointCfg.startStyle, {
            interactive: interactiveShapes,
            routeId: route.id,
        });
        g.L!.circleMarker(startLatLng, startStyle).addTo(self._layerGroup);
    }
    if (!endpointCfg.showEnd) return;
    if (!endLatLng) return;
    if (endLatLng[0] === startLatLng[0] && endLatLng[1] === startLatLng[1]) return;
    const endStyle = Object.assign({}, endpointCfg.endStyle, {
        interactive: interactiveShapes,
        routeId: route.id,
    });
    g.L!.circleMarker(endLatLng, endStyle).addTo(self._layerGroup);
}

function _processOneRoute(
    self: any,
    route: RouteItem,
    activeProfile: Record<string, unknown> | null,
    routeConfigDefault: Record<string, unknown> | null,
    defaultStyle: Record<string, unknown>,
    interactiveShapes: boolean,
    profileEndpoints: unknown,
    g: GeoLeafGlobal
): [number, number][] {
    if (!route || typeof route !== "object") return [];
    const coords = self._extractCoordsFromRouteItem(route);
    if (!coords.length) return [];
    const routeStyle = self._resolveRouteStyle(
        route,
        activeProfile,
        routeConfigDefault,
        defaultStyle
    ) as Record<string, unknown>;
    routeStyle.interactive = interactiveShapes;
    const polyline = g.L!.polyline(coords, routeStyle).addTo(self._layerGroup) as any;
    if (!polyline.options) polyline.options = {};
    polyline.options.routeId = route.id;
    polyline._geoleafRouteData = route;
    self._addRouteTooltip(polyline, route);
    self._addRoutePopup(polyline, route);
    if (!self._routeLayer) self._routeLayer = polyline;
    const endpointCfg = self._resolveEndpointConfig(
        route,
        profileEndpoints,
        self._options
    ) as Record<string, unknown>;
    _addRouteEndpoints(self, coords, endpointCfg, interactiveShapes, route, g);
    return coords;
}

function _validateMaxZoomOnFit(opts: any): void {
    if (opts.maxZoomOnFit === undefined) return;
    if (typeof opts.maxZoomOnFit === "number" && opts.maxZoomOnFit >= 1 && opts.maxZoomOnFit <= 20)
        return;
    Log.warn("[GeoLeaf.Route] options.maxZoomOnFit must be between 1 and 20.");
    opts.maxZoomOnFit = 14;
}

function _resolveMapForInit(options: any, g: GeoLeafGlobal): unknown {
    let map: unknown = options.map ?? null;
    if (!map && g.GeoLeaf && g.GeoLeaf.Core && g.GeoLeaf.Core.getMap) map = g.GeoLeaf.Core.getMap();
    if (g.GeoLeaf && g.GeoLeaf.Utils && g.GeoLeaf.Utils.ensureMap)
        map = g.GeoLeaf.Utils.ensureMap(map);
    return map;
}

function _mergeRouteOptions(self: any, options: any, g: GeoLeafGlobal): void {
    if (g.GeoLeaf && g.GeoLeaf.Utils && g.GeoLeaf.Utils.mergeOptions) {
        self._options = g.GeoLeaf.Utils.mergeOptions(self._options, options);
        return;
    }
    const merged = Object.assign({}, self._options, options);
    if (self._options.lineStyle && options.lineStyle && typeof options.lineStyle === "object") {
        merged.lineStyle = Object.assign({}, self._options.lineStyle, options.lineStyle);
    }
    self._options = merged;
}

const RouteModule = {
    _map: null as unknown,
    _layerGroup: null as unknown,
    _routeLayer: null as unknown,
    _initialized: false,
    _visible: true,
    _options: {
        lineStyle: {
            color: "#1E88E5",
            weight: 4,
            opacity: 0.9,
            interactive: false,
        },
        waypointStyle: {
            radius: 5,
            color: "#0D47A1",
            fillColor: "#42A5F5",
            fillOpacity: 0.9,
            weight: 2,
        },
        showStart: true,
        showEnd: true,
        startWaypointStyle: null as unknown,
        endWaypointStyle: null as unknown,
        fitBoundsOnLoad: true,
        maxZoomOnFit: 14,
    } as RouteOptions & Record<string, unknown>,

    _validateOptions(
        options: RouteOptions & Record<string, unknown>
    ): RouteOptions & Record<string, unknown> {
        const opts = options ?? {};
        if (opts.map && typeof (opts.map as { addLayer?: unknown }).addLayer !== "function") {
            Log.warn("[GeoLeaf.Route] options.map does not appear to be a valid Leaflet map.");
        }
        if (opts.lineStyle && typeof opts.lineStyle !== "object") {
            Log.warn("[GeoLeaf.Route] options.lineStyle must be an object.");
            delete opts.lineStyle;
        }
        if (opts.waypointStyle && typeof opts.waypointStyle !== "object") {
            Log.warn("[GeoLeaf.Route] options.waypointStyle must be an object.");
            delete opts.waypointStyle;
        }
        _validateMaxZoomOnFit(opts);
        return opts;
    },

    getLayer(): unknown {
        return this._layerGroup ?? null;
    },

    init(options: RouteOptions & Record<string, unknown> = {}): unknown {
        options = this._validateOptions(options);
        const g = _g as GeoLeafGlobal;
        if (typeof g.L === "undefined") {
            Log.error("[GeoLeaf.Route] Leaflet introuvable.");
            return null;
        }
        const map = _resolveMapForInit(options, g);
        if (!map) {
            Log.error("[GeoLeaf.Route] No map available for init().");
            return null;
        }
        this._map = map;
        _mergeRouteOptions(this, options, g);
        const interactiveShapes = _getInteractiveShapes(g);
        if (this._options.lineStyle)
            (this._options.lineStyle as Record<string, unknown>).interactive = interactiveShapes;
        this._layerGroup = g.L!.layerGroup().addTo(this._map);
        this._routeLayer = g.L!.polyline([], this._options.lineStyle).addTo(this._layerGroup);
        this._initialized = true;
        this._visible = true;
        return this._layerGroup;
    },

    isInitialized(): boolean {
        return this._initialized === true && !!this._map && !!this._layerGroup;
    },

    isVisible(): boolean {
        return this._visible === true;
    },

    show(): void {
        if (!this._map || !this._layerGroup) return;
        const m = this._map as {
            hasLayer: (l: unknown) => boolean;
            addLayer: (l: unknown) => void;
        };
        if (!m.hasLayer(this._layerGroup)) {
            (this._layerGroup as { addTo: (map: unknown) => unknown }).addTo?.(this._map) ??
                m.addLayer(this._layerGroup);
        }
        this._visible = true;
    },

    hide(): void {
        if (!this._map || !this._layerGroup) return;
        const m = this._map as {
            hasLayer: (l: unknown) => boolean;
            removeLayer: (l: unknown) => void;
        };
        if (m.hasLayer(this._layerGroup)) m.removeLayer(this._layerGroup);
        this._visible = false;
    },

    toggleVisibility(): void {
        if (!this.isInitialized()) {
            Log.warn("[GeoLeaf.Route] toggleVisibility() called without init().");
            return;
        }
        if (this.isVisible()) this.hide();
        else this.show();
    },

    clear(): void {
        const g = _g as GeoLeafGlobal;
        if (this._layerGroup) {
            (this._layerGroup as { clearLayers?: () => void }).clearLayers?.();
        }
        if (this._map && this._layerGroup && g.L) {
            this._routeLayer = g.L.polyline([], this._options.lineStyle).addTo(this._layerGroup);
        } else {
            this._routeLayer = null;
        }
    },

    loadGPX(url: string): Promise<void> {
        if (!url) {
            Log.warn("[GeoLeaf.Route] URL GPX manquante.");
            return Promise.resolve();
        }
        const g = _g as GeoLeafGlobal & {
            GeoLeaf?: {
                Utils?: {
                    FetchHelper?: {
                        fetch: (
                            url: string,
                            opts: unknown
                        ) => Promise<{ text: () => Promise<string> }>;
                    };
                };
            };
        };
        const FetchHelper = g.GeoLeaf?.Utils?.FetchHelper;
        if (FetchHelper) {
            return FetchHelper.fetch(url, { timeout: 15000, retries: 2, parseResponse: false })
                .then((response) => response.text())
                .then((xmlText) => new DOMParser().parseFromString(xmlText, "application/xml"))
                .then((gpx) => {
                    const coords = Array.from(gpx.getElementsByTagName("trkpt")).map((pt) => [
                        parseFloat(pt.getAttribute("lat") || "0"),
                        parseFloat(pt.getAttribute("lon") || "0"),
                    ]) as [number, number][];
                    this._applyRoute(coords);
                })
                .catch((err) => {
                    Log.error("[GeoLeaf.Route] Erreur GPX :", err);
                });
        }
        return fetch(url)
            .then((res) => res.text())
            .then((xmlText) => new DOMParser().parseFromString(xmlText, "application/xml"))
            .then((gpx) => {
                const coords = Array.from(gpx.getElementsByTagName("trkpt")).map((pt) => [
                    parseFloat(pt.getAttribute("lat") || "0"),
                    parseFloat(pt.getAttribute("lon") || "0"),
                ]) as [number, number][];
                this._applyRoute(coords);
            })
            .catch((err) => Log.error("[GeoLeaf.Route] Erreur GPX :", err));
    },

    loadGeoJSON(geojson: Parameters<typeof RouteLoaders.loadGeoJSON>[0]): void {
        RouteLoaders.loadGeoJSON(geojson, this._applyRoute.bind(this));
    },

    loadFromConfig(routes: RouteItem[]): void {
        if (!this.isInitialized()) {
            Log.warn(
                "[GeoLeaf.Route] loadFromConfig() called while the module is not initialized."
            );
            return;
        }
        if (!Array.isArray(routes) || routes.length === 0) {
            this.clear();
            Log.info("[GeoLeaf.Route] No routes in cfg.routes; layer cleared.");
            return;
        }
        this.clear();
        const g = _g as GeoLeafGlobal;
        const allCoords: [number, number][] = [];
        const defaultStyle = (this._options.lineStyle ?? {}) as Record<string, unknown>;
        const activeProfile = _getActiveProfile(g);
        const { routeConfigDefault, profileEndpoints } = _loadProfileConfig(g);
        const interactiveShapes = _getInteractiveShapes(g);
        for (const route of routes) {
            const coords = _processOneRoute(
                this,
                route,
                activeProfile,
                routeConfigDefault,
                defaultStyle,
                interactiveShapes,
                profileEndpoints,
                g
            );
            allCoords.push(...coords);
        }
        if (allCoords.length === 0) {
            Log.warn("[GeoLeaf.Route] loadFromConfig() found no valid route in cfg.routes.");
            return;
        }
        _fitBoundsOnCoords(this, g);
        this._fireRouteLoadedEvents(allCoords);
    },

    filterVisibility(filteredRoutes: { id?: string }[]): void {
        if (!this._initialized) {
            Log.warn("[GeoLeaf.Route] Module not initialized - filterVisibility ignored.");
            return;
        }
        if (!Array.isArray(filteredRoutes)) {
            Log.warn("[GeoLeaf.Route] filterVisibility: filteredRoutes must be an array.");
            return;
        }
        const visibleRouteIds = new Set(filteredRoutes.map((r) => r.id));
        (this._layerGroup as { eachLayer: (fn: (layer: unknown) => void) => void }).eachLayer?.(
            (layer: unknown) => {
                const l = layer as {
                    options?: { routeId?: string };
                    feature?: { properties?: { id?: string } };
                    getElement?: () => HTMLElement | null | undefined;
                };
                const routeId = l.options?.routeId ?? l.feature?.properties?.id;
                if (routeId === undefined) return;
                // Use CSS-level visibility to avoid destroying/recreating SVG paths (which loses style).
                // map.removeLayer/addLayer would recreate the <path> element and can cause color loss
                // (black-line bug) when a subsequent Route.show() re-adds all sublayers.
                const el = l.getElement?.();
                if (!el) return;
                el.style.display = visibleRouteIds.has(routeId) ? "" : "none";
            }
        );
        Log.info(
            "[GeoLeaf.Route] Filtered visibility: " + filteredRoutes.length + " visible routes."
        );
    },

    _extractCoordsFromRouteItem(route: RouteItem): [number, number][] {
        return RouteLoaders.extractCoordsFromRouteItem(route);
    },

    _resolveRouteStyle(
        route: RouteItem,
        activeProfile: Record<string, unknown> | null,
        routeConfigDefault: Record<string, unknown> | null,
        defaultStyle: Record<string, unknown>
    ): Record<string, unknown> {
        return RouteStyleResolver.resolveRouteStyle(
            route,
            activeProfile,
            routeConfigDefault,
            defaultStyle
        );
    },

    _resolveEndpointConfig(
        route: RouteItem | null,
        profileEndpoints: unknown,
        moduleOptions: unknown
    ): ReturnType<typeof RouteStyleResolver.resolveEndpointConfig> {
        return RouteStyleResolver.resolveEndpointConfig(
            route,
            profileEndpoints as Parameters<typeof RouteStyleResolver.resolveEndpointConfig>[1],
            moduleOptions as Parameters<typeof RouteStyleResolver.resolveEndpointConfig>[2]
        );
    },

    addWaypoint(latlng: [number, number]): void {
        RouteLayerManager.addWaypoint(
            this._layerGroup,
            latlng,
            (this._options.waypointStyle ?? {}) as Record<string, unknown>
        );
    },

    addSegment(coords: [number, number][]): void {
        if (!this._routeLayer) return;
        const layer = this._routeLayer as {
            getLatLngs: () => unknown[];
            setLatLngs: (c: unknown[]) => void;
        };
        const current = layer.getLatLngs?.() ?? [];
        layer.setLatLngs?.([...current, ...coords]);
    },

    _applyRoute(coords: [number, number][]): void {
        const context = {
            map: this._map,
            layerGroup: this._layerGroup,
            routeLayer: this._routeLayer,
            options: this._options,
        };
        RouteLayerManager.applyRoute(
            context,
            coords,
            () => {
                this.clear();
                // After clear(), this._routeLayer is a fresh polyline added to the layerGroup.
                // Propagate it into context so applyRoute sets coords on the correct (new) layer
                // rather than the stale pre-clear() reference.
                (context as { routeLayer?: unknown }).routeLayer = this._routeLayer;
            },
            this._fireRouteLoadedEvents.bind(this)
        );
        this._routeLayer = (context as { routeLayer?: unknown }).routeLayer ?? this._routeLayer;
    },

    _addRouteTooltip(
        polyline: { bindTooltip: (content: string, opts: unknown) => void },
        route: RouteItem
    ): void {
        RoutePopupBuilder.addRouteTooltip(polyline, route);
    },

    _addRoutePopup(
        polyline: {
            bindPopup: (c: string, o: unknown) => void;
            on: (e: string, fn: () => void) => void;
        },
        route: RouteItem
    ): void {
        RoutePopupBuilder.addRoutePopup(polyline, route, this);
    },

    _buildRoutePopupContent(route: RouteItem): string {
        return RoutePopupBuilder.buildRoutePopupContent(route);
    },

    _openRouteSidePanel(route: RouteItem): void {
        RoutePopupBuilder.openRouteSidePanel(route);
    },

    _fireRouteLoadedEvents(coords: [number, number][]): void {
        RouteLayerManager.fireRouteLoadedEvents(this._map, this._routeLayer, coords);
    },
};

const Route = RouteModule;
export { Route };
