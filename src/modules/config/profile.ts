/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from '../log/index.js';
import { ProfileLoader as ConfigLoader } from './loader.js';
import { ConfigNormalizer } from './normalization.js';
import { ProfileLoader as ModularProfileLoader } from './profile-loader.js';
import type { GeoLeafConfig, CategoryItem } from './geoleaf-config/config-types.js';
import type { LoadUrlOptions } from './geoleaf-config/config-types.js';

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
        if (!dataCfg || typeof dataCfg !== 'object') return true;
        if (typeof (dataCfg as Record<string, unknown>).enableProfilePoiMapping === 'boolean') {
            return (dataCfg as Record<string, unknown>).enableProfilePoiMapping as boolean;
        }
        if (typeof (dataCfg as Record<string, unknown>).useProfilePoiMapping === 'boolean') {
            return (dataCfg as Record<string, unknown>).useProfilePoiMapping as boolean;
        }
        if (typeof (dataCfg as Record<string, unknown>).useMapping === 'boolean') {
            return (dataCfg as Record<string, unknown>).useMapping as boolean;
        }
        return true;
    },

    loadActiveProfileResources(options: { headers?: Record<string, string>; strictContentType?: boolean } = {}): Promise<GeoLeafConfig> {
        const dataCfg = this._config?.data as Record<string, unknown> | undefined;
        if (!dataCfg || !dataCfg.activeProfile) {
            Log.info(
                '[GeoLeaf.Config.Profile] Aucun profil actif défini dans config.data.activeProfile ; aucun chargement de profil effectué.'
            );
            return Promise.resolve(this._config!);
        }

        const useLegacyProfileData =
            typeof dataCfg.useLegacyProfileData === 'boolean' ? dataCfg.useLegacyProfileData : false;

        const profileId = dataCfg.activeProfile as string;
        const basePath = (dataCfg.profilesBasePath as string) || 'data/profiles';
        const baseUrl = `${basePath}/${profileId}`;

        Log.info('[GeoLeaf.Config.Profile] Début du chargement du profil :', {
            profileId,
            baseUrl,
            configData: dataCfg,
        });

        const fetchOptions: LoadUrlOptions = {
            headers: options.headers ?? {},
            strictContentType:
                typeof options.strictContentType === 'boolean' ? options.strictContentType : true,
        };

        const Loader = ConfigLoader;
        const Normalization = ConfigNormalizer;

        if (!Loader || !Normalization) {
            Log.error('[GeoLeaf.Config.Profile] Modules Loader ou Normalization non disponibles.');
            return Promise.reject(new Error('Required modules not available'));
        }

        const isPoiMappingEnabled = this.isProfilePoiMappingEnabled();
        if (!isPoiMappingEnabled) {
            Log.info(
                '[GeoLeaf.Config.Profile] Mapping de POI désactivé via configuration globale ; ' +
                    'les POI du profil seront considérés comme déjà normalisés.'
            );
        }

        Log.info('[GeoLeaf.Config.Profile] Chargement des ressources du profil actif :', {
            profileId,
            baseUrl,
        });

        const timestamp = Date.now();

        if (useLegacyProfileData) {
            const mappingPromise = isPoiMappingEnabled
                ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions)
                : Promise.resolve(null);

            const routesPromise = Loader.fetchJson(`${baseUrl}/routes.json?t=${timestamp}`, fetchOptions).catch(
                () => {
                    Log.info(
                        '[GeoLeaf.Config.Profile] routes.json non disponible ou invalide, utilisation d\'un tableau vide.'
                    );
                    return [] as unknown;
                }
            );

            return Promise.all([
                Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions),
                Loader.fetchJson(`${baseUrl}/poi.json?t=${timestamp}`, fetchOptions),
                mappingPromise,
                routesPromise,
            ])
                .then(([profile, poi, mapping, routes]) => {
                    this._activeProfileId = profileId;
                    return this._finalizeProfileLoad({
                        profile: profile ?? null,
                        poi,
                        routes,
                        mapping: mapping ?? null,
                        mappingEnabled: isPoiMappingEnabled,
                    });
                })
                .catch((err) => {
                    Log.error(
                        '[GeoLeaf.Config.Profile] Erreur lors du chargement des ressources du profil actif :',
                        err
                    );
                    return this._config!;
                });
        }

        return Loader.fetchJson(`${baseUrl}/profile.json?t=${timestamp}`, fetchOptions)
            .then((profile): Promise<GeoLeafConfig | [Record<string, unknown> | null, Record<string, unknown> | null]> => {
                const isModular =
                    ModularProfileLoader && ModularProfileLoader.isModularProfile(profile);

                if (isModular) {
                    Log.info('[GeoLeaf.Config.Profile] Profil modulaire détecté - Chargement modulaire');
                    return this._loadModularProfile(
                        profile as Record<string, unknown>,
                        baseUrl,
                        timestamp,
                        fetchOptions
                    );
                }

                let requiresMapping = false;
                if (profile && Array.isArray((profile as Record<string, unknown>).layers)) {
                    requiresMapping = ((profile as Record<string, unknown>).layers as { normalized?: boolean }[]).some(
                        (layer) => layer.normalized === false
                    );
                }

                const mappingPromise =
                    isPoiMappingEnabled && requiresMapping
                        ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions).catch(
                              (err: Error) => {
                                  Log.error(
                                      '[GeoLeaf.Config.Profile] mapping.json requis (normalized:false) mais non trouvé ou invalide.',
                                      err
                                  );
                                  return null;
                              }
                          )
                        : Promise.resolve(null);

                return Promise.all([Promise.resolve(profile), mappingPromise]);
            })
            .then((result): GeoLeafConfig => {
                if (result && !Array.isArray(result)) {
                    return result as GeoLeafConfig;
                }

                const [profile, mapping] = result as unknown as [Record<string, unknown>, Record<string, unknown> | null];
                this._activeProfileId = profileId;
                this._activeProfile = profile || null;

                Log.info('[GeoLeaf.Config.Profile] Profil chargé (layers-only)', {
                    profileId,
                    profileLoaded: !!profile,
                    profileKeys: profile ? Object.keys(profile) : [],
                });

                this._activeProfileData = {
                    poi: [],
                    routes: [],
                    mapping: mapping && typeof mapping === 'object' ? mapping : null,
                };

                const profileObj = profile as { taxonomy?: { categories?: Record<string, CategoryItem> } };
                if (
                    profileObj?.taxonomy?.categories &&
                    typeof profileObj.taxonomy.categories === 'object' &&
                    !Array.isArray(profileObj.taxonomy.categories)
                ) {
                    this._config!.categories = profileObj.taxonomy.categories;
                    Log.info('[GeoLeaf.Config.Profile] Taxonomie des catégories chargée (layers-only).', {
                        profileId,
                        categoriesCount: Object.keys(profileObj.taxonomy.categories || {}).length,
                    });
                }

                if (
                    !this._config!.profiles ||
                    typeof this._config!.profiles !== 'object' ||
                    Array.isArray(this._config!.profiles)
                ) {
                    (this._config as Record<string, unknown>).profiles = {};
                }

                const profiles = (this._config as Record<string, unknown>).profiles as Record<string, ProfileDataPayload>;
                profiles[profileId] = {
                    profile: this._activeProfile,
                    poi: this._activeProfileData.poi,
                    routes: this._activeProfileData.routes,
                    mapping: this._activeProfileData.mapping,
                };

                this._fireProfileLoadedEvent(profileId, {
                    profile: this._activeProfile,
                    poi: this._activeProfileData.poi,
                    routes: this._activeProfileData.routes,
                    mapping: this._activeProfileData.mapping,
                });

                return this._config!;
            })
            .catch((err) => {
                Log.error(
                    '[GeoLeaf.Config.Profile] Erreur lors du chargement des ressources du profil actif :',
                    err
                );
                return this._config!;
            });
    },

    _loadModularProfile(
        profile: Record<string, unknown>,
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<GeoLeafConfig> {
        const profileId = this._config!.data?.activeProfile as string;

        if (!ModularProfileLoader) {
            Log.error('[GeoLeaf.Config.Profile] ProfileLoader non disponible');
            return Promise.reject(new Error('ProfileLoader non disponible'));
        }

        return ModularProfileLoader.loadModularProfile(
            profile,
            baseUrl,
            profileId,
            timestamp,
            fetchOptions
        ).then((enrichedProfile) => {
            this._activeProfileId = profileId;
            this._activeProfile = enrichedProfile;

            Log.info('[GeoLeaf.Config.Profile] Profil modulaire chargé avec succès', {
                profileId,
                hasTaxonomy: !!enrichedProfile.taxonomy,
                hasThemes: !!enrichedProfile.themes,
                layersCount: (enrichedProfile.layers as unknown[] | undefined)?.length ?? 0,
            });

            this._activeProfileData = {
                poi: [],
                routes: [],
                mapping: null,
            };

            const enriched = enrichedProfile as { taxonomy?: { categories?: Record<string, CategoryItem> } };
            if (enriched.taxonomy?.categories) {
                this._config!.categories = enriched.taxonomy.categories;
                Log.info('[GeoLeaf.Config.Profile] Taxonomie chargée depuis profil modulaire', {
                    categoriesCount: Object.keys(enriched.taxonomy.categories || {}).length,
                });
            }

            Object.keys(enrichedProfile).forEach((key) => {
                if (key !== 'layers' && key !== 'taxonomy' && key !== 'themes') {
                    (this._config as Record<string, unknown>)[key] = enrichedProfile[key];
                }
            });

            if (
                !this._config!.profiles ||
                typeof this._config!.profiles !== 'object' ||
                Array.isArray(this._config!.profiles)
            ) {
                (this._config as Record<string, unknown>).profiles = {};
            }

            const profiles = this._config!.profiles as Record<string, ProfileDataPayload>;
            profiles[profileId] = {
                profile: this._activeProfile,
                poi: [],
                routes: [],
                mapping: null,
            };

            this._fireProfileLoadedEvent(profileId, {
                profile: this._activeProfile,
                poi: [],
                routes: [],
                mapping: null,
            });

            return enrichedProfile as unknown as GeoLeafConfig;
        });
    },

    _finalizeProfileLoad(params: FinalizeProfileLoadParams): GeoLeafConfig {
        const Normalization = ConfigNormalizer;
        const { profile, poi, routes, mapping, mappingEnabled } = params;

        this._activeProfile = profile || null;

        Log.info('[GeoLeaf.Config.Profile] Profil chargé depuis profile.json :', {
            profileId: this._activeProfileId,
            profileLoaded: profile !== null && profile !== undefined,
            profileKeys: profile ? Object.keys(profile) : [],
        });

        const mappingForNormalization =
            mappingEnabled && mapping && typeof mapping === 'object' ? mapping : null;

        const structurallyNormalizedPoi = Array.isArray(poi)
            ? Normalization.normalizePoiWithMapping(poi, mappingForNormalization)
            : [];

        const normalizedPoi = Normalization.normalizePoiArray(structurallyNormalizedPoi);
        const safeMapping = mappingForNormalization;
        const safeRoutes = Array.isArray(routes) ? routes : [];

        this._activeProfileData = {
            poi: normalizedPoi,
            mapping: safeMapping,
            routes: safeRoutes,
        };

        if (normalizedPoi.length) {
            this._config!.poi = normalizedPoi;
        }
        if (safeRoutes.length) {
            this._config!.routes = safeRoutes;
        }

        const profileObj = profile as { taxonomy?: { categories?: Record<string, CategoryItem> } } | null;
        if (
            profileObj?.taxonomy?.categories &&
            typeof profileObj.taxonomy.categories === 'object' &&
            !Array.isArray(profileObj.taxonomy.categories)
        ) {
            this._config!.categories = profileObj.taxonomy.categories;
            Log.info('[GeoLeaf.Config.Profile] Taxonomie des catégories chargée depuis le profil actif.', {
                profileId: this._activeProfileId,
                categoriesCount: Object.keys(profileObj.taxonomy.categories || {}).length,
            });
        }

        if (
            !this._config!.profiles ||
            typeof this._config!.profiles !== 'object' ||
            Array.isArray(this._config!.profiles)
        ) {
            (this._config as Record<string, unknown>).profiles = {};
        }

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
        if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') return;

        try {
            const event = new CustomEvent('geoleaf:profile:loaded', {
                detail: { profileId, data: payload },
            });
            document.dispatchEvent(event);
        } catch {
            try {
                const legacyEvent = document.createEvent('CustomEvent');
                (legacyEvent as unknown as { initCustomEvent: (a: string, b: boolean, c: boolean, d: unknown) => void }).initCustomEvent(
                    'geoleaf:profile:loaded',
                    false,
                    false,
                    { profileId, data: payload }
                );
                document.dispatchEvent(legacyEvent);
            } catch {
                Log.warn("[GeoLeaf.Config.Profile] Impossible d'émettre l'événement geoleaf:profile:loaded.");
            }
        }
    },
};

const ProfileManager = ProfileModule;
export { ProfileManager };
