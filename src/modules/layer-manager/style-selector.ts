/**
 * @module _LayerManagerStyleSelector
 * @description Sélecteur de styles pour le gestionnaire de couches.
 * @version 3.1.0
 */

"use strict";

import { Config } from "../config/config-primitives.js";
import { GeoJSONCore } from "../geojson/core.js";
import { StyleLoader } from "../loaders/style-loader.js";
import { Labels } from "../labels/labels.js";
import { LabelButtonManager } from "../labels/label-button-manager.js";
import { LegendContract } from "../../contracts/legend.contract.js";

const state = {
    currentStyles: new Map<string, string>(),
};

export interface StyleItemConfig {
    id: string;
    label?: string;
    file?: string;
}

export interface LayerItemStyles {
    available?: StyleItemConfig[];
    default?: string;
    directory?: string;
}

export interface LayerItemForStyle {
    id: string;
    styles?: LayerItemStyles;
}

const _LayerManagerStyleSelector = {
    getCurrentStyle(layerId: string): string | null {
        return state.currentStyles.get(layerId) ?? null;
    },

    setCurrentStyle(layerId: string, styleId: string): void {
        state.currentStyles.set(layerId, styleId);
    },

    renderDOM(item: LayerItemForStyle): HTMLElement | null {
        if (
            !item.styles ||
            !Array.isArray(item.styles.available) ||
            item.styles.available.length <= 1
        ) {
            return null;
        }

        const currentStyle =
            this.getCurrentStyle(item.id) || item.styles.default || item.styles.available[0].id;
        const selectId = "style-selector-" + item.id;

        const container = document.createElement("div");
        container.className = "gl-layer-manager__style-selector";

        const select = document.createElement("select");
        select.id = selectId;
        select.className = "gl-layer-manager__style-select";
        select.setAttribute("data-layer-id", item.id);

        item.styles.available.forEach((style) => {
            const option = document.createElement("option");
            option.value = style.id;
            option.textContent = style.label ?? style.id;
            if (style.id === currentStyle) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        container.appendChild(select);
        return container;
    },

    bindEvents(container: HTMLElement, item: LayerItemForStyle): void {
        if (
            !item.styles ||
            !Array.isArray(item.styles.available) ||
            item.styles.available.length <= 1
        ) {
            return;
        }

        const selectId = "style-selector-" + item.id;
        const select = container.querySelector<HTMLSelectElement>("#" + selectId);

        if (!select) return;

        const self = this;

        select.addEventListener("change", function (this: HTMLSelectElement) {
            const styleId = this.value;
            const layerId = this.getAttribute("data-layer-id");
            if (layerId) {
                self.setCurrentStyle(layerId, styleId);
                self.applyStyle(layerId, styleId);
            }
        });
    },

    async applyStyle(layerId: string, styleId: string): Promise<void> {
        if (!GeoJSONCore) return;

        const layerData = GeoJSONCore.getLayerData(layerId);
        if (!layerData) return;

        if (!layerData.config.styles || !Array.isArray(layerData.config.styles.available)) {
            return;
        }

        const styleConfig = layerData.config.styles.available.find((s: StyleItemConfig) => s.id === styleId);
        if (!styleConfig) return;

        try {
            if (!StyleLoader) {
                this._applyStyleLegacy(layerId, styleId, layerData, styleConfig);
                return;
            }

            const profileId = layerData.config._profileId;
            const layerDirectory = layerData.config._layerDirectory;

            if (!profileId || !layerDirectory) return;

            const result = await StyleLoader.loadAndValidateStyle(
                profileId,
                layerId,
                styleId,
                styleConfig.file ?? "",
                layerDirectory
            );

            const res = result as { styleData: unknown; metadata: unknown };
            layerData.currentStyle = res.styleData;
            layerData.currentStyleMetadata = res.metadata;

            if (typeof GeoJSONCore.setLayerStyle === "function") {
                GeoJSONCore.setLayerStyle(layerId, res.styleData);
            }

            if (Labels && typeof Labels.initializeLayerLabels === "function") {
                Labels.initializeLayerLabels(layerId);
            }

            if (LabelButtonManager) {
                LabelButtonManager.syncImmediate(layerId);
            }

            if (LegendContract.isAvailable()) {
                LegendContract.loadLayerLegend(layerData.config.id, styleId, layerData.config);
            }
        } catch (_error) {
            // log removed
        }
    },

    _applyStyleLegacy(
        layerId: string,
        styleId: string,
        layerData: { config: { _profileId?: string; _layerDirectory?: string; id: string; styles: { directory?: string; available: StyleItemConfig[] } } },
        styleConfig: StyleItemConfig
    ): void {
        const profileId = layerData.config._profileId;
        const layerDirectory = layerData.config._layerDirectory;

        if (!profileId || !layerDirectory) return;

        const dataCfg = (Config as { get?: (key: string) => { profilesBasePath?: string } }).get?.("data");
        const profilesBasePath = dataCfg?.profilesBasePath ?? "profiles";

        const styleDirectory = layerData.config.styles.directory ?? "styles";
        const stylePath =
            profilesBasePath +
            "/" +
            profileId +
            "/" +
            layerDirectory +
            "/" +
            styleDirectory +
            "/" +
            (styleConfig.file ?? "");

        fetch(stylePath)
            .then((response) => {
                if (!response.ok) throw new Error("Erreur HTTP " + response.status);
                return response.json();
            })
            .then((styleData: unknown) => {
                if (typeof GeoJSONCore.setLayerStyle === "function") {
                    GeoJSONCore.setLayerStyle(layerId, styleData);
                }
                if (LegendContract.isAvailable()) {
                    LegendContract.loadLayerLegend(layerData.config.id, styleId, layerData.config);
                }
            })
            .catch(() => {});
    },
};

const StyleSelector = _LayerManagerStyleSelector;
export { StyleSelector };
