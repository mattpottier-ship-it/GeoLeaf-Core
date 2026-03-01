/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import type { GeoLeafConfig } from "./geoleaf-config/config-types.js";

/**
 * Module Config.Storage
 *
 * Responsabilités :
 * - Stockage et gestion de la configuration consolidée
 * - API get/set avec chemins "a.b.c"
 * - Fusion profonde (deep merge)
 * - Helpers de navigation dans l'arbre de config
 */
const StorageModule: {
    _config: GeoLeafConfig | null;
    init(config: GeoLeafConfig): void;
    getAll(): GeoLeafConfig;
    get(path: string, defaultValue?: unknown): unknown;
    set(path: string, value: unknown): void;
    getSection(sectionName: string, defaultValue?: unknown): unknown;
    deepMerge(
        target: Record<string, unknown> | null,
        source: Record<string, unknown> | null
    ): Record<string, unknown>;
    getValueByPath(source: Record<string, unknown>, path: string): unknown;
    setValueByPath(target: Record<string, unknown>, path: string, value: unknown): void;
} = {
    _config: null,

    init(config: GeoLeafConfig): void {
        this._config = config;
    },

    getAll(): GeoLeafConfig {
        return (this._config || {}) as GeoLeafConfig;
    },

    get(path: string, defaultValue?: unknown): unknown {
        if (!this._config || !path || typeof path !== "string") {
            return defaultValue;
        }
        const result = this.getValueByPath(this._config as Record<string, unknown>, path);
        return result === undefined ? defaultValue : result;
    },

    set(path: string, value: unknown): void {
        if (!this._config) {
            Log.warn("[GeoLeaf.Config.Storage] Configuration non initialisée.");
            return;
        }
        if (!path || typeof path !== "string") {
            Log.warn("[GeoLeaf.Config.Storage] set() requiert un chemin string.");
            return;
        }
        const segments = path.split(".");
        let current: Record<string, unknown> = this._config as Record<string, unknown>;
        for (let i = 0; i < segments.length; i++) {
            const key = segments[i];
            if (i === segments.length - 1) {
                current[key] = value;
            } else {
                if (
                    !Object.prototype.hasOwnProperty.call(current, key) ||
                    typeof current[key] !== "object" ||
                    current[key] === null
                ) {
                    current[key] = {};
                }
                current = current[key] as Record<string, unknown>;
            }
        }
    },

    getSection(sectionName: string, defaultValue?: unknown): unknown {
        if (!sectionName) return defaultValue;
        const value = this.get(sectionName);
        return value === undefined ? defaultValue : value;
    },

    deepMerge(
        target: Record<string, unknown> | null,
        source: Record<string, unknown> | null
    ): Record<string, unknown> {
        const output = Object.assign({}, target || {});
        if (!source || typeof source !== "object") return output;
        Object.keys(source).forEach((key) => {
            const srcVal = source[key];
            const tgtVal = output[key];
            if (
                srcVal &&
                typeof srcVal === "object" &&
                !Array.isArray(srcVal) &&
                tgtVal &&
                typeof tgtVal === "object" &&
                !Array.isArray(tgtVal)
            ) {
                output[key] = this.deepMerge(
                    tgtVal as Record<string, unknown>,
                    srcVal as Record<string, unknown>
                );
            } else {
                output[key] = srcVal;
            }
        });
        return output;
    },

    getValueByPath(source: Record<string, unknown>, path: string): unknown {
        if (!source || !path) return undefined;
        const parts = path.split(".");
        let current: unknown = source;
        for (let i = 0; i < parts.length; i += 1) {
            if (current == null) return undefined;
            current = (current as Record<string, unknown>)[parts[i]];
        }
        return current;
    },

    setValueByPath(target: Record<string, unknown>, path: string, value: unknown): void {
        if (!target || !path) return;
        const parts = path.split(".");
        let current: Record<string, unknown> = target;
        for (let i = 0; i < parts.length - 1; i += 1) {
            const key = parts[i];
            if (!Object.prototype.hasOwnProperty.call(current, key) || current[key] == null) {
                current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
    },
};

const StorageHelper = StorageModule;
export { StorageHelper };
