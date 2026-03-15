/**
 * Module Basemap Selector pour LayerManager
 * Gestion du selector de base maps
 *
 * DEPENDENCIES:
 * - Leaflet (L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optional)
 * - GeoLeaf.Baselayers (optional, pour getActiveId et setBaseLayer)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerBasemapSelector
 */

"use strict";

import { Log } from "../log/index.js";
import { Baselayers } from "../geoleaf.baselayers.js";

export interface BasemapSectionItem {
    id: string;
    label?: string;
}

export interface BasemapSection {
    items?: BasemapSectionItem[];
}

interface BasemapSelectorInstance {
    _externalHandler?: (e: CustomEvent) => void;
    render(section: BasemapSection, sectionEl: HTMLElement): void;
    _attachChangeHandler(select: HTMLSelectElement): void;
    _attachExternalListener(select: HTMLSelectElement): void;
    destroy(): void;
}

const L =
    typeof globalThis !== "undefined"
        ? (
              globalThis as unknown as {
                  L?: {
                      DomUtil: {
                          create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement;
                      };
                      DomEvent: {
                          on: (el: HTMLElement, ev: string, fn: (ev: Event) => void) => void;
                          stopPropagation: (ev: Event) => void;
                      };
                  };
              }
          ).L
        : undefined;

const _LayerManagerBasemapSelector: BasemapSelectorInstance = {
    render(section: BasemapSection, sectionEl: HTMLElement) {
        if (!section || !sectionEl) return;
        if (!L?.DomUtil) return;

        const container = L.DomUtil.create(
            "div",
            "gl-layer-manager__items gl-layer-manager__basemap-select",
            sectionEl
        );

        const select = L.DomUtil.create(
            "select",
            "gl-layer-manager__basemap-select__select",
            container
        ) as HTMLSelectElement;

        if (Array.isArray(section.items)) {
            section.items.forEach((item) => {
                if (!item?.id) return;
                const opt = document.createElement("option");
                opt.value = item.id;
                opt.textContent = item.label || item.id;
                select.appendChild(opt);
            });
        }

        try {
            const activeKey =
                Baselayers && typeof Baselayers.getActiveKey === "function"
                    ? Baselayers.getActiveKey()
                    : null;
            if (activeKey) {
                select.value = activeKey;
            }
        } catch {
            // ignore
        }

        this._attachChangeHandler(select);
        this._attachExternalListener(select);
    },

    _attachChangeHandler(select: HTMLSelectElement) {
        const handler = (ev: Event) => {
            if (L?.DomEvent) {
                L.DomEvent.stopPropagation(ev);
            }
            try {
                const val = select.value;
                if (Baselayers && typeof Baselayers.setBaseLayer === "function") {
                    Baselayers.setBaseLayer(val, {});
                }
            } catch (err) {
                if (Log) Log.warn("Error during basemap change from legend:", err);
            }
        };

        if (L?.DomEvent) {
            L.DomEvent.on(select, "change", handler);
        } else {
            select.addEventListener("change", handler);
        }
    },

    _attachExternalListener(select: HTMLSelectElement) {
        if (typeof document !== "undefined") {
            this._externalHandler = (e: CustomEvent) => {
                try {
                    if (e?.detail?.key) {
                        select.value = e.detail.key;
                    }
                } catch {
                    // ignore
                }
            };
            document.addEventListener(
                "geoleaf:basemap:change",
                this._externalHandler as EventListener
            );
        }
    },

    destroy() {
        if (this._externalHandler) {
            document.removeEventListener(
                "geoleaf:basemap:change",
                this._externalHandler as EventListener
            );
            this._externalHandler = undefined;
        }
    },
};

const BasemapSelector = _LayerManagerBasemapSelector;
export { BasemapSelector };
