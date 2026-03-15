/*!
 * GeoLeaf Core – Config / Types
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Map configuration section
 */
export interface MapConfig {
    /** HTML element ID for the map container. */
    target?: string;
    /** Alias for target (legacy). */
    id?: string;
    /** Geographic bounds: [[south, west], [north, east]]. Required. */
    bounds?: [[number, number], [number, number]];
    /** Initial map center [lat, lng]. */
    center?: [number, number];
    /** Initial zoom level. */
    zoom?: number;
    /** Maximum zoom level. */
    maxZoom?: number;
    /** Minimum zoom level. */
    minZoom?: number;
    /** Alias for maxZoom (legacy). Used by initApp. */
    initialMaxZoom?: number;
    /** Padding in pixels applied to fitBounds ([top/bottom, left/right]). */
    padding?: [number, number];
    /** When true, restricts panning/zooming to bounds. */
    positionFixed?: boolean;
    /** Degree by which bounds are padded when positionFixed is true. Default 0.3. */
    boundsMargin?: number;
    /** Raw Leaflet map options forwarded to the Leaflet Map constructor. */
    mapOptions?: Record<string, unknown>;
}

/**
 * Data configuration section (profiles, mapping, etc.)
 */
export interface DataConfig {
    /** Name of the active profile to load. */
    activeProfile?: string;
    /** Base path to the profiles directory. Default "profiles". */
    profilesBasePath?: string;
    /** Enable POI mapping from active profile. */
    enableProfilePoiMapping?: boolean;
    /** Use POI mapping from active profile (alias). */
    useProfilePoiMapping?: boolean;
    /** Use mapping.json for data normalization. */
    useMapping?: boolean;
}

/**
 * UI configuration section
 * All flags come from profile.json → ui (or the root geoleaf.config.json → ui).
 */
export interface UIConfig {
    /** Active colour theme. Default "light". */
    theme?: "light" | "dark" | string;
    /** UI language code (e.g. "fr", "en"). */
    language?: string;
    /** Show the basemap switcher control. Default true. */
    showBaseLayerControls?: boolean;
    /** Show the layer manager panel. Default true. */
    showLayerManager?: boolean;
    /** Show the filter/search panel. Default true. */
    showFilterPanel?: boolean;
    /** Enable the geolocation button. Default true. */
    enableGeolocation?: boolean;
    /** Show the coordinates display. Default true. */
    showCoordinates?: boolean;
    /** Show the theme selector button. Default true. */
    showThemeSelector?: boolean;
    /** Show the legend panel. Default true. */
    showLegend?: boolean;
    /** Show the offline cache button (requires plugin-storage). Default false. */
    showCacheButton?: boolean;
    /** Show the add-POI button (requires plugin-addpoi). Default false. */
    showAddPoi?: boolean;
    /** Show the data table panel. Default true. */
    showTable?: boolean;
    [key: string]: unknown;
}

/**
 * Category or subcategory item in taxonomy
 */
export interface CategoryItem {
    label: string;
    icon?: string;
    color?: string;
    colorFill?: string;
    colorStroke?: string;
    subcategories?: Record<string, CategoryItem>;
    [key: string]: unknown;
}

/**
 * Basemap (tile or vector) configuration entry.
 * Used as values in GeoLeafConfig.basemaps record.
 */
export interface BasemapConfig {
    /** Unique basemap key (mirrors the record key). */
    id?: string;
    /** Display label shown in the basemap switcher. */
    label?: string;
    /** 'tile' for raster tile layers, 'maplibre' for vector tile layers. */
    type?: "tile" | "maplibre" | string;
    /** Tile URL template, e.g. "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png". */
    url?: string;
    /** Fallback tile URL when MapLibre GL is unavailable. */
    fallbackUrl?: string;
    /** Map attribution string (HTML allowed). */
    attribution?: string;
    /** Minimum zoom level. */
    minZoom?: number;
    /** Maximum zoom level. */
    maxZoom?: number;
    /** MapLibre GL style URL (only for type: 'maplibre'). */
    style?: string;
    /** Tile subdomains, e.g. "abc" or ["a", "b", "c"]. */
    subdomains?: string | string[];
    /** When true, this basemap is active on startup. */
    defaultBasemap?: boolean;
    /** When true, this basemap supports offline tile caching. */
    offline?: boolean;
    /** Geographic bounds for offline caching. */
    offlineBounds?: { north: number; south: number; east: number; west: number };
    /** Minimum zoom level to cache offline. */
    cacheMinZoom?: number;
    /** Maximum zoom level to cache offline. */
    cacheMaxZoom?: number;
}

