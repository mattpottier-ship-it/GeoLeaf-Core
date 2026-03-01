/** GeoLeaf Route API */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from '../log/index.js';
import { RouteLoaders } from './loaders.js';
import { RouteStyleResolver } from './style-resolver.js';
import { RoutePopupBuilder } from './popup-builder.js';
import { RouteLayerManager } from './layer-manager.js';
import type { RouteOptions, RouteItem } from './route-types.js';

const _g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

interface GeoLeafGlobal {
    GeoLeaf?: {
        Config?: { get: (path: string, defaultValue?: unknown) => unknown; getActiveProfile?: () => Record<string, unknown> | null };
        Core?: { getMap?: () => unknown };
        Utils?: { ensureMap?: (m: unknown) => unknown; mergeOptions?: (a: unknown, b: unknown) => unknown };
    };
    L?: {
        layerGroup: () => { addTo: (map: unknown) => unknown; clearLayers: () => void; eachLayer: (fn: (layer: unknown) => void) => void; getBounds: () => unknown };
        polyline: (latlngs: unknown[], options: unknown) => {
            addTo: (g: unknown) => unknown;
            setLatLngs: (c: unknown[]) => void;
            getLatLngs: () => unknown[];
            getBounds: () => unknown;
            options?: Record<string, unknown>;
            bindTooltip?: unknown;
            bindPopup?: unknown;
            on?: unknown;
        };
        circleMarker: (latlng: [number, number], options: unknown) => { addTo: (g: unknown) => unknown };
    };
}

