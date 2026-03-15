/**
 * GeoLeaf GeoJSON Loader - Config Helpers
 * @module geojson/loader/config-helpers
 */

interface LayerDef {
    popupFields?: unknown[];
    popup?: { fields?: unknown[] };
    tooltipFields?: unknown[];
    tooltip?: { fields?: unknown[] };
    sidepanelFields?: unknown[];
    sidepanel?: { detailLayout?: unknown[] };
}

const Loader = {
    getPopupConfig(def: LayerDef | null | undefined): unknown[] | null {
        if (!def) return null;
        if (def.popupFields && Array.isArray(def.popupFields)) return def.popupFields;
        if (def.popup?.fields && Array.isArray(def.popup.fields)) return def.popup.fields;
        return null;
    },

    getTooltipConfig(def: LayerDef | null | undefined): unknown[] | null {
        if (!def) return null;
        if (def.tooltipFields && Array.isArray(def.tooltipFields)) return def.tooltipFields;
        if (def.tooltip?.fields && Array.isArray(def.tooltip.fields)) return def.tooltip.fields;
        return null;
    },

    getSidepanelConfig(def: LayerDef | null | undefined): unknown[] | null {
        if (!def) return null;
        if (def.sidepanelFields && Array.isArray(def.sidepanelFields)) return def.sidepanelFields;
        if (def.sidepanel?.detailLayout && Array.isArray(def.sidepanel.detailLayout))
            return def.sidepanel.detailLayout;
        return null;
    },
};

export { Loader as LoaderConfigHelpers };
