/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { ProfileLoader as ConfigLoader } from "./loader.js";
import { ConfigNormalizer } from "./normalization.js";
import { ProfileLoader as ModularProfileLoader } from "./profile-loader.js";
import type { GeoLeafConfig, CategoryItem } from "./geoleaf-config/config-types.js";
import type { LoadUrlOptions } from "./geoleaf-config/config-types.js";

interface ProfileDataPayload {
    profile: Record<string, unknown> | null;
    poi: unknown[];
    routes: unknown[];
    mapping: Record<string, unknown> | null;
}

interface FinalizeProfileLoadParams {
    profile: Record<string, unknown> | null;
    poi: unknown;
    routes: unknown;
    mapping: Record<string, unknown> | null;
    mappingEnabled: boolean;
}

function _resolveMappingForNormalization(
    mappingEnabled: boolean,
    mapping: Record<string, unknown> | null
): Record<string, unknown> | null {
    if (mappingEnabled && mapping && typeof mapping === "object") return mapping;
    return null;
}

function _applyTaxonomyCategories(
    config: GeoLeafConfig,
    profile: Record<string, unknown> | null,
    activeProfileId: string | null
): void {
    const profileObj = profile as {
        taxonomy?: { categories?: Record<string, CategoryItem> };
    } | null;
    const cats = profileObj?.taxonomy?.categories;
    if (!cats || typeof cats !== "object" || Array.isArray(cats)) return;
    config.categories = cats;
    Log.info("[GeoLeaf.Config.Profile] Category taxonomy loaded from active profile.", {
        profileId: activeProfileId,
        categoriesCount: Object.keys(cats).length,
    });
}

function _ensureProfilesMap(config: GeoLeafConfig): void {
    if (!config.profiles || typeof config.profiles !== "object" || Array.isArray(config.profiles)) {
        (config as Record<string, unknown>).profiles = {};
    }
}

function _buildFetchOptions(options: {
    headers?: Record<string, string>;
    strictContentType?: boolean;
}): LoadUrlOptions {
    return {
        headers: options.headers ?? {},
        strictContentType:
            typeof options.strictContentType === "boolean" ? options.strictContentType : true,
    };
}

function _buildLegacyProfilePromise(
    Loader: typeof ConfigLoader,
    baseUrl: string,
    timestamp: number,
    fetchOptions: LoadUrlOptions,
    isPoiMappingEnabled: boolean,
    self: typeof ProfileModule
): Promise<GeoLeafConfig> {
    const profileId = self._activeProfileId!;
    const mappingPromise = isPoiMappingEnabled
        ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions)
        : Promise.resolve(null);

    const routesPromise = Loader.fetchJson(
        `${baseUrl}/routes.json?t=${timestamp}`,
        fetchOptions
    ).catch(() => {
        Log.info(
            "[GeoLeaf.Config.Profile] routes.json not available or invalid, using an empty array."
        );
        return [] as unknown;
    });

    return Promise.all([
        Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions),
        Loader.fetchJson(`${baseUrl}/poi.json?t=${timestamp}`, fetchOptions),
        mappingPromise,
        routesPromise,
    ])
        .then(([profile, poi, mapping, routes]) => {
            self._activeProfileId = profileId;
            return self._finalizeProfileLoad({
                profile: profile ?? null,
                poi,
                routes,
                mapping: mapping ?? null,
                mappingEnabled: isPoiMappingEnabled,
            });
        })
        .catch((err) => {
            Log.error("[GeoLeaf.Config.Profile] Error loading active profile resources:", err);
            return self._config!;
        });
}

type ProfileFetchResult =
    | GeoLeafConfig
    | [Record<string, unknown> | null, Record<string, unknown> | null];

