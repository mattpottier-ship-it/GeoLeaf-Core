/*!
 * GeoLeaf Core – Config / Validation
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../../log/index.js";
import { Config } from "./config-core.js";
import type { GeoLeafConfig } from "./config-types.js";

function _hasColor(d: any): boolean {
    if (d.color && typeof d.color === "string") return true;
    if (d.colorFill && typeof d.colorFill === "string") return true;
    if (d.colorStroke && typeof d.colorStroke === "string") return true;
    return false;
}

function _validateCenter(center: unknown): void {
    if (
        !Array.isArray(center) ||
        center.length !== 2 ||
        typeof center[0] !== "number" ||
        typeof center[1] !== "number"
    ) {
        throw new Error("[GeoLeaf.Config] map.center must be un table de 2 nombres [lat, lng].");
    }
}

function _validateZoom(zoom: unknown): void {
    if (typeof zoom !== "number" || zoom < 0 || zoom > 20) {
        throw new Error("[GeoLeaf.Config] map.zoom must be un nombre entre 0 et 20.");
    }
}

function _validateInitialMaxZoom(v: unknown): void {
    if (typeof v !== "number" || v < 1 || v > 20) {
        throw new Error("[GeoLeaf.Config] map.initialMaxZoom must be un nombre entre 1 et 20.");
    }
}

function _validateBoundsMargin(v: unknown): void {
    if (typeof v !== "number" || v < 0 || v > 1) {
        throw new Error(
            "[GeoLeaf.Config] map.boundsMargin must be un nombre entre 0 et 1 (ex: 0.3 = 30% de marge)."
        );
    }
}

function _validateMapSection(map: any): void {
    if (map.center !== undefined) _validateCenter(map.center);
    if (map.zoom !== undefined) _validateZoom(map.zoom);
    if (map.positionFixed !== undefined) {
        if (typeof map.positionFixed !== "boolean") {
            throw new Error("[GeoLeaf.Config] map.positionFixed must be un boolean (true/false).");
        }
    }
    if (map.initialMaxZoom !== undefined) _validateInitialMaxZoom(map.initialMaxZoom);
    if (map.boundsMargin !== undefined) _validateBoundsMargin(map.boundsMargin);
}

function _validateSubCategory(subId: string, subData: any, catId: string): void {
    if (!subData || typeof subData !== "object") {
        Log.warn(
            `[GeoLeaf.Config] Subcategory '${subId}' in '${catId}' is invalid (must be an object).`
        );
        return;
    }
    if (!subData.label || typeof subData.label !== "string") {
        Log.warn(
            `[GeoLeaf.Config] Subcategory '${subId}' in '${catId}': 'label' field is missing or invalid.`
        );
    }
    if (!_hasColor(subData)) {
        Log.warn(
            `[GeoLeaf.Config] Subcategory '${subId}' in '${catId}': no color defined (neither 'color' nor 'colorFill'/'colorStroke').`
        );
    }
}

function _validateCategory(catId: string, catData: any): void {
    if (!catData || typeof catData !== "object") {
        Log.warn(`[GeoLeaf.Config] Category '${catId}' is invalid (must be an object).`);
        return;
    }
    if (!catData.label || typeof catData.label !== "string") {
        Log.warn(`[GeoLeaf.Config] Category '${catId}': 'label' field is missing or invalid.`);
    }
    if (!_hasColor(catData)) {
        Log.warn(
            `[GeoLeaf.Config] Category '${catId}': no color defined (neither 'color' nor 'colorFill'/'colorStroke').`
        );
    }
    if (catData.subcategories === undefined) return;
    if (
        typeof catData.subcategories !== "object" ||
        catData.subcategories === null ||
        Array.isArray(catData.subcategories)
    ) {
        Log.warn(`[GeoLeaf.Config] Category '${catId}': subcategories must be an object.`);
        return;
    }
    Object.entries(catData.subcategories).forEach(([subId, subData]) =>
        _validateSubCategory(subId, subData, catId)
    );
}

function _validateTopLevelFields(cfg: GeoLeafConfig): void {
    if (cfg.basemaps !== undefined) {
        if (typeof cfg.basemaps !== "object")
            throw new Error("[GeoLeaf.Config] basemaps must be un object.");
        if (cfg.basemaps === null) throw new Error("[GeoLeaf.Config] basemaps must be un object.");
    }
    if (cfg.poi !== undefined && !Array.isArray(cfg.poi))
        throw new Error("[GeoLeaf.Config] poi must be un table.");
    if (cfg.geojson !== undefined && !Array.isArray(cfg.geojson))
        throw new Error("[GeoLeaf.Config] geojson must be un table.");
}

function _validateCategoriesSection(cats: unknown): void {
    if (typeof cats !== "object") throw new Error("[GeoLeaf.Config] categories must be un object.");
    if (cats === null) throw new Error("[GeoLeaf.Config] categories must be un object.");
    if (Array.isArray(cats)) throw new Error("[GeoLeaf.Config] categories must be un object.");
    Object.entries(cats as Record<string, unknown>).forEach(([catId, catData]) =>
        _validateCategory(catId, catData)
    );
}

function validateConfig(cfg: GeoLeafConfig | null | undefined): void {
    if (!cfg) return;
    if (typeof cfg !== "object") return;
    if (cfg.map) _validateMapSection(cfg.map);
    _validateTopLevelFields(cfg);
    if (cfg.categories !== undefined) _validateCategoriesSection(cfg.categories);
    Log.debug("[GeoLeaf.Config] Structure validation successful.");
}

(
    Config as unknown as { _validateConfig: (cfg: GeoLeafConfig | null | undefined) => void }
)._validateConfig = validateConfig;

export { Config };
