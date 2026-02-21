// Type definitions for GeoLeaf 4.0.0
// Project: GeoLeaf – Librairie JavaScript modulaire basée sur Leaflet
// Definitions by: Mattieu

// -------------------------------------------------------
// Types génériques
// -------------------------------------------------------

/**
 * Coordonnée géographique [latitude, longitude].
 */
export type GeoLeafLatLng = [number, number];

/**
 * Identifiant de thème UI.
 * "light" / "dark" sont les valeurs standard,
 * mais d’autres thèmes personnalisés sont possibles.
 */
export type GeoLeafTheme = "light" | "dark" | string;

/**
 * Identifiant de basemap (Street / Topo / Satellite / custom).
 */
export type GeoLeafBasemapId = "street" | "topo" | "satellite" | string;

// -------------------------------------------------------
// Espace de noms principal
// -------------------------------------------------------

/**
 * Namespace principal de la librairie GeoLeaf.
 *
 * Remarque :
 * - En usage global (via CDN / <script>), GeoLeaf est disponible
 *   sur window.GeoLeaf.
 * - En usage ESM / NPM, on importe :
 *     import GeoLeaf, { Core, UI } from "geoleaf";
 */
export namespace GeoLeaf {
    // -------------------------
    // Interfaces de configuration
    // -------------------------

    export interface CoreInitOptions {
        /** Id de l’élément DOM qui contiendra la carte (ex. "map" ou "geoleaf-map"). */
        mapId: string;
        /** Centre initial de la carte [lat, lng]. */
        center: GeoLeafLatLng;
        /** Niveau de zoom initial (par défaut 12). */
        zoom?: number;
        /** Thème UI (light, dark, ou personnalisé). */
        theme?: GeoLeafTheme;
        /** Id de basemap initial (street, topo, satellite, ou autre). */
        basemapId?: GeoLeafBasemapId;
        /** Options Leaflet supplémentaires (transmises telles quelles). */
        leafletOptions?: any;
    }

    export interface ThemeChangeOptions {
        theme: GeoLeafTheme;
    }

    export interface BasemapChangeOptions {
        basemapId: GeoLeafBasemapId;
    }

    export interface POI {
        id?: string | number;
        /** Position du POI. */
        latlng: GeoLeafLatLng;
        /** Libellé principal (title / name). */
        label?: string;
        /** Description courte. */
        description?: string;
        /** Icône / style spécifique. */
        iconId?: string;
        /** Toute donnée métier supplémentaire. */
        properties?: Record<string, any>;
    }

    export interface POIOptions {
        /** Liste des POI à afficher. */
        items: POI[];
        /** Clustering activé ou non. */
        cluster?: boolean;
        /** Zoom automatique sur l’ensemble des POI. */
        fitBounds?: boolean;
    }

    export interface GeoJSONLayerOptions {
        /** Objet GeoJSON ou URL d’un fichier externe. */
        data?: any;
        /** URL à charger (si data n’est pas fourni). */
        url?: string;
        /** Style dynamique par feature. */
        styleFn?: (feature: any) => any;
        /** Zoom automatique sur la couche. */
        fitBounds?: boolean;
    }

    export interface RouteOptions {
        /** Tableau d’étapes [lat, lng] ou polyline. */
        waypoints?: GeoLeafLatLng[];
        /** URL GPX à charger (optionnel). */
        gpxUrl?: string;
        /** Style de la polyline Leaflet. */
        polylineStyle?: any;
        /** Zoom automatique sur l’itinéraire. */
        fitBounds?: boolean;
    }

    export interface ConfigLoadOptions {
        /** URL d’un fichier de configuration externe (JSON). */
        url: string;
        /** Callback appelé après chargement / parsing. */
        onLoaded?: (config: any) => void;
        /** Callback en cas d’erreur de chargement. */
        onError?: (error: any) => void;
    }

    // -------------------------------------------------------
    // Modules / sous-API
    // -------------------------------------------------------

    /**
     * Module Core – initialisation de la carte, gestion du thème global, accès au L.Map.
     */
    export interface CoreAPI {
        /**
         * Initialise la carte GeoLeaf dans un conteneur DOM.
         * Retourne généralement l’instance Leaflet (L.Map) ou un wrapper interne.
         */
        init(options: CoreInitOptions): any;

