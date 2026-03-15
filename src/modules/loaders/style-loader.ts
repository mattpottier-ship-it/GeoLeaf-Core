/*!















 * GeoLeaf Core















 * © 2026 Mattieu Pottier















 * Released under the MIT License















 * https://geoleaf.dev















 */

/**















 * @fileoverview Loadsur centralized de styles GeoLeaf















 * Manages the loading, la validation et le cache des files style.json















 * Supporte les labels integrateds et la detection automatic















 * @module loaders/style-loader















 */

"use strict";

import { Log } from "../log/index.js";

import { StyleValidator } from "../validators/style-validator.js";

// Lazy access to Config (not yet ESM — migrated in B4)

const _gl: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**















 * Cache en memory des styles loadeds















 * Key: "profileId:layerId:styleId"















 * Value: { styleData, labelConfig, timestamp }















 */

const styleCache = new Map();

/**















 * Helper to get Log instance lazily















 * @returns {Object|null}















 */

function _getLog() {
    return Log || null;
}

/**















 * Configuration du loader















 */

const loaderConfig = {
    debug: false,

    validateOnLoad: true,

    throwOnValidationError: true,
};

function getProfilesBasePath() {
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















 * Initializes le style loader with the configuration GeoLeaf















 * @param {Object} config - Configuration GeoLeaf (doit contenir { debug: boolean })















 */

function initStyleLoader(config: any = {}) {
    loaderConfig.debug = config.debug === true;

    if (loaderConfig.debug) {
        const Log = _getLog();

        if (Log) Log.debug("[StyleLoader] Debug mode enabled - cache disabled");
    }
}

/**















 * Loads et valide un file de style















 * @param {string} profileId - ID of the profile















 * @param {string} layerId - ID de the layer















 * @param {string} styleId - ID du style















 * @param {string} styleFileName - Nom du file de style (ex: "default.json")















 * @param {string} layerDirectory - Directory de the layer (ex: "layers/tourism_poi_all")















 * @returns {Promise<Object>} Style loaded et validated with thebels extraits















 * @throws {Error} If the file est invalid ou not found















 */

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

function _ensureLabelVisibleByDefault(styleData: any, stylePath: string): void {
    if (styleData.label && styleData.label.enabled === true) {
        if (styleData.label.visibleByDefault === undefined) {
            styleData.label.visibleByDefault = false;

            console.warn(
                `[StyleLoader] "visibleByDefault" manquant: ${stylePath}\nFallback applied: visibleByDefault = false`
            );
        }
    }
}

function _applyStyleValidation(
    styleData: any,
    stylePath: string,
    params: Record<string, unknown>
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

        if (loaderConfig.throwOnValidationError) {
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

async function loadAndValidateStyle(
    profileId: any,
    layerId: any,
    styleId: any,
    styleFileName: any,
    layerDirectory: any
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
        _applyStyleValidation(styleData, stylePath, { profileId, layerId, styleId, stylePath });
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















 * Extrait la configuration de labels from un style loaded















 * Detects automaticment si les labels sont integrateds in the style















 * @param {Object} styleData - Data du style















 * @returns {Object|null} Configuration de labels ou null si absents/deactivateds















 */

function extractLabelConfig(styleData: any) {
    if (!styleData || typeof styleData !== "object") {
        return null;
    }

    // Check si le field label est an object de configuration

    if (styleData.label && typeof styleData.label === "object" && styleData.label !== null) {
        // Check que enabled est true

        if (styleData.label.enabled === true) {
            return {
                ...styleData.label,

                isIntegrated: true,
            };
        }
    }

    // Pas de labels integrateds ou deactivateds

    return null;
}

/**















 * Loads a style avec gestion simplified (sans validation stricte)















 * Used for cases where loading is desired even if validation fails















 * @param {string} profileId - ID of the profile















 * @param {string} layerId - ID de the layer















 * @param {string} styleId - ID du style















 * @param {string} styleFileName - Nom du file















 * @param {string} layerDirectory - Directory de the layer















 * @returns {Promise<Object>} Style loaded (peut contenir des errors)















 */

async function loadStyleLenient(
    profileId: any,

    layerId: any,

    styleId: any,

    styleFileName: any,

    layerDirectory: any
) {
    const previousThrowSetting = loaderConfig.throwOnValidationError;

    loaderConfig.throwOnValidationError = false;

    try {
        return await loadAndValidateStyle(
            profileId,

            layerId,

            styleId,

            styleFileName,

            layerDirectory
        );
    } finally {
        loaderConfig.throwOnValidationError = previousThrowSetting;
    }
}

/**















 * Preloads plusieurs styles en parallel















 * @param {Array<Object>} styleConfigs - Array de { profileId, layerId, styleId, styleFileName, layerDirectory }















 * @returns {Promise<Array<Object>>} Results de loading















 */

async function preloadStyles(styleConfigs: any) {
    const Log = _getLog();

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

    const successCount = results.filter((r) => !r.error).length;

    const errorCount = results.filter((r) => r.error).length;

    if (Log)
        Log.info(
            `[StyleLoader] Preloading complete: ${successCount} success, ${errorCount} errors`
        );

    return results;
}

/**















 * Efface le cache des styles















 * @param {string} [cacheKey] - Key specific to effacer (optional, sinon tout le cache)















 */

function clearStyleCache(cacheKey = null) {
    if (cacheKey) {
        styleCache.delete(cacheKey);
    } else {
        styleCache.clear();
    }
}

/**















 * Obtient les statistiques du cache















 * @returns {Object} Statistiques { size, keys, debug }















 */

function getCacheStats() {
    return {
        size: styleCache.size,

        keys: Array.from(styleCache.keys()),

        debug: loaderConfig.debug,

        cacheEnabled: !loaderConfig.debug,
    };
}

/**















 * Loads a style from une configuration de layer















 * Detects automaticment les references obsolete to styleFile















 * @param {string} profileId - ID of the profile















 * @param {Object} layerConfig - Configuration de the layer















 * @param {string} styleIdOrFileName - ID du style ou nom de file















 * @returns {Promise<Object>} Style loaded















 */

async function loadStyleFromLayerConfig(profileId: any, layerConfig: any, styleIdOrFileName: any) {
    const layerId = layerConfig.id;

    const layerDirectory = layerConfig._layerDirectory || `layers/${layerId}`;

    // Check si styleFile est present in thebels (configuration obsolete)

    if (layerConfig.labels && layerConfig.labels.styleFile) {
        const errorMessage =
            `❌ OBSOLETE CONFIGURATION DETECTED\n` +
            `═══════════════════════════════════════════════════════\n` +
            `The layer "${layerId}" uses une reference obsolete to un fichier\n` +
            `via deprecated "labels.styleFile".\n\n` +
            `GeoLeaf no longer supports separate label files (styleLabel.json).\n` +
            `Les labels must be integrated dans les fichiers de style.\n\n` +
            `Detected value: ${layerConfig.labels.styleFile}\n` +
            `Profil: ${profileId}\n` +
            `Couche: ${layerId}\n\n` +
            `Action requirede:\n` +
            `1. Supprimez la property "labels.styleFile" de la configuration\n` +
            `2. Integrate labels into style files ("label" property)\n` +
            `3. Consultez docs/STYLE_FORMAT_SPEC.md pour la syntax\n` +
            `═══════════════════════════════════════════════════════`;

        console.error(errorMessage);

        throw new Error(`Obsolete configuration: labels.styleFile detected in layer ${layerId}`);
    }

    // Trouver le file de style dans styles.available

    let styleFileName = styleIdOrFileName;

    let styleId = styleIdOrFileName;

    if (layerConfig.styles && layerConfig.styles.available) {
        const styleConfig = layerConfig.styles.available.find(
            (s: any) => s.id === styleIdOrFileName || s.file === styleIdOrFileName
        );

        if (styleConfig) {
            styleFileName = styleConfig.file;

            styleId = styleConfig.id;
        }
    }

    return loadAndValidateStyle(profileId, layerId, styleId, styleFileName, layerDirectory);
}

/**















 * Builds the path complete of a file de style















 * @param {string} profileId - ID of the profile















 * @param {string} layerDirectory - Directory de the layer















 * @param {string} styleFileName - Nom du file















 * @returns {string} Path complete















 */

function getStylePath(profileId: any, layerDirectory: any, styleFileName: any) {
    return `profiles/${profileId}/${layerDirectory}/styles/${styleFileName}`;
}

/**















 * Module Style Loader















 * Exposes toutes les fonctions publiques















 */

const StyleLoader = {
    initStyleLoader,

    loadAndValidateStyle,

    extractLabelConfig,

    loadStyleLenient,

    preloadStyles,

    clearStyleCache,

    getCacheStats,

    loadStyleFromLayerConfig,

    getStylePath,

    styleCache, // Export pour tests/debugging
};

export { StyleLoader };