function _resolveProfileStep1(
    profile: Record<string, unknown> | null,
    isPoiMappingEnabled: boolean,
    Loader: typeof ConfigLoader,
    baseUrl: string,
    timestamp: number,
    fetchOptions: LoadUrlOptions,
    self: typeof ProfileModule
): Promise<ProfileFetchResult> {
    const isModular = ModularProfileLoader && ModularProfileLoader.isModularProfile(profile);
    if (isModular) {
        Log.info("[GeoLeaf.Config.Profile] Modular profile detected - modular loading");
        return self._loadModularProfile(
            profile as Record<string, unknown>,
            baseUrl,
            timestamp,
            fetchOptions
        );
    }
    let requiresMapping = false;
    if (profile && Array.isArray((profile as Record<string, unknown>).layers)) {
        requiresMapping = (
            (profile as Record<string, unknown>).layers as { normalized?: boolean }[]
        ).some((layer) => layer.normalized === false);
    }
    const mappingPromise =
        isPoiMappingEnabled && requiresMapping
            ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions).catch(
                  (err: Error) => {
                      Log.error(
                          "[GeoLeaf.Config.Profile] mapping.json required (normalized:false) but not found or invalid.",
                          err
                      );
                      return null;
                  }
              )
            : Promise.resolve(null);
    return Promise.all([Promise.resolve(profile), mappingPromise]);
}

function _resolveProfileStep2(
    result: ProfileFetchResult,
    profileId: string,
    self: typeof ProfileModule
): GeoLeafConfig {
    if (result && !Array.isArray(result)) return result as GeoLeafConfig;
    const [profile, mapping] = result as unknown as [
        Record<string, unknown>,
        Record<string, unknown> | null,
    ];
    self._activeProfileId = profileId;
    self._activeProfile = profile ?? null;
    Log.info("[GeoLeaf.Config.Profile] Profile loaded (layers-only)", {
        profileId,
        profileLoaded: !!profile,
        profileKeys: profile ? Object.keys(profile) : [],
    });
    self._activeProfileData = {
        poi: [],
        routes: [],
        mapping: _resolveMappingForNormalization(true, mapping ?? null),
    };
    _applyTaxonomyCategories(self._config!, profile, profileId);
    _ensureProfilesMap(self._config!);
    const profiles = (self._config as Record<string, unknown>).profiles as Record<
        string,
        ProfileDataPayload
    >;
    profiles[profileId] = {
        profile: self._activeProfile,
        poi: self._activeProfileData.poi,
        routes: self._activeProfileData.routes,
        mapping: self._activeProfileData.mapping,
    };
    self._fireProfileLoadedEvent(profileId, {
        profile: self._activeProfile,
        poi: self._activeProfileData.poi,
        routes: self._activeProfileData.routes,
        mapping: self._activeProfileData.mapping,
    });
    return self._config!;
}

function _fetchAndResolveProfile(
    Loader: typeof ConfigLoader,
    baseUrl: string,
    timestamp: number,
    fetchOptions: LoadUrlOptions,
    isPoiMappingEnabled: boolean,
    self: typeof ProfileModule
): Promise<GeoLeafConfig> {
    const profileId = self._config!.data?.activeProfile as string;
    return Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions)
        .then((profile) =>
            _resolveProfileStep1(
                profile,
                isPoiMappingEnabled,
                Loader,
                baseUrl,
                timestamp,
                fetchOptions,
                self
            )
        )
        .then((result) => _resolveProfileStep2(result as ProfileFetchResult, profileId, self))
        .catch((err) => {
            Log.error("[GeoLeaf.Config.Profile] Error loading active profile resources:", err);
            return self._config!;
        });
}

function _applyModularEnrichedProfile(
    enrichedProfile: Record<string, unknown>,
    profileId: string,
    self: typeof ProfileModule
): GeoLeafConfig {
    self._activeProfileId = profileId;
    self._activeProfile = enrichedProfile;
    Log.info("[GeoLeaf.Config.Profile] Modular profile loaded successfully", {
        profileId,
        hasTaxonomy: !!(enrichedProfile as Record<string, unknown>).taxonomy,
        hasThemes: !!(enrichedProfile as Record<string, unknown>).themes,
        layersCount: (enrichedProfile.layers as unknown[] | undefined)?.length ?? 0,
    });
    self._activeProfileData = { poi: [], routes: [], mapping: null };
    const enriched = enrichedProfile as {
        taxonomy?: { categories?: Record<string, CategoryItem> };
    };
    if (enriched.taxonomy?.categories) {
        self._config!.categories = enriched.taxonomy.categories;
        Log.info("[GeoLeaf.Config.Profile] Taxonomy loaded from modular profile", {
            categoriesCount: Object.keys(enriched.taxonomy.categories || {}).length,
        });
    }
    Object.keys(enrichedProfile).forEach((key) => {
        if (key !== "layers" && key !== "taxonomy" && key !== "themes")
            (self._config as Record<string, unknown>)[key] = enrichedProfile[key];
    });
    _ensureProfilesMap(self._config!);
    const profiles = self._config!.profiles as Record<string, ProfileDataPayload>;
    profiles[profileId] = { profile: self._activeProfile, poi: [], routes: [], mapping: null };
    self._fireProfileLoadedEvent(profileId, {
        profile: self._activeProfile,
        poi: [],
        routes: [],
        mapping: null,
    });
    return enrichedProfile as unknown as GeoLeafConfig;
}