        /**
         * Retourne l’instance de la carte Leaflet actuellement utilisée (si disponible).
         */
        getMap(): any | null;

        /**
         * Modifie dynamiquement le thème UI (light/dark/custom).
         */
        setTheme(options: ThemeChangeOptions): void;
    }

    /**
     * Module UI – boutons, panneaux, contrôles (thème, basemaps, légende, etc.).
     */
    export interface UIAPI {
        /**
         * Initialise l’UI GeoLeaf sur une carte déjà créée.
         * Généralement appelée après Core.init().
         */
        initUI(map?: any): void;

        /**
         * Force la mise à jour visuelle du thème sans réinitialiser la carte.
         */
        refreshTheme(theme: GeoLeafTheme): void;
    }

    /**
     * Module Baselayers – gestion des fonds de carte (Street / Topo / Satellite / custom).
     */
    export interface BaselayersAPI {
        /**
         * Enregistre les basemaps disponibles.
         */
        registerBasemaps(definitions: Record<GeoLeafBasemapId, any>): void;

        /**
         * Change le fond de carte actif.
         */
        setBasemap(options: BasemapChangeOptions): void;

        /**
         * Retourne l’id du basemap actuellement actif.
         */
        getActiveBasemapId(): GeoLeafBasemapId | null;
    }

    /**
     * Module POI – markers, clusters, gestion simple des points d’intérêt.
     */
    export interface POIAPI {
        /**
         * Ajoute une collection de POI sur la carte.
         */
        addPOI(options: POIOptions): any;

        /**
         * Efface tous les POI actuellement affichés.
         */
        clear(): void;
    }

    /**
     * Module GeoJSON – chargement de fichiers GeoJSON, style dynamique, zoom.
     */
    export interface GeoJSONAPI {
        /**
         * Charge un GeoJSON externe ou un objet GeoJSON en mémoire.
         */
        loadLayer(options: GeoJSONLayerOptions): any;

        /**
         * Supprime toutes les couches GeoJSON gérées par GeoLeaf.
         */
        clear(): void;
    }

    /**
     * Module Route – gestion d’itinéraires simples, polylignes, GPX.
     */
    export interface RouteAPI {
        /**
         * Affiche un itinéraire (waypoints ou GPX).
         */
        showRoute(options: RouteOptions): any;

        /**
         * Supprime l’itinéraire courant.
         */
        clear(): void;
    }

    /**
     * Module Config – configuration externe JSON (basemaps, thèmes, POI, etc.).
     */
    export interface ConfigAPI {
        /**
         * Charge un fichier de configuration externe et l’applique.
         */
        load(options: ConfigLoadOptions): Promise<any>;
    }

    /**
     * Module Legend – gestion des légendes, overlays, mini-map.
     */
    export interface LegendAPI {
        /**
         * Initialise ou rafraîchit la légende en fonction des couches actives.
         */
        refresh(): void;
    }

    // -------------------------------------------------------
    // NEW MODULES (v1.2+)
    // -------------------------------------------------------

    /**
     * Module Security – Protection XSS, validation d'URLs, sanitization.
     * @since v1.2.2
     */
    export interface SecurityAPI {
        /**
         * Échappe les caractères HTML dangereux dans une chaîne.
         * @param str - Chaîne à échapper
         * @returns Chaîne sécurisée pour insertion HTML
         */
        escapeHtml(str: string): string;

        /**
         * Échappe les caractères dangereux pour usage dans attributs HTML.
         * @param str - Chaîne à échapper
         * @returns Chaîne sécurisée pour attributs
         */
        escapeAttribute(str: string): string;

        /**
         * Valide qu'une URL utilise un protocole autorisé (http/https/data:image).
         * @param url - URL à valider
         * @param allowedProtocols - Protocoles autorisés
         * @throws {Error} Si l'URL est invalide ou utilise un protocole non autorisé
         */
        validateUrl(url: string, allowedProtocols?: string[]): void;

        /**
         * Valide des coordonnées géographiques.
         * @param lat - Latitude
         * @param lng - Longitude
         * @throws {Error} Si les coordonnées sont hors limites
         */
        validateCoordinates(lat: number, lng: number): void;

