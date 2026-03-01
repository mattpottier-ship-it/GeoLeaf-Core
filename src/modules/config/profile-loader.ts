/**
 * @fileoverview Chargeur de profil modulaire pour GeoLeaf
 * @module config/profile-loader
 */

import { Log } from '../log/index.js';
import { ProfileLoader as ConfigLoader } from './loader.js';
import type { LoadUrlOptions } from './geoleaf-config/config-types.js';

interface ProfileWithFiles {
    Files?: { taxonomyFile?: string; themesFile?: string; layersFile?: string };
    taxonomyFile?: string;
    themesFile?: string;
    taxonomy?: unknown;
    themes?: unknown;
    layers?: unknown[];
    version?: string;
    [key: string]: unknown;
}

interface LayerRef {
    id: string;
    configFile?: string;
    layerManagerId?: string;
}

interface LayerConfigResult {
    id: string;
    config: Record<string, unknown> | null;
    layerDirectory: string | null;
    layerManagerId: string | null;
}

interface EnrichedProfileParams {
    profile: ProfileWithFiles;
    baseUrl: string;
    profileId: string;
    taxonomy: Record<string, unknown> | null;
    themes: Record<string, unknown> | null;
    layersSource: unknown[];
    layersConfigs: LayerConfigResult[];
}

