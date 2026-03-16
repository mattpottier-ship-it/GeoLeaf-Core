/**
 * @fileoverview Loadsur de profile modulaire pour GeoLeaf
 * @module config/profile-loader
 */

import { Log } from "../log/index.js";
import { ProfileLoader as ConfigLoader } from "./loader.js";
import type { LoadUrlOptions } from "./geoleaf-config/config-types.js";

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

function _extractRawLayers(layersFileData: Record<string, unknown> | null): unknown[] | null {
    if (!layersFileData) return null;
    if (Array.isArray((layersFileData as { layers?: unknown[] }).layers)) {
        return (layersFileData as { layers: unknown[] }).layers;
    }
    return Array.isArray(layersFileData) ? (layersFileData as unknown[]) : null;
}

const ProfileLoader = {
    /**
     * Loads and hydrates a modular GeoLeaf profile by fetching taxonomy, themes, layer files, and individual layer configs.
     * @param profile - The base profile object (Files or inline taxonomy/themes/layers properties).
     * @param baseUrl - Base URL for resolving relative file paths.
     * @param profileId - Identifier used for logging and the enriched profile metadata.
     * @param timestamp - Cache-busting timestamp appended to fetch URLs. Defaults to `Date.now()`.
     * @param fetchOptions - Optional fetch configuration (headers, strictContentType).
     * @returns The enriched profile record with resolved taxonomy, themes, and layer configs.
     */
    async loadModularProfile(
        profile: ProfileWithFiles,
        baseUrl: string,
        profileId: string,
        timestamp: number = Date.now(),
        fetchOptions: LoadUrlOptions = {}
    ): Promise<Record<string, unknown>> {
        if (!ConfigLoader) throw new Error("GeoLeaf._ConfigLoader not available");
        Log.info(`[ProfileLoader] ${profileId}`);
        try {
            const [taxonomyData, themesData, layersFileData] = await Promise.all([
                this._loadTaxonomy(profile, baseUrl, timestamp, fetchOptions),
                this._loadThemes(profile, baseUrl, timestamp, fetchOptions),
                this._loadLayersFile(profile, baseUrl, timestamp, fetchOptions),
            ]);
            const layersSource = _extractRawLayers(layersFileData) || profile.layers || [];
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
            Log.info("[ProfileLoader] ", {
                profileId,
                hasTaxonomy: !!enrichedProfile.taxonomy,
                hasThemes: !!enrichedProfile.themes,
                layersCount: (enrichedProfile.layers as unknown[] | undefined)?.length ?? 0,
            });
            return enrichedProfile;
        } catch (error) {
            Log.error("[ProfileLoader] Error loading modular profile:", error);
            throw error;
        }
    },

    /**
     * Fetches the taxonomy file or returns the inline taxonomy from the profile.
     * @param profile - The profile object.
     * @param baseUrl - Base URL for resolving the taxonomy file path.
     * @param timestamp - Cache-busting timestamp.
     * @param fetchOptions - Optional fetch configuration.
     * @returns The taxonomy record, or null if unavailable.
     */
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
                Log.info("[ProfileLoader] Taxonomy.json y");
                return taxonomy;
            } catch (err) {
                Log.warn("[ProfileLoader] Erronomy.json:", err);
                return null;
            }
        }
        return (profile.taxonomy as Record<string, unknown>) ?? null;
    },

    /**
     * Fetches the themes file or returns the inline themes from the profile.
     * @param profile - The profile object.
     * @param baseUrl - Base URL for resolving the themes file path.
     * @param timestamp - Cache-busting timestamp.
     * @param fetchOptions - Optional fetch configuration.
     * @returns The themes record, or null if unavailable.
     */
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
                return (
                    (await Loader.fetchJson(
                        `${baseUrl}/${themesFile}?t=${timestamp}`,
                        fetchOptions
                    )) ?? null
                );
            } catch (err) {
                Log.warn("[ProfileLoader] Errmes.json:", err);
                return null;
            }
        }
        return (profile.themes as Record<string, unknown>) ?? null;
    },

    /**
     * Fetches the layers index file defined in `profile.Files.layersFile`.
     * @param profile - The profile object.
     * @param baseUrl - Base URL for resolving the layers file path.
     * @param timestamp - Cache-busting timestamp.
     * @param fetchOptions - Optional fetch configuration.
     * @returns The layers file record, or null if no `layersFile` is defined.
     */
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
                return (
                    (await Loader.fetchJson(
                        `${baseUrl}/${layersFile}?t=${timestamp}`,
                        fetchOptions
                    )) ?? null
                );
            } catch (err) {
                Log.warn("[ProfileLoader] Errers.json:", err);
                return null;
            }
        }
        return null;
    },

    /**
     * Fetches individual layer configuration files for each layer reference.
     * @param layersSource - Array of layer references with optional `configFile` paths.
     * @param baseUrl - Base URL for resolving layer config file paths.
     * @param timestamp - Cache-busting timestamp.
     * @param fetchOptions - Optional fetch configuration.
     * @returns Array of layer config results with resolved config objects and layer directories.
     */
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
            const layerDirectory = layerRef.configFile.replace(/\/[^/]+$/, "");
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
                Log.error(`[ProfileLoader] Error loading ${layerRef.configFile}:`, err);
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

    /**
     * Assembles the final enriched profile from all fetched sub-resources.
     * @param params - Object containing the base profile, taxonomy, themes, layersSource, and layersConfigs.
     * @returns The enriched profile record with resolved layers, taxonomy, themes, and metadata.
     */
    _buildEnrichedProfile(params: EnrichedProfileParams): Record<string, unknown> {
        const { profile, baseUrl, profileId, taxonomy, themes, layersSource, layersConfigs } =
            params;
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
                            "geojson-default",
                    } as Record<string, unknown>;
                    const data = normalized.data as
                        | { file?: string; directory?: string }
                        | undefined;
                    if (data?.file && !normalized.dataFile) {
                        const dataDir = data.directory || "data";
                        normalized.dataFile = `${dataDir}/${data.file}`;
                    }
                    return normalized;
                }
                const original = (layersSource as LayerRef[]).find((l) => l.id === layerData.id);
                return original ?? { id: layerData.id, error: "Failed to load config" };
            });
        }
        return enrichedProfile;
    },

    /**
     * Determines whether a profile uses the modular format (has `Files` object or version ≥ 3).
     * @param profile - The profile object to inspect.
     * @returns `true` if the profile is modular, `false` otherwise.
     */
    isModularProfile(profile: unknown): boolean {
        if (!profile || typeof profile !== "object") return false;
        const p = profile as ProfileWithFiles;
        if (p.Files && typeof p.Files === "object") return true;
        if (p.version) {
            const versionMatch = String(p.version).match(/^(\d+)\.(\d+)/);
            if (versionMatch) return parseInt(versionMatch[1], 10) >= 3;
        }
        return false;
    },
};

export { ProfileLoader };
