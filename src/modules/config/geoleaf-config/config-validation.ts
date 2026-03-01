/*!
 * GeoLeaf Core – Config / Validation
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../../log/index.js";
import { Config } from "./config-core.js";
import type { GeoLeafConfig } from "./config-types.js";

function validateConfig(cfg: GeoLeafConfig | null | undefined): void {
    if (!cfg || typeof cfg !== "object") return;

    if (cfg.map && cfg.map.center !== undefined) {
        if (
            !Array.isArray(cfg.map.center) ||
            cfg.map.center.length !== 2 ||
            typeof cfg.map.center[0] !== "number" ||
            typeof cfg.map.center[1] !== "number"
        ) {
            throw new Error(
                "[GeoLeaf.Config] map.center doit être un tableau de 2 nombres [lat, lng]."
            );
        }
    }

    if (cfg.map && cfg.map.zoom !== undefined) {
        if (typeof cfg.map.zoom !== "number" || cfg.map.zoom < 0 || cfg.map.zoom > 20) {
            throw new Error("[GeoLeaf.Config] map.zoom doit être un nombre entre 0 et 20.");
        }
    }

    if (cfg.map && cfg.map.positionFixed !== undefined) {
        if (typeof cfg.map.positionFixed !== "boolean") {
            throw new Error(
                "[GeoLeaf.Config] map.positionFixed doit être un booléen (true/false)."
            );
        }
    }

    if (cfg.map && cfg.map.initialMaxZoom !== undefined) {
        if (
            typeof cfg.map.initialMaxZoom !== "number" ||
            cfg.map.initialMaxZoom < 1 ||
            cfg.map.initialMaxZoom > 20
        ) {
            throw new Error(
                "[GeoLeaf.Config] map.initialMaxZoom doit être un nombre entre 1 et 20."
            );
        }
    }

    if (cfg.map && cfg.map.boundsMargin !== undefined) {
        if (
            typeof cfg.map.boundsMargin !== "number" ||
            cfg.map.boundsMargin < 0 ||
            cfg.map.boundsMargin > 1
        ) {
            throw new Error(
                "[GeoLeaf.Config] map.boundsMargin doit être un nombre entre 0 et 1 (ex: 0.3 = 30% de marge)."
            );
        }
    }

    if (cfg.basemaps !== undefined) {
        if (typeof cfg.basemaps !== "object" || cfg.basemaps === null) {
            throw new Error("[GeoLeaf.Config] basemaps doit être un objet.");
        }
    }

    if (cfg.poi !== undefined) {
        if (!Array.isArray(cfg.poi)) {
            throw new Error("[GeoLeaf.Config] poi doit être un tableau.");
        }
    }

    if (cfg.geojson !== undefined) {
        if (!Array.isArray(cfg.geojson)) {
            throw new Error("[GeoLeaf.Config] geojson doit être un tableau.");
        }
    }

    if (cfg.categories !== undefined) {
        if (
            typeof cfg.categories !== "object" ||
            cfg.categories === null ||
            Array.isArray(cfg.categories)
        ) {
            throw new Error("[GeoLeaf.Config] categories doit être un objet.");
        }

        Object.entries(cfg.categories).forEach(([catId, catData]) => {
            if (!catData || typeof catData !== "object") {
                Log.warn(`[GeoLeaf.Config] Catégorie '${catId}' invalide (doit être un objet).`);
                return;
            }

            if (!catData.label || typeof catData.label !== "string") {
                Log.warn(
                    `[GeoLeaf.Config] Catégorie '${catId}' : le champ 'label' est manquant ou invalide.`
                );
            }

            const hasOldFormat = catData.color && typeof catData.color === "string";
            const hasNewFormat =
                (catData.colorFill && typeof catData.colorFill === "string") ||
                (catData.colorStroke && typeof catData.colorStroke === "string");

            if (!hasOldFormat && !hasNewFormat) {
                Log.warn(
                    `[GeoLeaf.Config] Catégorie '${catId}' : aucune couleur définie (ni 'color', ni 'colorFill'/'colorStroke').`
                );
            }

            if (catData.subcategories !== undefined) {
                if (
                    typeof catData.subcategories !== "object" ||
                    catData.subcategories === null ||
                    Array.isArray(catData.subcategories)
                ) {
                    Log.warn(
                        `[GeoLeaf.Config] Catégorie '${catId}' : subcategories doit être un objet.`
                    );
                    return;
                }

                Object.entries(catData.subcategories).forEach(([subId, subData]) => {
                    if (!subData || typeof subData !== "object") {
                        Log.warn(
                            `[GeoLeaf.Config] Sous-catégorie '${subId}' dans '${catId}' invalide (doit être un objet).`
                        );
                        return;
                    }

                    if (!subData.label || typeof subData.label !== "string") {
                        Log.warn(
                            `[GeoLeaf.Config] Sous-catégorie '${subId}' dans '${catId}' : le champ 'label' est manquant ou invalide.`
                        );
                    }

                    const hasOldFormatSub = subData.color && typeof subData.color === "string";
                    const hasNewFormatSub =
                        (subData.colorFill && typeof subData.colorFill === "string") ||
                        (subData.colorStroke && typeof subData.colorStroke === "string");

                    if (!hasOldFormatSub && !hasNewFormatSub) {
                        Log.warn(
                            `[GeoLeaf.Config] Sous-catégorie '${subId}' dans '${catId}' : aucune couleur définie (ni 'color', ni 'colorFill'/'colorStroke').`
                        );
                    }
                });
            }
        });
    }

    Log.debug("[GeoLeaf.Config] Validation de la structure réussie.");
}

(
    Config as unknown as { _validateConfig: (cfg: GeoLeafConfig | null | undefined) => void }
)._validateConfig = validateConfig;

export { Config };