const ProfileLoader = {
    async loadModularProfile(
        profile: ProfileWithFiles,
        baseUrl: string,
        profileId: string,
        timestamp: number = Date.now(),
        fetchOptions: LoadUrlOptions = {}
    ): Promise<Record<string, unknown>> {
        const Loader = ConfigLoader;
        if (!Loader) throw new Error('GeoLeaf._ConfigLoader non disponible');
        Log.info(`[ProfileLoader] Chargement profil modulaire: ${profileId}`);
        try {
            const [taxonomyData, themesData, layersFileData] = await Promise.all([
                this._loadTaxonomy(profile, baseUrl, timestamp, fetchOptions),
                this._loadThemes(profile, baseUrl, timestamp, fetchOptions),
                this._loadLayersFile(profile, baseUrl, timestamp, fetchOptions),
            ]);
            const rawLayers =
                layersFileData && typeof layersFileData === 'object' && Array.isArray((layersFileData as { layers?: unknown[] }).layers)
                    ? (layersFileData as { layers: unknown[] }).layers
                    : Array.isArray(layersFileData)
                      ? layersFileData
                      : null;
            const layersSource = rawLayers || profile.layers || [];
            const layersConfigs = await this._loadLayerConfigs(
                layersSource as LayerRef[],
                baseUrl,
                timestamp,
                fetchOptions
            );
            const enrichedProfile = this._buildEnrichedProfile({
                profile,
                baseUrl,
                profileId,
                taxonomy: taxonomyData,
                themes: themesData,
                layersSource,
                layersConfigs,
            });
            Log.info('[ProfileLoader] Profil modulaire chargé avec succès', {
                profileId,
                hasTaxonomy: !!enrichedProfile.taxonomy,
                hasThemes: !!enrichedProfile.themes,
                layersCount: (enrichedProfile.layers as unknown[] | undefined)?.length ?? 0,
            });
            return enrichedProfile;
        } catch (error) {
            Log.error('[ProfileLoader] Erreur chargement profil modulaire:', error);
            throw error;
        }
    },

    async _loadTaxonomy(
        profile: ProfileWithFiles,
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<Record<string, unknown> | null> {
        const Loader = ConfigLoader;
        const taxonomyFile = profile.Files?.taxonomyFile ?? profile.taxonomyFile;
        if (!taxonomyFile && !profile.taxonomy) return null;
        if (taxonomyFile) {
            try {
                const taxonomy = await Loader.fetchJson(
                    `${baseUrl}/${taxonomyFile}?t=${timestamp}`,
                    fetchOptions
                );
                Log.info('[ProfileLoader] Taxonomy.json chargé avec succès');
                return taxonomy;
            } catch (err) {
                Log.warn('[ProfileLoader] Erreur chargement taxonomy.json:', err);
                return null;
            }
        }
        return (profile.taxonomy as Record<string, unknown>) ?? null;
    },

    async _loadThemes(
        profile: ProfileWithFiles,
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<Record<string, unknown> | null> {
        const Loader = ConfigLoader;
        const themesFile = profile.Files?.themesFile ?? profile.themesFile;
        if (themesFile) {
            try {
                return (await Loader.fetchJson(`${baseUrl}/${themesFile}?t=${timestamp}`, fetchOptions)) ?? null;
            } catch (err) {
                Log.warn('[ProfileLoader] Erreur chargement themes.json:', err);
                return null;
            }
        }
        return (profile.themes as Record<string, unknown>) ?? null;
    },

    async _loadLayersFile(
        profile: ProfileWithFiles,
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<Record<string, unknown> | null> {
        const Loader = ConfigLoader;
        const layersFile = profile.Files?.layersFile;
        if (layersFile) {
            try {
                return (await Loader.fetchJson(`${baseUrl}/${layersFile}?t=${timestamp}`, fetchOptions)) ?? null;
            } catch (err) {
                Log.warn('[ProfileLoader] Erreur chargement layers.json:', err);
                return null;
            }
        }
        return null;
    },

    async _loadLayerConfigs(
        layersSource: LayerRef[],
        baseUrl: string,
        timestamp: number,
        fetchOptions: LoadUrlOptions
    ): Promise<LayerConfigResult[]> {
        const Loader = ConfigLoader;
        if (!Array.isArray(layersSource) || layersSource.length === 0) return [];
        const promises = layersSource.map(async (layerRef) => {
            if (!layerRef.configFile) {
                return {
                    id: layerRef.id,
                    config: null,
                    layerDirectory: null,
                    layerManagerId: layerRef.layerManagerId ?? null,
                };
            }
            const layerDirectory = layerRef.configFile.replace(/\/[^/]+$/, '');
            try {
                const layerConfig = await Loader.fetchJson(
                    `${baseUrl}/${layerRef.configFile}?t=${timestamp}`,
                    fetchOptions
                );
                return {
                    id: layerRef.id,
                    config: layerConfig,
                    layerDirectory,
                    layerManagerId: layerRef.layerManagerId ?? null,
                };
            } catch (err) {
                Log.error(`[ProfileLoader] Erreur chargement ${layerRef.configFile}:`, err);
                return {
                    id: layerRef.id,
                    config: null,
                    layerDirectory,
                    layerManagerId: layerRef.layerManagerId ?? null,
                };
            }
        });
        return Promise.all(promises);
    },

    _buildEnrichedProfile(params: EnrichedProfileParams): Record<string, unknown> {
        const { profile, baseUrl, profileId, taxonomy, themes, layersSource, layersConfigs } = params;
        const enrichedProfile: Record<string, unknown> = { ...profile };
        enrichedProfile.basePath = baseUrl;
        enrichedProfile._profileId = profileId;
        if (taxonomy) enrichedProfile.taxonomy = taxonomy;
        if (themes) enrichedProfile.themes = themes;
        if (layersConfigs?.length > 0) {
            enrichedProfile.layers = layersConfigs.map((layerData) => {
                if (layerData.config) {
                    const normalized = {
                        ...layerData.config,
                        _layerDirectory: layerData.layerDirectory,
                        _profileId: profileId,
                        layerManagerId:
                            layerData.layerManagerId ||
                            (layerData.config.layerManagerId as string) ||
                            'geojson-default',
                    } as Record<string, unknown>;
                    const data = normalized.data as { file?: string; directory?: string } | undefined;
                    if (data?.file && !normalized.dataFile) {
                        const dataDir = data.directory || 'data';
                        normalized.dataFile = `${dataDir}/${data.file}`;
                    }
                    return normalized;
                }
                const original = (layersSource as LayerRef[]).find((l) => l.id === layerData.id);
                return original ?? { id: layerData.id, error: 'Failed to load config' };
            });
        }
        return enrichedProfile;
    },

    isModularProfile(profile: unknown): boolean {
        if (!profile || typeof profile !== 'object') return false;
        const p = profile as ProfileWithFiles;
        if (p.Files && typeof p.Files === 'object') return true;
        if (p.version) {
            const versionMatch = String(p.version).match(/^(\d+)\.(\d+)/);
            if (versionMatch) return parseInt(versionMatch[1], 10) >= 3;
        }
        return false;
    },
};

export { ProfileLoader };
