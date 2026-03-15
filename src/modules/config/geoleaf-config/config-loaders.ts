/*!
 * GeoLeaf Core – Config / Loaders
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../../log/index.js";
import { Config } from "./config-core.js";
import { ProfileLoader as ConfigLoader } from "../loader.js";
import { TaxonomyManager } from "../taxonomy.js";
import { ProfileManager } from "../profile.js";
import type { GeoLeafConfig, CategoryItem, LoadUrlOptions } from "./config-types.js";

interface ConfigWithLoaders {
    _config: GeoLeafConfig;
    _applyConfig(cfg: Record<string, unknown> | null, source: string): void;
    _maybeFireLoadedEvent(): void;
    loadUrl(url: string, options?: LoadUrlOptions): Promise<GeoLeafConfig>;
    loadTaxonomy(
        url: string | null,
        options?: LoadUrlOptions
    ): Promise<Record<string, CategoryItem>>;
    loadActiveProfileResources(options?: {
        headers?: Record<string, string>;
        strictContentType?: boolean;
    }): Promise<GeoLeafConfig>;
}

const C = Config as unknown as ConfigWithLoaders;

C.loadUrl = function (url: string, options: LoadUrlOptions = {}): Promise<GeoLeafConfig> {
    const Loader = ConfigLoader;
    if (!Loader) {
        Log.error("[GeoLeaf.Config] Loader module not available.");
        return Promise.reject(new Error("Loader module not available"));
    }
    return Loader.loadUrl(url, options)
        .then((jsonCfg) => {
            this._applyConfig(jsonCfg as Record<string, unknown>, "url");
            this._maybeFireLoadedEvent();
            return this._config;
        })
        .catch((err) => {
            Log.error("[GeoLeaf.Config] Error loading config:", err);
            return this._config;
        });
};

C.loadTaxonomy = function (
    url: string | null = null,
    options: LoadUrlOptions = {}
): Promise<Record<string, CategoryItem>> {
    const Taxonomy = TaxonomyManager;
    if (!Taxonomy) {
        Log.error("[GeoLeaf.Config] Taxonomy module not available.");
        return Promise.reject(new Error("Taxonomy module not available"));
    }
    return Taxonomy.loadTaxonomy(url, options);
};

C.loadActiveProfileResources = function (
    options: { headers?: Record<string, string>; strictContentType?: boolean } = {}
): Promise<GeoLeafConfig> {
    const Profile = ProfileManager;
    if (!Profile) {
        Log.error("[GeoLeaf.Config] Profile module not available.");
        return Promise.reject(new Error("Profile module not available"));
    }
    return Profile.loadActiveProfileResources(options);
};

export { Config };