        /**
         * Sanitize les propriétés d'un POI (échappe HTML, valide URLs).
         * @param properties - Propriétés du POI
         * @returns Propriétés nettoyées
         */
        sanitizePoiProperties(properties: Record<string, any>): Record<string, any>;

        /**
         * Détecte si une chaîne contient du HTML dangereux.
         * @param str - Chaîne à analyser
         * @returns true si du contenu dangereux est détecté
         */
        containsDangerousHtml(str: string): boolean;

        /**
         * Supprime tous les tags HTML d'une chaîne.
         * @param str - Chaîne à nettoyer
         * @returns Chaîne sans tags HTML
         */
        stripHtml(str: string): string;
    }

    /**
     * Error codes constants
     * @since v1.4.0
     */
    export const ErrorCodes: {
        readonly UNKNOWN_ERROR: string;
        readonly VALIDATION_ERROR: string;
        readonly SECURITY_ERROR: string;
        readonly CONFIG_ERROR: string;
        readonly NETWORK_ERROR: string;
        readonly INITIALIZATION_ERROR: string;
        readonly MAP_ERROR: string;
        readonly DATA_ERROR: string;
        readonly POI_ERROR: string;
        readonly ROUTE_ERROR: string;
        readonly UI_ERROR: string;
    };

    /**
     * Base error class for GeoLeaf
     * @since v1.4.0
     */
    export class GeoLeafError extends Error {
        code: string;
        context?: Record<string, any>;
        timestamp: number;

        constructor(message: string, code?: string, context?: Record<string, any>);

        toJSON(): {
            name: string;
            message: string;
            code: string;
            context?: Record<string, any>;
            timestamp: number;
            stack?: string;
        };

        toString(): string;
    }

    /**
     * Validation error
     * @since v1.4.0
     */
    export class ValidationError extends GeoLeafError {
        field?: string;
        value?: any;
        constraint?: string;

        constructor(message: string, context?: {
            field?: string;
            value?: any;
            constraint?: string;
            [key: string]: any;
        });
    }

    /**
     * Security error
     * @since v1.4.0
     */
    export class SecurityError extends GeoLeafError {
        attack?: string;
        input?: string;

        constructor(message: string, context?: {
            attack?: string;
            input?: string;
            [key: string]: any;
        });
    }

    /**
     * Configuration error
     * @since v1.4.0
     */
    export class ConfigError extends GeoLeafError {
        configKey?: string;
        configValue?: any;

        constructor(message: string, context?: {
            configKey?: string;
            configValue?: any;
            [key: string]: any;
        });
    }

    /**
     * Network error
     * @since v1.4.0
     */
    export class NetworkError extends GeoLeafError {
        url?: string;
        status?: number;
        statusText?: string;

        constructor(message: string, context?: {
            url?: string;
            status?: number;
            statusText?: string;
            [key: string]: any;
        });
    }

    /**
     * Initialization error
     * @since v1.4.0
     */
    export class InitializationError extends GeoLeafError {
        component?: string;

        constructor(message: string, context?: {
            component?: string;
            [key: string]: any;
        });
    }

    /**
     * Map error
     * @since v1.4.0
     */
    export class MapError extends GeoLeafError {
        operation?: string;

        constructor(message: string, context?: {
            operation?: string;
            [key: string]: any;
        });
    }

    /**
     * Data error
     * @since v1.4.0
     */
    export class DataError extends GeoLeafError {
        dataType?: string;

        constructor(message: string, context?: {
            dataType?: string;
            [key: string]: any;
        });
    }

    /**
     * POI error
     * @since v1.4.0
     */
    export class POIError extends GeoLeafError {
        poiId?: string | number;

        constructor(message: string, context?: {
            poiId?: string | number;
            [key: string]: any;
        });
    }

    /**
     * Route error
     * @since v1.4.0
     */
    export class RouteError extends GeoLeafError {
        routeId?: string;

        constructor(message: string, context?: {
            routeId?: string;
            [key: string]: any;
        });
    }

    /**
     * UI error
     * @since v1.4.0
     */
    export class UIError extends GeoLeafError {
        component?: string;

        constructor(message: string, context?: {
            component?: string;
            [key: string]: any;
        });
    }

