/**
 * GeoLeaf GeoJSON Loader - Data
 * Loadsment direct de data GeoJSON (URL ou object JS)
 *
 * @module geojson/loader/data
 */

import { GeoJSONShared } from "../shared.js";
import { getLog } from "../../utils/general-utils.js";

const _g =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
          ? window
          : ({} as Window);

const getState = () => GeoJSONShared.state;

const Loader: {
    loadUrl: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
    addData: (geojsonData: Record<string, unknown>, options?: Record<string, unknown>) => void;
} = {} as any;

function _resolveMergedOptions(state: any, options: any) {
    return (_g as any).GeoLeaf &&
        (_g as any).GeoLeaf.Utils &&
        (_g as any).GeoLeaf.Utils.mergeOptions
        ? (_g as any).GeoLeaf.Utils.mergeOptions(state.options, options)
        : Object.assign({}, state.options, options);
}

async function _fetchGeoJsonData(url: string): Promise<unknown> {
    const FetchHelper = (_g as any).GeoLeaf && (_g as any).GeoLeaf.Utils?.FetchHelper;
    if (FetchHelper) {
        return FetchHelper.get(url, { timeout: 20000, retries: 2 });
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP " + response.status + " pour " + url);
    return response.json();
}

Loader.loadUrl = async function (
    url: string,
    options: Record<string, unknown> = {}
): Promise<unknown> {
    const state = getState();
    const Log = getLog();
    if (!url) {
        Log.warn("[GeoLeaf.GeoJSON] URL GeoJSON missing.");
        return state.geoJsonLayer;
    }
    if (!state.map) {
        Log.error(
            "[GeoLeaf.GeoJSON] Module not initialized. Call GeoLeaf.GeoJSON.init() before loadUrl()."
        );
        return null;
    }
    const mergedOptions = _resolveMergedOptions(state, options);
    try {
        const data = await _fetchGeoJsonData(url);
        (_g as any).GeoLeaf && Loader.addData(data as Record<string, unknown>, mergedOptions);
        return state.geoJsonLayer;
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Error loading GeoJSON :", err);
        return state.geoJsonLayer;
    }
};

function _resolveAddDataOptions(state: any, options: any) {
    const mergedOptions = _resolveMergedOptions(state, options);
    if (
        (_g as any).GeoLeaf &&
        (_g as any).GeoLeaf._GeoJSONStyleResolver &&
        (_g as any).GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions
    ) {
        (state.geoJsonLayer as any).options = (
            _g as any
        ).GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
    }
    return mergedOptions;
}

function _filterValidFeatures(geojsonData: any, Validator: any, Log: any) {
    const validationResult = Validator.validateFeatureCollection(geojsonData);
    if (validationResult.errors.length > 0) {
        Log.warn(
            `[GeoLeaf.GeoJSON] Validation: ${validationResult.errors.length} feature(s) rejected, ${validationResult.validFeatures.length} accepted`
        );
    }
    if (validationResult.validFeatures.length > 0) {
        if ((geojsonData as any).type === "FeatureCollection") {
            return { type: "FeatureCollection", features: validationResult.validFeatures };
        }
        return validationResult.validFeatures.length === 1
            ? validationResult.validFeatures[0]
            : { type: "FeatureCollection", features: validationResult.validFeatures };
    }
    return null;
}

function _fitBoundsAfterLoad(state: any, mergedOptions: any) {
    if (mergedOptions.fitBoundsOnLoad && state.layerGroup) {
        const bounds = (state.layerGroup as any).getBounds();
        if (bounds.isValid()) {
            const fitOptions: { maxZoom?: number } = {};
            if (typeof (mergedOptions as any).maxZoomOnFit === "number")
                fitOptions.maxZoom = (mergedOptions as any).maxZoomOnFit;
            (state.map as any).fitBounds(bounds, fitOptions);
        }
    }
}

Loader.addData = function (
    geojsonData: Record<string, unknown>,
    options: Record<string, unknown> = {}
): void {
    const state = getState();
    const Log = getLog();
    if (!geojsonData) {
        Log.warn("[GeoLeaf.GeoJSON] No GeoJSON data provided to addData().");
        return;
    }
    if (!state.map || !state.geoJsonLayer) {
        Log.error(
            "[GeoLeaf.GeoJSON] Module not initialized. Call GeoLeaf.GeoJSON.init() before addData()."
        );
        return;
    }
    const mergedOptions = _resolveAddDataOptions(state, options);
    let dataToAdd: unknown = geojsonData;
    const Validator = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONFeatureValidator;
    if (Validator && typeof Validator.validateFeatureCollection === "function") {
        const filtered = _filterValidFeatures(geojsonData, Validator, Log);
        if (filtered === null) {
            Log.warn("[GeoLeaf.GeoJSON] No valid feature to add after validation");
            return;
        }
        dataToAdd = filtered;
    }
    (state.geoJsonLayer as any).addData(dataToAdd);
    _fitBoundsAfterLoad(state, mergedOptions);
    try {
        (state.map as any).fire("geoleaf:geojson:loaded", {
            data: geojsonData,
            layer: state.geoJsonLayer,
        });
    } catch (_e) {
        /* ignore */
    }
};

export { Loader as LoaderData };