function _buildProfileDispatchArgs(
    dataCfg: Record<string, unknown>,
    options: { headers?: Record<string, string>; strictContentType?: boolean }
) {
    const useLegacyProfileData =
        typeof dataCfg.useLegacyProfileData === "boolean" ? dataCfg.useLegacyProfileData : false;
    const profileId = dataCfg.activeProfile as string;
    const basePath = (dataCfg.profilesBasePath as string) ?? "data/profiles";
    const baseUrl = `${basePath}/${profileId}`;
    Log.info("[GeoLeaf.Config.Profile] Starting profile load:", {
        profileId,
        baseUrl,
        configData: dataCfg,
    });
    return { useLegacyProfileData, profileId, baseUrl, fetchOptions: _buildFetchOptions(options) };
}

const ProfileModule = {
    _config: null as GeoLeafConfig | null,
    _activeProfileId: null as string | null,
    _activeProfile: null as Record<string, unknown> | null,
    _activeProfileData: {
        poi: [] as unknown[],
        routes: [] as unknown[],
        mapping: null as Record<string, unknown> | null,
    },

    init(config: GeoLeafConfig): void {
        this._config = config;
    },

    isProfilePoiMappingEnabled(): boolean {
        const dataCfg = this._config?.data;
        if (!dataCfg || typeof dataCfg !== "object") return true;
        if (typeof (dataCfg as Record<string, unknown>).enableProfilePoiMapping === "boolean") {
            return (dataCfg as Record<string, unknown>).enableProfilePoiMapping as boolean;
        }
        if (typeof (dataCfg as Record<string, unknown>).useProfilePoiMapping === "boolean") {
            return (dataCfg as Record<string, unknown>).useProfilePoiMapping as boolean;
        }
        if (typeof (dataCfg as Record<string, unknown>).useMapping === "boolean") {
            return (dataCfg as Record<string, unknown>).useMapping as boolean;
        }
        return true;
    },

    loadActiveProfileResources(
        options: { headers?: Record<string, string>; strictContentType?: boolean } = {}
    ): Promise<GeoLeafConfig> {
        const dataCfg = this._config?.data as Record<string, unknown> | undefined;
        if (!dataCfg || !dataCfg.activeProfile) {
            Log.info(
                "[GeoLeaf.Config.Profile] No active profile defined in config.data.activeProfile; no profile loading performed."
            );
            return Promise.resolve(this._config!);
        }
        const { useLegacyProfileData, profileId, baseUrl, fetchOptions } =
            _buildProfileDispatchArgs(dataCfg, options);
        const Loader = ConfigLoader;
        const Normalization = ConfigNormalizer;
        if (!Loader || !Normalization) {
            Log.error("[GeoLeaf.Config.Profile] Loader or Normalization modules not available.");
            return Promise.reject(new Error("Required modules not available"));
        }
        const isPoiMappingEnabled = this.isProfilePoiMappingEnabled();
        if (!isPoiMappingEnabled)
            Log.info(
                "[GeoLeaf.Config.Profile] POI mapping disabled via global configuration; profile POIs will be considered already normalized."
            );
        Log.info("[GeoLeaf.Config.Profile] Loading active profile resources:", {
            profileId,
            baseUrl,
        });
        const timestamp = Date.now();
        if (useLegacyProfileData) {
            this._activeProfileId = profileId;
            return _buildLegacyProfilePromise(
                Loader,
                baseUrl,
                timestamp,
                fetchOptions,
                isPoiMappingEnabled,
                this
            );
        }
        return _fetchAndResolveProfile(
            Loader,
            baseUrl,
            timestamp,
            fetchOptions,
            isPoiMappingEnabled,
            this
        );
    },

    _loadModularProfile(
        profile: Record<string, unknown>,
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<GeoLeafConfig> {
        const profileId = this._config!.data?.activeProfile as string;
        if (!ModularProfileLoader) {
            Log.error("[GeoLeaf.Config.Profile] ProfileLoader not available");
            return Promise.reject(new Error("ProfileLoader non disponible"));
        }
        return ModularProfileLoader.loadModularProfile(
            profile,
            baseUrl,
            profileId,
            timestamp,
            fetchOptions
        ).then((enrichedProfile) => _applyModularEnrichedProfile(enrichedProfile, profileId, this));
    },

    _finalizeProfileLoad(params: FinalizeProfileLoadParams): GeoLeafConfig {
        const Normalization = ConfigNormalizer;
        const { profile, poi, routes, mapping, mappingEnabled } = params;

        this._activeProfile = profile ?? null;

        Log.info("[GeoLeaf.Config.Profile] Profile loaded from profile.json:", {
            profileId: this._activeProfileId,
            profileLoaded: profile != null,
            profileKeys: profile ? Object.keys(profile) : [],
        });

        const mappingForNormalization = _resolveMappingForNormalization(mappingEnabled, mapping);

        const structurallyNormalizedPoi = Array.isArray(poi)
            ? Normalization.normalizePoiWithMapping(poi, mappingForNormalization)
            : [];

        const normalizedPoi = Normalization.normalizePoiArray(structurallyNormalizedPoi);
        const safeRoutes = Array.isArray(routes) ? routes : [];

        this._activeProfileData = {
            poi: normalizedPoi,
            mapping: mappingForNormalization,
            routes: safeRoutes,
        };

        if (normalizedPoi.length) {
            this._config!.poi = normalizedPoi;
        }
        if (safeRoutes.length) {
            this._config!.routes = safeRoutes;
        }

        _applyTaxonomyCategories(this._config!, profile, this._activeProfileId);
        _ensureProfilesMap(this._config!);

        const profiles = this._config!.profiles as Record<string, ProfileDataPayload>;
        profiles[this._activeProfileId!] = {
            profile: this._activeProfile,
            poi: this._activeProfileData.poi,
            routes: this._activeProfileData.routes,
            mapping: this._activeProfileData.mapping,
        };

        this._fireProfileLoadedEvent(this._activeProfileId!, {
            profile: this._activeProfile,
            poi: this._activeProfileData.poi,
            routes: this._activeProfileData.routes,
            mapping: this._activeProfileData.mapping,
        });

        return this._config!;
    },

    getActiveProfileId(): string | null {
        return this._activeProfileId;
    },

    getActiveProfile(): Record<string, unknown> | null {
        return this._activeProfile;
    },

    getActiveProfilePoi(): unknown[] {
        return this._activeProfileData?.poi && Array.isArray(this._activeProfileData.poi)
            ? this._activeProfileData.poi
            : [];
    },

    getActiveProfileRoutes(): unknown[] {
        return this._activeProfileData?.routes && Array.isArray(this._activeProfileData.routes)
            ? this._activeProfileData.routes
            : [];
    },

    getActiveProfileMapping(): Record<string, unknown> | null {
        return this._activeProfileData?.mapping ?? null;
    },

    getIconsConfig(): Record<string, unknown> | null {
        const p = this._activeProfile as { taxonomy?: { icons?: Record<string, unknown> } } | null;
        return p?.taxonomy?.icons ?? null;
    },

    getActiveProfileLayersConfig(): unknown[] | null {
        const p = this._activeProfile as { layers?: unknown[] } | null;
        return p?.layers ?? null;
    },

    _fireProfileLoadedEvent(profileId: string, payload: ProfileDataPayload): void {
        if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;

        try {
            const event = new CustomEvent("geoleaf:profile:loaded", {
                detail: { profileId, data: payload },
            });
            document.dispatchEvent(event);
        } catch {
            try {
                const legacyEvent = document.createEvent("CustomEvent");
                (
                    legacyEvent as unknown as {
                        initCustomEvent: (a: string, b: boolean, c: boolean, d: unknown) => void;
                    }
                ).initCustomEvent("geoleaf:profile:loaded", false, false, {
                    profileId,
                    data: payload,
                });
                document.dispatchEvent(legacyEvent);
            } catch {
                Log.warn(
                    "[GeoLeaf.Config.Profile] Unable to dispatch geoleaf:profile:loaded event."
                );
            }
        }
    },
};

const ProfileManager = ProfileModule;
export { ProfileManager };