    /**
     * Module Errors – Typed error classes and utilities
     * @since v1.4.0
     */
    export interface ErrorsAPI {
        GeoLeafError: typeof GeoLeafError;
        ValidationError: typeof ValidationError;
        SecurityError: typeof SecurityError;
        ConfigError: typeof ConfigError;
        NetworkError: typeof NetworkError;
        InitializationError: typeof InitializationError;
        MapError: typeof MapError;
        DataError: typeof DataError;
        POIError: typeof POIError;
        RouteError: typeof RouteError;
        UIError: typeof UIError;
        ErrorCodes: typeof ErrorCodes;

        /**
         * Normalizes any error into a GeoLeafError instance.
         */
        normalizeError(error: any): GeoLeafError;

        /**
         * Checks if error is of specific type.
         */
        isErrorType(error: any, errorClass: typeof GeoLeafError): boolean;

        /**
         * Gets error code from error object.
         */
        getErrorCode(error: any): string;

        /**
         * Creates error with proper stack trace.
         */
        createError(message: string, code?: string, context?: Record<string, any>): GeoLeafError;

        /**
         * Creates typed error by type string.
         */
        createErrorByType(type: string, message: string, context?: Record<string, any>): GeoLeafError;

        /**
         * Safe error handler wrapper.
         */
        safeErrorHandler(error: any, handler: (err: GeoLeafError) => void): void;
    }

    /**
     * Validation options for coordinates
     * @since v1.4.0
     */
    export interface CoordinateValidationOptions {
        minLat?: number;
        maxLat?: number;
        minLng?: number;
        maxLng?: number;
    }

    /**
     * Validation options for zoom level
     * @since v1.4.0
     */
    export interface ZoomValidationOptions {
        min?: number;
        max?: number;
    }

    /**
     * Module Validators – Centralized validation functions
     * @since v1.4.0
     */
    export interface ValidatorsAPI {
        /**
         * Validates geographic coordinates.
         * @throws {ValidationError} If coordinates are invalid
         */
        validateCoordinates(lat: number, lng: number, options?: CoordinateValidationOptions): void;

        /**
         * Validates URL with allowed protocols.
         * @throws {ValidationError} If URL is invalid
         */
        validateUrl(url: string, allowedProtocols?: string[]): void;

        /**
         * Validates email address format.
         * @throws {ValidationError} If email is invalid
         */
        validateEmail(email: string): void;

        /**
         * Validates phone number format.
         * @throws {ValidationError} If phone is invalid
         */
        validatePhone(phone: string): void;

        /**
         * Validates zoom level.
         * @throws {ValidationError} If zoom is out of range
         */
        validateZoom(zoom: number, options?: ZoomValidationOptions): void;

        /**
         * Validates required fields in object.
         * @throws {ValidationError} If required fields are missing
         */
        validateRequiredFields(obj: Record<string, any>, requiredFields: string[]): void;

        /**
         * Validates GeoJSON structure.
         * @throws {ValidationError} If GeoJSON is invalid
         */
        validateGeoJSON(geojson: any): void;

        /**
         * Validates color format (hex, rgb, rgba).
         * @throws {ValidationError} If color format is invalid
         */
        validateColor(color: string): void;

        /**
         * Validates array of items using validator function.
         * @returns Array of validation results
         */
        validateBatch<T>(items: T[], validator: (item: T) => void): Array<{ item: T; valid: boolean; error?: ValidationError }>;
    }

    /**
     * Module Helpers – Performance optimization utilities
     * @since v1.5.0
     */
    export interface HelpersAPI {
        // DOM Helpers
        getElementById(id: string): HTMLElement | null;
        querySelector(selector: string, parent?: HTMLElement | Document): HTMLElement | null;
        querySelectorAll(selector: string, parent?: HTMLElement | Document): HTMLElement[];
        createElement<K extends keyof HTMLElementTagNameMap>(
            tag: K,
            options?: {
                className?: string;
                id?: string;
                attributes?: Record<string, string>;
                dataset?: Record<string, string>;
                styles?: Partial<CSSStyleDeclaration>;
                textContent?: string;
                innerHTML?: string;
                children?: HTMLElement[];
                [key: string]: any;
            }
        ): HTMLElementTagNameMap[K];
        addClass(element: HTMLElement, ...classNames: string[]): void;
        removeClass(element: HTMLElement, ...classNames: string[]): void;
        toggleClass(element: HTMLElement, className: string, force?: boolean): boolean;
        hasClass(element: HTMLElement, className: string): boolean;
        removeElement(element: HTMLElement): void;