/**
 * Layer reference entry in the profile layers array.
 * Points to a per-layer JSON config file loaded at runtime.
 */
export interface LayerConfig {
    /** Unique layer ID used throughout the app. */
    id?: string;
    /** Direct GeoJSON / tile URL (alternative to configFile). */
    url?: string;
    /** Internal name (legacy). Prefer label. */
    name?: string;
    /** Display label shown in the layer manager. */
    label?: string;
    /** Relative path to the layer's JSON config file. */
    configFile?: string;
    /** Layer manager group/panel ID this layer belongs to. */
    layerManagerId?: string;
    /** Whether the layer is visible on startup. Default true. */
    visible?: boolean;
    /** Active style ID applied to this layer. */
    style?: string;
    [key: string]: unknown;
}

/**
 * Profile.json structure (metadata for a business profile)
 */
export interface ProfileConfig {
    id: string;
    name?: string;
    layers?: LayerConfig[] | string[];
    [key: string]: unknown;
}

/** Security options. */
export interface SecurityConfig {
    /** When true, validateUrl() rejects http: and allows only https: and data: (images). Default false. */
    httpsOnly?: boolean;
}

/** Logging / verbosity configuration. */
export interface LoggingConfig {
    /** Minimum log level. Default "info". */
    level?: "debug" | "info" | "warn" | "error" | "production";
}

/**
 * Root GeoLeaf configuration object (JSON shape)
 */
export interface GeoLeafConfig {
    map?: MapConfig;
    data?: DataConfig;
    ui?: UIConfig;
    /** Security options (e.g. httpsOnly for production). */
    security?: SecurityConfig;
    /** Logging verbosity. */
    logging?: LoggingConfig;
    /** Named basemap definitions, keyed by basemap ID. */
    basemaps?: Record<string, BasemapConfig>;
    /** GeoJSON / vector layer references loaded from configFile paths. */
    layers?: LayerConfig[];
    /** Inline POI data objects displayed as map markers. */
    poi?: unknown[];
    /** Inline GeoJSON collections rendered directly (legacy). */
    geojson?: unknown[];
    /** POI module initialization options (passed to GeoLeaf.POI.init). */
    poiConfig?: Record<string, unknown>;
    /** Category / taxonomy tree used for filtering. */
    categories?: Record<string, CategoryItem>;
    /** Filter-panel / search panel configuration. */
    search?: Record<string, unknown>;
    /** Layer manager panel configuration (e.g. title). */
    layerManagerConfig?: Record<string, unknown>;
    /** Legend panel configuration (e.g. title). */
    legendConfig?: Record<string, unknown>;
    /** Data-table panel configuration (e.g. title, enabled). */
    tableConfig?: Record<string, unknown>;
    /** Offline storage plugin configuration. */
    storage?: Record<string, unknown>;
    /** Performance tuning options. */
    performance?: Record<string, unknown>;
    /** Enable verbose debug logging. */
    debug?: boolean;
    /** Runtime cache of loaded profile payloads, keyed by profileId. Populated by ProfileModule. */
    profiles?: Record<string, unknown>;
    /** Loaded GeoJSON route objects. Populated at runtime by ProfileModule. */
    routes?: unknown[];
}

/**
 * Options for Config.init()
 */
export interface ConfigInitOptions {
    config?: GeoLeafConfig;
    url?: string;
    headers?: Record<string, string>;
    strictContentType?: boolean;
    autoEvent?: boolean;
    onLoaded?: (config: GeoLeafConfig) => void;
    onError?: (err: Error) => void;
    profileId?: string;
    mappingUrl?: string;
    mappingHeaders?: Record<string, string>;
    mappingStrictContentType?: boolean;
}

/**
 * Options for loadUrl / fetch
 */
export interface LoadUrlOptions {
    headers?: Record<string, string>;
    strictContentType?: boolean;
}
