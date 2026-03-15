/*!
 * GeoLeaf Core – Config / Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../../log/index.js";
import { StorageHelper } from "../storage.js";
import { TaxonomyManager } from "../taxonomy.js";
import { ProfileManager } from "../profile.js";
import { ConfigNormalizer } from "../normalization.js";
import type { GeoLeafConfig, ConfigInitOptions } from "./config-types.js";

export interface ConfigInstance {
    _config: GeoLeafConfig;
    _isLoaded: boolean;
    _subModulesInitialized: boolean;
    _source: string | null;
    _options: { autoEvent: boolean };
    _validateConfig?: (cfg: GeoLeafConfig | null | undefined) => void;
    init(options?: ConfigInitOptions): Promise<GeoLeafConfig>;
    isLoaded(): boolean;
    getSource(): string | null;
    _initSubModules(): void;
    _applyConfig(cfg: Record<string, unknown> | null, source: string): void;
    _maybeFireLoadedEvent(): void;
}

function _applyProfileId(
    cfg: GeoLeafConfig,
    profileId: string | undefined,
    configObj?: GeoLeafConfig
): void {
    if (typeof profileId === "string" && profileId.length > 0) {
        if (!cfg.data) cfg.data = {};
        cfg.data.activeProfile = profileId;
        if (configObj && configObj.data) configObj.data.activeProfile = profileId;
        Log.info("[GeoLeaf.Config] Active profile changed to:", profileId);
    }
}

function _resolveDebugFlag(
    cfg: Record<string, unknown> | null,
    mergedConfig: GeoLeafConfig
): boolean {
    if (cfg && typeof (cfg as GeoLeafConfig).debug !== "undefined") {
        return !!(cfg as GeoLeafConfig).debug;
    }
    if (mergedConfig && typeof mergedConfig.debug !== "undefined") {
        return !!mergedConfig.debug;
    }
    return false;
}

function _resolveLogLevel(
    cfg: Record<string, unknown> | null,
    mergedConfig: GeoLeafConfig
): string {
    const loggingCfg =
        (cfg && typeof cfg === "object" && (cfg as GeoLeafConfig).logging
            ? (cfg as GeoLeafConfig).logging
            : mergedConfig?.logging) ?? null;
    const level = loggingCfg?.level;
    const debugFlag = _resolveDebugFlag(cfg, mergedConfig);
    return level || (debugFlag ? "debug" : "info");
}

function _applyLoggingConfig(
    cfg: Record<string, unknown> | null,
    mergedConfig: GeoLeafConfig
): void {
    const level = _resolveLogLevel(cfg, mergedConfig);
    if (level && Log?.setLevel) {
        Log.setLevel(level);
        Log.info("[GeoLeaf.Config] Log level applied from configuration:", level);
    }
}

function _resolveLoadOptions(options: ConfigInitOptions) {
    return {
        headers: options.headers,
        strictContentType:
            typeof options.strictContentType === "boolean" ? options.strictContentType : true,
    };
}

function _resolveMappingOptions(
    options: ConfigInitOptions,
    loadOptions: ReturnType<typeof _resolveLoadOptions>
) {
    return {
        headers: options.mappingHeaders || options.headers,
        strictContentType:
            typeof options.mappingStrictContentType === "boolean"
                ? options.mappingStrictContentType
                : loadOptions.strictContentType,
    };
}

function _callOnLoaded(options: ConfigInitOptions, cfg: GeoLeafConfig, context: string): void {
    if (typeof options.onLoaded === "function") {
        try {
            options.onLoaded(cfg);
        } catch (e) {
            Log.error(`[GeoLeaf.Config] Error in onLoaded (${context}):`, e);
        }
    }
}

function _initFromUrl(options: ConfigInitOptions, self: ConfigInstance): Promise<GeoLeafConfig> {
    const loadOptions = _resolveLoadOptions(options);
    const mappingUrl =
        typeof options.mappingUrl === "string" && options.mappingUrl.length > 0
            ? options.mappingUrl
            : null;
    const mappingOptions = _resolveMappingOptions(options, loadOptions);
    type WithLoadUrl = {
        loadUrl: (u: string, o: Record<string, unknown>) => Promise<GeoLeafConfig>;
        loadTaxonomy: (u: string, o: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
    const selfTyped = self as unknown as WithLoadUrl;
    return selfTyped
        .loadUrl(options.url!, loadOptions)
        .then((cfg) => {
            _applyProfileId(cfg, options.profileId, self._config);
            return cfg;
        })
        .then((cfg) => {
            if (!mappingUrl) return cfg;
            return selfTyped
                .loadTaxonomy(mappingUrl, mappingOptions)
                .then(() => cfg)
                .catch((err) => {
                    Log.warn(
                        "[GeoLeaf.Config] Failed to load category mapping from " +
                            mappingUrl +
                            " (GeoLeaf will continue without dedicated mapping):",
                        err
                    );
                    return cfg;
                });
        })
        .then((cfg) => {
            _callOnLoaded(options, cfg, "url+mapping");
            return cfg;
        })
        .catch((err) => {
            Log.error("[GeoLeaf.Config] Error in init() with url:", err);
            if (typeof options.onError === "function") {
                try {
                    options.onError(err);
                } catch (e) {
                    Log.error("[GeoLeaf.Config] Error in onError:", e);
                }
            }
            throw err;
        });
}

const Config: ConfigInstance = {
    _config: {},
    _isLoaded: false,
    _subModulesInitialized: false,
    _source: null,
    _options: { autoEvent: true },

    init(options: ConfigInitOptions = {}): Promise<GeoLeafConfig> {
        this._options = {
            ...this._options,
            autoEvent:
                typeof options.autoEvent === "boolean"
                    ? options.autoEvent
                    : this._options.autoEvent,
        };
        if (options.config && typeof options.config === "object") {
            this._applyConfig(options.config as Record<string, unknown>, "inline");
            _applyProfileId(this._config, options.profileId);
            this._maybeFireLoadedEvent();
            _callOnLoaded(options, this._config, "inline");
            return Promise.resolve(this._config);
        }
        if (typeof options.url === "string" && options.url.length > 0) {
            return _initFromUrl(options, this);
        }
        this._applyConfig({}, "inline");
        _applyProfileId(this._config, options.profileId);
        this._maybeFireLoadedEvent();
        _callOnLoaded(options, this._config, "vide");
        return Promise.resolve(this._config);
    },

    _initSubModules(): void {
        if (this._subModulesInitialized) return;
        this._subModulesInitialized = true;

        const Storage = StorageHelper;
        const Taxonomy = TaxonomyManager;
        const Profile = ProfileManager;

        if (Storage?.init) Storage.init(this._config);
        if (Taxonomy?.init) Taxonomy.init(this._config);
        if (Profile?.init) Profile.init(this._config);
    },

    _applyConfig(cfg: Record<string, unknown> | null, source: string): void {
        if (typeof cfg !== "object" || cfg === null) {
            cfg = {};
        }

        this._validateConfig?.(cfg as GeoLeafConfig);

        const Storage = StorageHelper;
        if (Storage?.deepMerge) {
            this._config = Storage.deepMerge(
                this._config as Record<string, unknown>,
                cfg
            ) as GeoLeafConfig;
        } else {
            this._config = Object.assign({}, this._config, cfg) as GeoLeafConfig;
        }

        const Normalization = ConfigNormalizer;
        if (Array.isArray(this._config.poi) && Normalization) {
            this._config.poi = Normalization.normalizePoiArray(
                this._config.poi as Parameters<typeof Normalization.normalizePoiArray>[0]
            );
        }

        this._isLoaded = true;
        this._source = source || "inline";
        this._subModulesInitialized = false;
        this._initSubModules();

        try {
            _applyLoggingConfig(cfg, this._config);
        } catch (e) {
            Log.warn("[GeoLeaf.Config] Unable to apply log level from configuration:", e);
        }
    },

    isLoaded(): boolean {
        return this._isLoaded;
    },

    getSource(): string | null {
        return this._source;
    },

    _maybeFireLoadedEvent(): void {
        if (!this._options.autoEvent) return;
        if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;

        try {
            const event = new CustomEvent("geoleaf:config:loaded", {
                detail: { config: this._config, source: this._source },
            });
            document.dispatchEvent(event);
        } catch {
            try {
                const legacyEvent = document.createEvent("CustomEvent");
                (
                    legacyEvent as unknown as {
                        initCustomEvent: (a: string, b: boolean, c: boolean, d: unknown) => void;
                    }
                ).initCustomEvent("geoleaf:config:loaded", false, false, {
                    config: this._config,
                    source: this._source,
                });
                document.dispatchEvent(legacyEvent);
            } catch {
                Log.warn("[GeoLeaf.Config] Unable to dispatch geoleaf:config:loaded event.");
            }
        }
    },
};

export { Config };