        // Performance Helpers
        debounce<T extends (...args: any[]) => any>(
            func: T,
            wait?: number,
            immediate?: boolean
        ): (...args: Parameters<T>) => void;
        throttle<T extends (...args: any[]) => any>(
            func: T,
            limit?: number
        ): (...args: Parameters<T>) => void;
        requestFrame(callback: FrameRequestCallback): number;
        cancelFrame(id: number): void;

        // AbortController Utilities
        createAbortController(timeout?: number): AbortController;
        fetchWithTimeout(url: string, options?: RequestInit, timeout?: number): Promise<Response>;

        // Lazy Loading
        lazyLoadImage(img: HTMLImageElement, options?: IntersectionObserverInit): void;
        lazyExecute(callback: () => void, timeout?: number): void;

        // Memory Optimization
        clearObject(obj: Record<string, any>): void;
        batchDomOperations<T>(callback: () => T): T;
        createFragment(children?: HTMLElement[]): DocumentFragment;

        // Event Helpers
        addEventListener<K extends keyof HTMLElementEventMap>(
            element: HTMLElement,
            event: K,
            handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
            options?: boolean | AddEventListenerOptions
        ): () => void;
        addEventListeners<K extends keyof HTMLElementEventMap>(
            element: HTMLElement,
            events: Partial<Record<K, (this: HTMLElement, ev: HTMLElementEventMap[K]) => any>>,
            options?: boolean | AddEventListenerOptions
        ): () => void;
        delegateEvent<K extends keyof HTMLElementEventMap>(
            parent: HTMLElement,
            event: K,
            selector: string,
            handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
        ): () => void;

        // Utility Functions
        deepClone<T>(obj: T): T;
        isEmpty(value: any): boolean;
        wait(ms: number): Promise<void>;
        retryWithBackoff<T>(
            fn: () => Promise<T>,
            maxRetries?: number,
            delay?: number
        ): Promise<T>;
    }

    // -------------------------------------------------------
    // Interface principale GeoLeaf (regroupe tous les modules)
    // -------------------------------------------------------

    export interface GeoLeafAPI {
        /** Version de la librairie (ex: "2.0.0"). */
        version: string;

        Core: CoreAPI;
        UI: UIAPI;
        Baselayers: BaselayersAPI;
        POI: POIAPI;
        GeoJSON: GeoJSONAPI;
        Route: RouteAPI;
        Config: ConfigAPI;
        Legend: LegendAPI;

        /** @since v1.2.2 */
        Security: SecurityAPI;
        /** @since v1.4.0 */
        Errors: ErrorsAPI;
        /** @since v1.4.0 */
        Validators: ValidatorsAPI;
        /** @since v1.5.0 */
        Helpers: HelpersAPI;
    }
}

// -------------------------------------------------------
// Export global / ESM / UMD
// -------------------------------------------------------

/**
 * Export par défaut : l’API GeoLeaf complète.
 *
 * Usage typique :
 *   import GeoLeaf from "geoleaf";
 *   GeoLeaf.Core.init(...);
 */
declare const GeoLeafDefault: GeoLeaf.GeoLeafAPI;
export default GeoLeafDefault;

/**
 * Exports nommés :
 *
 *   import { Core, POI, Security, Helpers } from "geoleaf";
 *   Core.init(...);
 */
export const Core: GeoLeaf.CoreAPI;
export const UI: GeoLeaf.UIAPI;
export const Baselayers: GeoLeaf.BaselayersAPI;
export const POI: GeoLeaf.POIAPI;
export const GeoJSON: GeoLeaf.GeoJSONAPI;
export const Route: GeoLeaf.RouteAPI;
export const Config: GeoLeaf.ConfigAPI;
export const Legend: GeoLeaf.LegendAPI;
export const Security: GeoLeaf.SecurityAPI;
export const Errors: GeoLeaf.ErrorsAPI;
export const Validators: GeoLeaf.ValidatorsAPI;
export const Helpers: GeoLeaf.HelpersAPI;

/**
 * Export global pour les environnements UMD / script direct :
 *   <script src="geoleaf.umd.js"></script>
 *   GeoLeaf.Core.init(...);
 */
export as namespace GeoLeaf;