const RouteModule = {
    _map: null as unknown,
    _layerGroup: null as unknown,
    _routeLayer: null as unknown,
    _initialized: false,
    _visible: true,
    _options: {
        lineStyle: {
            color: '#1E88E5',
            weight: 4,
            opacity: 0.9,
            interactive: false,
        },
        waypointStyle: {
            radius: 5,
            color: '#0D47A1',
            fillColor: '#42A5F5',
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

    _validateOptions(options: RouteOptions & Record<string, unknown>): RouteOptions & Record<string, unknown> {
        const opts = options ?? {};
        if (opts.map && typeof (opts.map as { addLayer?: unknown }).addLayer !== 'function') {
            Log.warn('[GeoLeaf.Route] options.map ne semble pas être une carte Leaflet valide.');
        }
        if (opts.lineStyle && typeof opts.lineStyle !== 'object') {
            Log.warn('[GeoLeaf.Route] options.lineStyle doit être un objet.');
            delete opts.lineStyle;
        }
        if (opts.waypointStyle && typeof opts.waypointStyle !== 'object') {
            Log.warn('[GeoLeaf.Route] options.waypointStyle doit être un objet.');
            delete opts.waypointStyle;
        }
        if (opts.maxZoomOnFit !== undefined && (typeof opts.maxZoomOnFit !== 'number' || opts.maxZoomOnFit < 1 || opts.maxZoomOnFit > 20)) {
            Log.warn('[GeoLeaf.Route] options.maxZoomOnFit doit être entre 1 et 20.');
            opts.maxZoomOnFit = 14;
        }
        return opts;
    },

    getLayer(): unknown {
        return this._layerGroup ?? null;
    },

    init(options: RouteOptions & Record<string, unknown> = {}): unknown {
        options = this._validateOptions(options);
        const g = _g as GeoLeafGlobal;
        if (typeof g.L === 'undefined') {
            Log.error('[GeoLeaf.Route] Leaflet introuvable.');
            return null;
        }
        let map: unknown = options.map ?? null;
        if (!map && g.GeoLeaf?.Core?.getMap) map = g.GeoLeaf.Core.getMap();
        if (g.GeoLeaf?.Utils?.ensureMap) map = g.GeoLeaf.Utils.ensureMap(map);
        if (!map) {
            Log.error('[GeoLeaf.Route] Aucune carte disponible pour init().');
            return null;
        }
        this._map = map;
        if (g.GeoLeaf?.Utils?.mergeOptions) {
            this._options = g.GeoLeaf.Utils.mergeOptions(this._options, options) as RouteOptions & Record<string, unknown>;
        } else {
            this._options = Object.assign({}, this._options, options);
        }
        const interactiveShapes = g.GeoLeaf?.Config?.get?.('ui.interactiveShapes', false) as boolean;
        if (this._options.lineStyle) (this._options.lineStyle as Record<string, unknown>).interactive = interactiveShapes;
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
        const m = this._map as { hasLayer: (l: unknown) => boolean; addLayer: (l: unknown) => void };
        if (!m.hasLayer(this._layerGroup)) {
            (this._layerGroup as { addTo: (map: unknown) => unknown }).addTo?.(this._map) ?? m.addLayer(this._layerGroup);
        }
        this._visible = true;
    },

    hide(): void {
        if (!this._map || !this._layerGroup) return;
        const m = this._map as { hasLayer: (l: unknown) => boolean; removeLayer: (l: unknown) => void };
        if (m.hasLayer(this._layerGroup)) m.removeLayer(this._layerGroup);
        this._visible = false;
    },

    toggleVisibility(): void {
        if (!this.isInitialized()) {
            Log.warn('[GeoLeaf.Route] toggleVisibility() appelé sans init().');
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
            Log.warn('[GeoLeaf.Route] URL GPX manquante.');
            return Promise.resolve();
        }
        const g = _g as GeoLeafGlobal & { GeoLeaf?: { Utils?: { FetchHelper?: { fetch: (url: string, opts: unknown) => Promise<{ text: () => Promise<string> }> } } } };
        const FetchHelper = g.GeoLeaf?.Utils?.FetchHelper;
        if (FetchHelper) {
            return FetchHelper.fetch(url, { timeout: 15000, retries: 2, parseResponse: false })
                .then((response) => response.text())
                .then((xmlText) => new DOMParser().parseFromString(xmlText, 'application/xml'))
                .then((gpx) => {
                    const coords = Array.from(gpx.getElementsByTagName('trkpt')).map((pt) => [
                        parseFloat(pt.getAttribute('lat') || '0'),
                        parseFloat(pt.getAttribute('lon') || '0'),
                    ]) as [number, number][];
                    this._applyRoute(coords);
                })
                .catch((err) => {
                    Log.error('[GeoLeaf.Route] Erreur GPX :', err);
                });
        }
        return fetch(url)
            .then((res) => res.text())
            .then((xmlText) => new DOMParser().parseFromString(xmlText, 'application/xml'))
            .then((gpx) => {
                const coords = Array.from(gpx.getElementsByTagName('trkpt')).map((pt) => [
                    parseFloat(pt.getAttribute('lat') || '0'),
                    parseFloat(pt.getAttribute('lon') || '0'),
                ]) as [number, number][];
                this._applyRoute(coords);
            })
            .catch((err) => Log.error('[GeoLeaf.Route] Erreur GPX :', err));
    },

    loadGeoJSON(geojson: Parameters<typeof RouteLoaders.loadGeoJSON>[0]): void {
        RouteLoaders.loadGeoJSON(geojson, this._applyRoute.bind(this));
    },

    loadFromConfig(routes: RouteItem[]): void {
        if (!this.isInitialized()) {
            Log.warn("[GeoLeaf.Route] loadFromConfig() appelé alors que le module n'est pas initialisé.");
            return;
        }
        if (!Array.isArray(routes) || routes.length === 0) {
            this.clear();
            Log.info("[GeoLeaf.Route] Aucun itinéraire dans cfg.routes ; couche vidée.");
            return;
        }
        this.clear();
        const g = _g as GeoLeafGlobal;
        const allCoords: [number, number][] = [];
        const defaultStyle = (this._options.lineStyle ?? {}) as Record<string, unknown>;

        let activeProfile: Record<string, unknown> | null = null;
        let routeConfigDefault: Record<string, unknown> | null = null;
        let profileEndpoints: unknown = null;

        try {
            if (g.GeoLeaf?.Config?.getActiveProfile) {
                activeProfile = g.GeoLeaf.Config.getActiveProfile();
                const defaultSettings = activeProfile?.defaultSettings as { routeConfig?: { default?: Record<string, unknown>; endpoints?: unknown } } | undefined;
                if (defaultSettings?.routeConfig?.default && typeof defaultSettings.routeConfig.default === 'object') {
                    routeConfigDefault = defaultSettings.routeConfig.default;
                }
                if (defaultSettings?.routeConfig?.endpoints && typeof defaultSettings.routeConfig.endpoints === 'object') {
                    profileEndpoints = defaultSettings.routeConfig.endpoints;
                }
            }
        } catch (e) {
            Log.warn("[GeoLeaf.Route] Impossible de lire la config/endpoints depuis le profil actif.", e);
        }

        for (const route of routes) {
            if (!route || typeof route !== 'object') continue;
            const coords = this._extractCoordsFromRouteItem(route);
            if (!coords.length) continue;

            const routeStyle = this._resolveRouteStyle(route, activeProfile, routeConfigDefault, defaultStyle) as Record<string, unknown>;
            const interactiveShapes = g.GeoLeaf?.Config?.get?.('ui.interactiveShapes', false) as boolean;
            routeStyle.interactive = interactiveShapes;

            const polyline = g.L!.polyline(coords, routeStyle).addTo(this._layerGroup) as {
                addTo: (g: unknown) => unknown;
                options?: Record<string, unknown>;
                _geoleafRouteData?: RouteItem;
                bindTooltip: (c: string, o: unknown) => void;
                bindPopup: (c: string, o: unknown) => void;
                on: (e: string, fn: () => void) => void;
            };
            if (!polyline.options) polyline.options = {};
            polyline.options.routeId = route.id;
            polyline._geoleafRouteData = route;
            this._addRouteTooltip(polyline, route);
            this._addRoutePopup(polyline, route);

            if (!this._routeLayer) this._routeLayer = polyline;
            allCoords.push(...coords);

            const endpointCfg = this._resolveEndpointConfig(route, profileEndpoints, this._options);
            if (coords.length > 0) {
                const startLatLng = coords[0];
                const endLatLng = coords[coords.length - 1];
                if (endpointCfg.showStart) {
                    const startStyle = Object.assign({}, endpointCfg.startStyle, { interactive: interactiveShapes, routeId: route.id });
                    g.L!.circleMarker(startLatLng, startStyle).addTo(this._layerGroup);
                }
                if (endpointCfg.showEnd && endLatLng && (endLatLng[0] !== startLatLng[0] || endLatLng[1] !== startLatLng[1])) {
                    const endStyle = Object.assign({}, endpointCfg.endStyle, { interactive: interactiveShapes, routeId: route.id });
                    g.L!.circleMarker(endLatLng, endStyle).addTo(this._layerGroup);
                }
            }
        }

        if (allCoords.length === 0) {
            Log.warn("[GeoLeaf.Route] loadFromConfig() n'a trouvé aucun itinéraire valide dans cfg.routes.");
            return;
        }

        if (this._options.fitBoundsOnLoad) {
            try {
                const bounds = (this._layerGroup as { getBounds: () => unknown }).getBounds?.();
                const fitOpt: { maxZoom?: number } = {};
                if (this._options.maxZoomOnFit) fitOpt.maxZoom = this._options.maxZoomOnFit;
                (this._map as { fitBounds: (b: unknown, o?: unknown) => void }).fitBounds?.(bounds, fitOpt);
            } catch (e) {
                Log.warn('[GeoLeaf.Route] Erreur lors du fitBounds sur les itinéraires :', e);
            }
        }
        this._fireRouteLoadedEvents(allCoords);
    },

    filterVisibility(filteredRoutes: { id?: string }[]): void {
        if (!this._initialized) {
            Log.warn('[GeoLeaf.Route] Module non initialisé - filterVisibility ignoré.');
            return;
        }
        if (!Array.isArray(filteredRoutes)) {
            Log.warn('[GeoLeaf.Route] filterVisibility : filteredRoutes doit être un tableau.');
            return;
        }
        const visibleRouteIds = new Set(filteredRoutes.map((r) => r.id));
        const map = this._map as { hasLayer: (l: unknown) => boolean; addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
        (this._layerGroup as { eachLayer: (fn: (layer: unknown) => void) => void }).eachLayer?.((layer: unknown) => {
            const l = layer as { options?: { routeId?: string }; feature?: { properties?: { id?: string } } };
            const routeId = l.options?.routeId ?? l.feature?.properties?.id;
            if (routeId === undefined) return;
            if (visibleRouteIds.has(routeId)) {
                if (!map.hasLayer(layer)) map.addLayer(layer);
            } else {
                if (map.hasLayer(layer)) map.removeLayer(layer);
            }
        });
        Log.info('[GeoLeaf.Route] Visibilité filtrée : ' + filteredRoutes.length + ' routes visibles.');
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
        return RouteStyleResolver.resolveRouteStyle(route, activeProfile, routeConfigDefault, defaultStyle);
    },

    _resolveEndpointConfig(route: RouteItem | null, profileEndpoints: unknown, moduleOptions: unknown): ReturnType<typeof RouteStyleResolver.resolveEndpointConfig> {
        return RouteStyleResolver.resolveEndpointConfig(route, profileEndpoints as Parameters<typeof RouteStyleResolver.resolveEndpointConfig>[1], moduleOptions as Parameters<typeof RouteStyleResolver.resolveEndpointConfig>[2]);
    },

    addWaypoint(latlng: [number, number]): void {
        RouteLayerManager.addWaypoint(this._layerGroup, latlng, (this._options.waypointStyle ?? {}) as Record<string, unknown>);
    },

    addSegment(coords: [number, number][]): void {
        if (!this._routeLayer) return;
        const layer = this._routeLayer as { getLatLngs: () => unknown[]; setLatLngs: (c: unknown[]) => void };
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
        RouteLayerManager.applyRoute(context, coords, this.clear.bind(this), this._fireRouteLoadedEvents.bind(this));
        this._routeLayer = (context as { routeLayer?: unknown }).routeLayer ?? this._routeLayer;
    },

    _addRouteTooltip(polyline: { bindTooltip: (content: string, opts: unknown) => void }, route: RouteItem): void {
        RoutePopupBuilder.addRouteTooltip(polyline, route);
    },

    _addRoutePopup(polyline: { bindPopup: (c: string, o: unknown) => void; on: (e: string, fn: () => void) => void }, route: RouteItem): void {
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
