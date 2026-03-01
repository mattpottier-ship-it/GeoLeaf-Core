/*!
 * GeoLeaf Core – Config / Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from '../../log/index.js';
import { StorageHelper } from '../storage.js';
import { TaxonomyManager } from '../taxonomy.js';
import { ProfileManager } from '../profile.js';
import { ConfigNormalizer } from '../normalization.js';
import type { GeoLeafConfig, ConfigInitOptions } from './config-types.js';

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
                typeof options.autoEvent === 'boolean' ? options.autoEvent : this._options.autoEvent,
        };

        if (options.config && typeof options.config === 'object') {
            this._applyConfig(options.config as Record<string, unknown>, 'inline');

            if (typeof options.profileId === 'string' && options.profileId.length > 0) {
                if (!this._config.data) {
                    this._config.data = {};
                }
                this._config.data.activeProfile = options.profileId;
                Log.info('[GeoLeaf.Config] Profil actif changé vers:', options.profileId);
            }

            this._maybeFireLoadedEvent();

            if (typeof options.onLoaded === 'function') {
                try {
                    options.onLoaded(this._config);
                } catch (e) {
                    Log.error('[GeoLeaf.Config] Erreur dans onLoaded (inline) :', e);
                }
            }

            return Promise.resolve(this._config);
        }

        if (typeof options.url === 'string' && options.url.length > 0) {
            const loadOptions = {
                headers: options.headers,
                strictContentType:
                    typeof options.strictContentType === 'boolean' ? options.strictContentType : true,
            };

            const mappingUrl =
                typeof options.mappingUrl === 'string' && options.mappingUrl.length > 0
                    ? options.mappingUrl
                    : null;

            const mappingOptions = {
                headers: options.mappingHeaders || options.headers,
                strictContentType:
                    typeof options.mappingStrictContentType === 'boolean'
                        ? options.mappingStrictContentType
                        : loadOptions.strictContentType,
            };

            return (this as unknown as { loadUrl: (u: string, o: Record<string, unknown>) => Promise<GeoLeafConfig> })
                .loadUrl(options.url, loadOptions)
                .then((cfg) => {
                    if (typeof options.profileId === 'string' && options.profileId.length > 0) {
                        if (!cfg.data) cfg.data = {};
                        cfg.data.activeProfile = options.profileId;
                        this._config.data!.activeProfile = options.profileId;
                        Log.info('[GeoLeaf.Config] Profil actif changé vers:', options.profileId);
                    }
                    return cfg;
                })
                .then((cfg) => {
                    if (!mappingUrl) return cfg;
                    return (this as unknown as { loadTaxonomy: (u: string, o: Record<string, unknown>) => Promise<Record<string, unknown>> })
                        .loadTaxonomy(mappingUrl, mappingOptions)
                        .then(() => cfg)
                        .catch((err) => {
                            Log.warn(
                                '[GeoLeaf.Config] Échec du chargement du mapping catégories depuis ' +
                                    mappingUrl +
                                    ' (GeoLeaf continuera sans mapping dédié) :',
                                err
                            );
                            return cfg;
                        });
                })
                .then((cfg) => {
                    if (typeof options.onLoaded === 'function') {
                        try {
                            options.onLoaded(cfg);
                        } catch (e) {
                            Log.error('[GeoLeaf.Config] Erreur dans onLoaded (url+mapping) :', e);
                        }
                    }
                    return cfg;
                })
                .catch((err) => {
                    Log.error('[GeoLeaf.Config] Erreur init() avec url :', err);
                    if (typeof options.onError === 'function') {
                        try {
                            options.onError(err);
                        } catch (e) {
                            Log.error('[GeoLeaf.Config] Erreur dans onError :', e);
                        }
                    }
                    throw err;
                });
        }

        this._applyConfig({}, 'inline');

        if (typeof options.profileId === 'string' && options.profileId.length > 0) {
            if (!this._config.data) this._config.data = {};
            this._config.data.activeProfile = options.profileId;
            Log.info('[GeoLeaf.Config] Profil actif changé vers:', options.profileId);
        }

        this._maybeFireLoadedEvent();

        if (typeof options.onLoaded === 'function') {
            try {
                options.onLoaded(this._config);
            } catch (e) {
                Log.error('[GeoLeaf.Config] Erreur dans onLoaded (vide) :', e);
            }
        }

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
        if (typeof cfg !== 'object' || cfg === null) {
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
        this._source = source || 'inline';
        this._subModulesInitialized = false;
        this._initSubModules();

        try {
            const loggingCfg =
                (cfg && typeof cfg === 'object' && (cfg as GeoLeafConfig).logging
                    ? (cfg as GeoLeafConfig).logging
                    : this._config?.logging) ?? null;

            let level = loggingCfg?.level;
            let debugFlag = false;
            if (cfg && typeof (cfg as GeoLeafConfig).debug !== 'undefined') {
                debugFlag = !!(cfg as GeoLeafConfig).debug;
            } else if (this._config && typeof this._config.debug !== 'undefined') {
                debugFlag = !!this._config.debug;
            }

            if (!level) level = debugFlag ? 'debug' : 'info';

            if (level && Log?.setLevel) {
                Log.setLevel(level);
                Log.info(
                    '[GeoLeaf.Config] Niveau de log appliqué depuis la configuration :',
                    level,
                    '(debug:',
                    debugFlag,
                    ')'
                );
            }
        } catch (e) {
            Log.warn(
                '[GeoLeaf.Config] Impossible d\'appliquer le niveau de log depuis la configuration :',
                e
            );
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
        if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') return;

        try {
            const event = new CustomEvent('geoleaf:config:loaded', {
                detail: { config: this._config, source: this._source },
            });
            document.dispatchEvent(event);
        } catch {
            try {
                const legacyEvent = document.createEvent('CustomEvent');
                (legacyEvent as unknown as { initCustomEvent: (a: string, b: boolean, c: boolean, d: unknown) => void }).initCustomEvent(
                    'geoleaf:config:loaded',
                    false,
                    false,
                    { config: this._config, source: this._source }
                );
                document.dispatchEvent(legacyEvent);
            } catch {
                Log.warn("[GeoLeaf.Config] Impossible d'émettre l'événement geoleaf:config:loaded.");
            }
        }
    },
};

export { Config };
