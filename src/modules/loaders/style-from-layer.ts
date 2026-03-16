/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
/**
 * @fileoverview Style loading helpers for layer configurations.
 * Extracted from style-loader.ts as part of Sprint 1 refactoring.
 * @module loaders/style-from-layer
 */

"use strict";

import { loadAndValidateStyle } from "./style-loader-core.js";

/**
 * Loads a style from a layer configuration object.
 * Automatically detects obsolete references to styleFile.
 * @param {string} profileId - Profile ID.
 * @param {Object} layerConfig - Layer configuration.
 * @param {string} styleIdOrFileName - Style ID or file name.
 * @returns {Promise<Object>} Loaded style.
 */
export async function loadStyleFromLayerConfig(
    profileId: any,
    layerConfig: any,
    styleIdOrFileName: any
) {
    const layerId = layerConfig.id;
    const layerDirectory = layerConfig._layerDirectory || `layers/${layerId}`;

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
 * Builds the complete path to a style file.
 * @param {string} profileId - Profile ID.
 * @param {string} layerDirectory - Layer directory.
 * @param {string} styleFileName - Style file name.
 * @returns {string} Complete path.
 */
export function getStylePath(profileId: any, layerDirectory: any, styleFileName: any): string {
    return `profiles/${profileId}/${layerDirectory}/styles/${styleFileName}`;
}
