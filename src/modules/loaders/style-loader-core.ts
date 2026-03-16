/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @fileoverview Core style loading and validation logic for GeoLeaf.
 * Extracted from style-loader.ts as part of Sprint 1 refactoring.
 * Fix included: loadStyleLenient no longer mutates the shared loaderConfig object.
 * @module loaders/style-loader-core
 */

"use strict";

import { Log } from "../log/index.js";
import { StyleValidator } from "../validators/style-validator.js";
import { styleCache } from "./style-cache.js";
import { extractLabelConfig, _ensureLabelVisibleByDefault } from "./label-extractor.js";

// Lazy access to Config (not yet ESM — migrated in B4)
const _gl: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * Internal loader configuration.
 */
const loaderConfig = {
    debug: false,
    validateOnLoad: true,
    throwOnValidationError: true,
};

function getProfilesBasePath(): string {
    const cfg = _gl.GeoLeaf && _gl.GeoLeaf.Config;
    if (cfg && typeof cfg.get === "function") {
        const configured = cfg.get("data.profilesBasePath", "profiles");
        if (typeof configured === "string" && configured.trim().length > 0) {
            return configured.endsWith("/") ? configured.slice(0, -1) : configured;
        }
    }
    return "profiles";
}

/**
 * Initializes the style loader with the GeoLeaf configuration.
 * @param {Object} config - GeoLeaf configuration (must contain { debug: boolean }).
 */
export function initStyleLoader(config: any = {}): void {
    loaderConfig.debug = config.debug === true;
    if (loaderConfig.debug) {
        if (Log) Log.debug("[StyleLoader] Debug mode enabled - cache disabled");
    }
}

async function _parseStyleJson(
    response: Response,
    stylePath: string,
    ctx: Record<string, unknown>
): Promise<any> {
    try {
        return await response.json();
    } catch (jsonError: any) {
        console.error("[StyleLoader] ❌ JSON parse error:", stylePath);
        console.error(
            "Context:",
            JSON.stringify({ ...ctx, parseError: jsonError.message }, null, 2)
        );
        console.error("Stack:", jsonError.stack);
        throw new Error(
            `Le fichier de style contient du JSON malformed: ${stylePath}\n` +
                `Erreur de parsing: ${jsonError.message}\n` +
                `Please check the JSON syntax of the file.`
        );
    }
}

/**
 * Validates the style data against the GeoLeaf schema.
 * @param lenient - When true, validation errors are logged but not thrown.
 */
function _applyStyleValidation(
    styleData: any,
    stylePath: string,
    params: Record<string, unknown>,
    lenient = false
): void {
    if (!loaderConfig.validateOnLoad) return;

    const validationResult = StyleValidator
        ? StyleValidator.validateStyle(styleData, params)
        : { valid: true, errors: [], warnings: [] };

    if (!validationResult.valid) {
        const errorMessage = StyleValidator
            ? StyleValidator.formatValidationErrors(validationResult, stylePath)
            : "Erreurs de validation";

        console.error(errorMessage);

        if (!lenient && loaderConfig.throwOnValidationError) {
            throw new Error(
                `Le fichier de style ne respecte pas le schema GeoLeaf: ${stylePath}\n` +
                    `Check the console for error details.`
            );
        }
    }

    if (validationResult.warnings.length > 0) {
        console.warn(
            `[StyleLoader] ${validationResult.warnings.length} warning(s) pour ${stylePath}:`
        );
        validationResult.warnings.forEach((warning: any) => {
            console.warn(`  - ${warning.field}: ${warning.message}`);
        });
    }
}

function _buildStyleResult(
    styleData: any,
    profileId: any,
    layerId: any,
    styleId: any,
    stylePath: string
) {
    const labelConfig = extractLabelConfig(styleData);
    return {
        styleData,
        labelConfig,
        metadata: {
            profileId,
            layerId,
            styleId,
            stylePath,
            hasIntegratedLabels: labelConfig !== null,
            loadedAt: new Date().toISOString(),
        },
    };
}

function _throwStyleLoadError(error: any, ctx: Record<string, unknown>): never {
    console.error("═══════════════════════════════════════════════════════");
    console.error("❌ ERREUR DE CHARGEMENT DE STYLE");
    console.error("═══════════════════════════════════════════════════════");
    console.error("Contexte:", JSON.stringify({ ...ctx, originalError: error.message }, null, 2));
    console.error("Stack trace:", error.stack);
    console.error("═══════════════════════════════════════════════════════");
    throw error;
}

