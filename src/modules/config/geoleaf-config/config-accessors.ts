/*!
 * GeoLeaf Core – Config / Accessors
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../../log/index.js";
import { Config } from "./config-core.js";
import { StorageHelper } from "../storage.js";
import { TaxonomyManager } from "../taxonomy.js";
import { ProfileManager } from "../profile.js";
import type { GeoLeafConfig } from "./config-types.js";
import type { CategoryItem } from "./config-types.js";

interface ConfigWithAccessors {
    _config: GeoLeafConfig;
    _isLoaded: boolean;
    _initSubModules(): void;
    getAll(): GeoLeafConfig;
    get<T = unknown>(path: string, defaultValue?: T): T;
    set(path: string, value: unknown): void;
    getSection(sectionName: string, defaultValue?: unknown): unknown;
    getCategories(): Record<string, CategoryItem>;
    getCategory(categoryId: string): CategoryItem | undefined;
    getSubcategory(categoryId: string, subCategoryId: string): CategoryItem | undefined;
    getActiveProfileId(): string | null;
    getActiveProfile(): Record<string, unknown> | null;
    getActiveProfilePoi(): unknown[];
    getActiveProfileRoutes(): unknown[];
    getActiveProfileMapping(): Record<string, unknown> | null;
    getIconsConfig(): Record<string, unknown> | null;
    isProfilePoiMappingEnabled(): boolean;
}

const C = Config as unknown as ConfigWithAccessors;

C.getAll = function (): GeoLeafConfig {
    if (!this._isLoaded) {
        this._initSubModules();
    }
    const Storage = StorageHelper;
    return (Storage?.getAll ? Storage.getAll() : this._config) as GeoLeafConfig;
};

C.get = function <T = unknown>(path: string, defaultValue?: T): T {
    if (!this._isLoaded) {
        this._initSubModules();
    }
    const Storage = StorageHelper;
    const value = Storage?.get ? Storage.get(path, defaultValue) : defaultValue;
    return value as T;
};

C.set = function (path: string, value: unknown): void {
    const Storage = StorageHelper;
    if (Storage?.set) {
        Storage.set(path, value);
    } else {
        Log.warn("[GeoLeaf.Config] Storage module unavailable for set().");
    }
};

C.getSection = function (sectionName: string, defaultValue?: unknown): unknown {
    const Storage = StorageHelper;
    return Storage?.getSection ? Storage.getSection(sectionName, defaultValue) : defaultValue;
};

C.getCategories = function (): Record<string, CategoryItem> {
    if (!this._isLoaded) {
        this._initSubModules();
    }
    const Taxonomy = TaxonomyManager;
    return Taxonomy?.getCategories ? Taxonomy.getCategories() : {};
};

C.getCategory = function (categoryId: string): CategoryItem | undefined {
    const Taxonomy = TaxonomyManager;
    return Taxonomy?.getCategory ? Taxonomy.getCategory(categoryId) : undefined;
};

C.getSubcategory = function (categoryId: string, subCategoryId: string): CategoryItem | undefined {
    const Taxonomy = TaxonomyManager;
    return Taxonomy?.getSubcategory
        ? Taxonomy.getSubcategory(categoryId, subCategoryId)
        : undefined;
};

C.getActiveProfileId = function (): string | null {
    const Profile = ProfileManager;
    return Profile?.getActiveProfileId ? Profile.getActiveProfileId() : null;
};

C.getActiveProfile = function (): Record<string, unknown> | null {
    const Profile = ProfileManager;
    return Profile?.getActiveProfile ? Profile.getActiveProfile() : null;
};

C.getActiveProfilePoi = function (): unknown[] {
    const Profile = ProfileManager;
    return Profile?.getActiveProfilePoi ? Profile.getActiveProfilePoi() : [];
};

C.getActiveProfileRoutes = function (): unknown[] {
    const Profile = ProfileManager;
    return Profile?.getActiveProfileRoutes ? Profile.getActiveProfileRoutes() : [];
};

C.getActiveProfileMapping = function (): Record<string, unknown> | null {
    const Profile = ProfileManager;
    return Profile?.getActiveProfileMapping ? Profile.getActiveProfileMapping() : null;
};

C.getIconsConfig = function (): Record<string, unknown> | null {
    const Profile = ProfileManager;
    return Profile?.getIconsConfig ? Profile.getIconsConfig() : null;
};

C.isProfilePoiMappingEnabled = function (): boolean {
    const Profile = ProfileManager;
    return Profile?.isProfilePoiMappingEnabled ? Profile.isProfilePoiMappingEnabled() : true;
};

export { Config };
