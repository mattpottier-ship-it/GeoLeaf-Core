/**
 * GeoLeaf GeoJSON Loader - Data
 * Chargement direct de données GeoJSON (URL ou objet JS)
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

Loader.loadUrl = async function (
    url: string,
    options: Record<string, unknown> = {}
): Promise<unknown> {
    const state = getState();
    const Log = getLog();
    if (!url) {
        Log.warn("[GeoLeaf.GeoJSON] URL GeoJSON manquante.");
        return state.geoJsonLayer;
    }
    if (!state.map) {
        Log.error(
            "[GeoLeaf.GeoJSON] Module non initialisé. Appelle GeoLeaf.GeoJSON.init() avant loadUrl()."
        );
        return null;
    }
    const mergedOptions =
        (_g as any).GeoLeaf && (_g as any).GeoLeaf.Utils && (_g as any).GeoLeaf.Utils.mergeOptions
            ? (_g as any).GeoLeaf.Utils.mergeOptions(state.options, options)
            : Object.assign({}, state.options, options);
    try {
        const FetchHelper = (_g as any).GeoLeaf && (_g as any).GeoLeaf.Utils?.FetchHelper;
        let data: unknown;
        if (FetchHelper) {
            data = await FetchHelper.get(url, { timeout: 20000, retries: 2 });
        } else {
            const response = await fetch(url);
            if (!response.ok) throw new Error("HTTP " + response.status + " pour " + url);
            data = await response.json();
        }
        (_g as any).GeoLeaf && Loader.addData(data as Record<string, unknown>, mergedOptions);
        return state.geoJsonLayer;
    } catch (err) {
        Log.error("[GeoLeaf.GeoJSON] Erreur lors du chargement GeoJSON :", err);
        return state.geoJsonLayer;
    }
};

Loader.addData = function (
    geojsonData: Record<string, unknown>,
    options: Record<string, unknown> = {}
): void {
    const state = getState();
    const Log = getLog();
    if (!geojsonData) {
        Log.warn("[GeoLeaf.GeoJSON] Aucune donnée GeoJSON fournie à addData().");
        return;
    }
    if (!state.map || !state.geoJsonLayer) {
        Log.error(
            "[GeoLeaf.GeoJSON] Module non initialisé. Appelle GeoLeaf.GeoJSON.init() avant addData()."
        );
        return;
    }
    const mergedOptions =
        (_g as any).GeoLeaf && (_g as any).GeoLeaf.Utils && (_g as any).GeoLeaf.Utils.mergeOptions
            ? (_g as any).GeoLeaf.Utils.mergeOptions(state.options, options)
            : Object.assign({}, state.options, options);
    if (
        (_g as any).GeoLeaf &&
        (_g as any).GeoLeaf._GeoJSONStyleResolver &&
        (_g as any).GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions
    ) {
        (state.geoJsonLayer as any).options = (
            _g as any
        ).GeoLeaf._GeoJSONStyleResolver.buildLeafletOptions(mergedOptions);
    }
    let dataToAdd: unknown = geojsonData;
    const Validator = (_g as any).GeoLeaf && (_g as any).GeoLeaf._GeoJSONFeatureValidator;
    if (Validator && typeof Validator.validateFeatureCollection === "function") {
        const validationResult = Validator.validateFeatureCollection(geojsonData);
        if (validationResult.errors.length > 0) {
            Log.warn(
                `[GeoLeaf.GeoJSON] Validation: ${validationResult.errors.length} feature(s) rejetée(s), ${validationResult.validFeatures.length} acceptée(s)`
            );
        }
        if (validationResult.validFeatures.length > 0) {
            if ((geojsonData as any).type === "FeatureCollection") {
                dataToAdd = { type: "FeatureCollection", features: validationResult.validFeatures };
            } else {
                dataToAdd =
                    validationResult.validFeatures.length === 1
                        ? validationResult.validFeatures[0]
                        : { type: "FeatureCollection", features: validationResult.validFeatures };
            }
        } else {
            Log.warn("[GeoLeaf.GeoJSON] Aucune feature valide à ajouter après validation");
            return;
        }
    }
    (state.geoJsonLayer as any).addData(dataToAdd);
    if (mergedOptions.fitBoundsOnLoad && state.layerGroup) {
        const bounds = (state.layerGroup as any).getBounds();
        if (bounds.isValid()) {
            const fitOptions: { maxZoom?: number } = {};
            if (typeof (mergedOptions as any).maxZoomOnFit === "number")
                fitOptions.maxZoom = (mergedOptions as any).maxZoomOnFit;
            (state.map as any).fitBounds(bounds, fitOptions);
        }
    }
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