/**
 * Loads and validates a style file.
 * @param {string} profileId - Profile ID.
 * @param {string} layerId - Layer ID.
 * @param {string} styleId - Style ID.
 * @param {string} styleFileName - Style file name (e.g. "default.json").
 * @param {string} layerDirectory - Layer directory (e.g. "layers/tourism_poi_all").
 * @param {boolean} [_lenient] - When true, validation errors are not thrown. Internal use only.
 * @returns {Promise<Object>} Loaded and validated style with extracted label config.
 * @throws {Error} If the file is invalid or not found (unless lenient).
 */
export async function loadAndValidateStyle(
    profileId: any,
    layerId: any,
    styleId: any,
    styleFileName: any,
    layerDirectory: any,
    _lenient = false
) {
    const cacheKey = `${profileId}:${layerId}:${styleId}`;
    if (!loaderConfig.debug && styleCache.has(cacheKey)) return styleCache.get(cacheKey);
    const profilesBasePath = getProfilesBasePath();
    const stylePath = `${profilesBasePath}/${profileId}/${layerDirectory}/styles/${styleFileName}`;
    try {
        const response = await fetch(stylePath);
        if (!response.ok)
            throw new Error(
                `Impossible de load le fichier de style: ${stylePath}\nHTTP ${response.status}: ${response.statusText}`
            );
        const styleData = await _parseStyleJson(response, stylePath, {
            profileId,
            layerId,
            styleId,
            stylePath,
            httpStatus: response.status,
        });
        _ensureLabelVisibleByDefault(styleData, stylePath);
        _applyStyleValidation(
            styleData,
            stylePath,
            { profileId, layerId, styleId, stylePath },
            _lenient
        );
        const result = _buildStyleResult(styleData, profileId, layerId, styleId, stylePath);
        if (!loaderConfig.debug) styleCache.set(cacheKey, result);
        return result;
    } catch (error: any) {
        if (error.message.includes("JSON malformed") || error.message.includes("GeoLeaf schema"))
            throw error;
        _throwStyleLoadError(error, { profileId, layerId, styleId, styleFileName, layerDirectory });
    }
}

/**
 * Loads a style with relaxed validation (no throw on validation error).
 * Used for cases where loading is desired even if validation fails.
 * @param {string} profileId
 * @param {string} layerId
 * @param {string} styleId
 * @param {string} styleFileName
 * @param {string} layerDirectory
 * @returns {Promise<Object>} Loaded style (may contain validation warnings).
 */
export async function loadStyleLenient(
    profileId: any,
    layerId: any,
    styleId: any,
    styleFileName: any,
    layerDirectory: any
) {
    return loadAndValidateStyle(profileId, layerId, styleId, styleFileName, layerDirectory, true);
}

/**
 * Preloads multiple styles in parallel.
 * @param {Array<Object>} styleConfigs - Array of { profileId, layerId, styleId, styleFileName, layerDirectory }.
 * @returns {Promise<Array<Object>>} Loading results.
 */
export async function preloadStyles(styleConfigs: any) {
    if (Log) Log.info(`[StyleLoader] Preloading ${styleConfigs.length} style(s)...`);
    const promises = styleConfigs.map((config: any) =>
        loadAndValidateStyle(
            config.profileId,
            config.layerId,
            config.styleId,
            config.styleFileName,
            config.layerDirectory
        ).catch((error) => ({
            error: true,
            message: error.message,
            config,
        }))
    );
    const results = await Promise.all(promises);
    const successCount = results.filter((r: any) => !r.error).length;
    const errorCount = results.filter((r: any) => r.error).length;
    if (Log)
        Log.info(
            `[StyleLoader] Preloading complete: ${successCount} success, ${errorCount} errors`
        );
    return results;
}

/**
 * Returns cache statistics.
 * @returns {Object} Statistics { size, keys, debug, cacheEnabled }.
 */
export function getCacheStats() {
    return {
        size: styleCache.size,
        keys: Array.from(styleCache.keys()),
        debug: loaderConfig.debug,
        cacheEnabled: !loaderConfig.debug,
    };
}
