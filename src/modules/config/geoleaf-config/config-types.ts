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
    center?: [number, number];
    zoom?: number;
    positionFixed?: boolean;
    initialMaxZoom?: number;
    boundsMargin?: number;
    [key: string]: unknown;
}

/**
 * Data configuration section (profiles, mapping, etc.)
 */
export interface DataConfig {
    activeProfile?: string;
    enableProfilePoiMapping?: boolean;
    useProfilePoiMapping?: boolean;
    useMapping?: boolean;
    [key: string]: unknown;
}

/**
 * UI configuration section
 */
export interface UIConfig {
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
 * Layer configuration (GeoJSON layer entry in config)
 */
export interface LayerConfig {
    id?: string;
    url?: string;
    name?: string;
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

/**
 * Root GeoLeaf configuration object (JSON shape)
 */
/** Security options (Sprint 8) */
export interface SecurityConfig {
    /** When true, validateUrl() rejects http: and allows only https: and data: (images). Default false. */
    httpsOnly?: boolean;
}

export interface GeoLeafConfig {
    map?: MapConfig;
    data?: DataConfig;
    ui?: UIConfig;
    /** Security options (e.g. httpsOnly for production). */
    security?: SecurityConfig;
    basemaps?: Record<string, unknown>;
    poi?: unknown[];
    geojson?: unknown[];
    categories?: Record<string, CategoryItem>;
    logging?: { level?: string };
    debug?: boolean;
    [key: string]: unknown;
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
