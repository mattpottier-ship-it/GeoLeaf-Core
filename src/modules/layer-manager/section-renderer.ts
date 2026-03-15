/**
 * LayerManager — Section Renderer
 * Generation DOM des sections de the legend (accordions, titles, delegation basemap/items).
 *
 * Extrait de layer-manager/renderer.ts (split Sprint 1 roadmap).
 *
 * @module geoleaf.layer-manager.section-renderer
 */
"use strict";

import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { getLabel } from "../i18n/i18n.js";
import { BasemapSelector } from "./basemap-selector.js";
import { LabelButtonManager } from "../labels/label-button-manager.js";
import { GeoJSONCore } from "../geojson/core.js";
import { renderItems } from "./item-controls.js";
import type { LMSection } from "./item-controls.js";

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
                          preventDefault: (ev: Event) => void;
                          disableClickPropagation: (el: HTMLElement) => void;
                      };
                  };
              }
          ).L
        : undefined;

function _buildAccordionHeader(section: LMSection, sectionEl: HTMLElement): void {
    const accordionHeader = L!.DomUtil.create(
        "div",
        "gl-layer-manager__accordion-header",
        sectionEl
    );
    const sectionTitle = L!.DomUtil.create(
        "div",
        "gl-layer-manager__section-title",
        accordionHeader
    );
    sectionTitle.textContent = section.label!;
    const accordionArrow = L!.DomUtil.create(
        "span",
        "gl-layer-manager__accordion-arrow",
        accordionHeader
    );
    accordionArrow.textContent = "▶";
    L!.DomEvent.on(accordionHeader, "click", function (ev) {
        L!.DomEvent.stopPropagation(ev);
        L!.DomEvent.preventDefault(ev);
        const wasCollapsed = sectionEl.classList.contains("gl-layer-manager__section--collapsed");
        sectionEl.classList.toggle("gl-layer-manager__section--collapsed");
        accordionArrow.textContent = wasCollapsed ? "▼" : "▶";
        section._isExpanded = wasCollapsed;
        if (Log)
            Log.debug("[LayerManager] Accordion", section.id, wasCollapsed ? "opened" : "closed");
    });
}

function _renderSectionEl(section: LMSection, bodyEl: HTMLElement): void {
    const isCollapsible = typeof section.collapsedByDefault === "boolean";
    const isCollapsed = section.collapsedByDefault === true;
    const sectionEl = L!.DomUtil.create(
        "div",
        isCollapsible
            ? "gl-layer-manager__section gl-layer-manager__section--accordion"
            : "gl-layer-manager__section",
        bodyEl
    );
    if (isCollapsed) sectionEl.classList.add("gl-layer-manager__section--collapsed");
    if (section.label) {
        if (isCollapsible) _buildAccordionHeader(section, sectionEl);
        else {
            const sectionTitle = L!.DomUtil.create(
                "div",
                "gl-layer-manager__section-title",
                sectionEl
            );
            sectionTitle.textContent = section.label;
        }
    }
    if (!Array.isArray(section.items) || section.items.length === 0) return;
    const sectionBody = isCollapsible
        ? L!.DomUtil.create("div", "gl-layer-manager__accordion-body", sectionEl)
        : sectionEl;
    if (section.id === "basemap") {
        if (BasemapSelector)
            BasemapSelector.render(
                section as import("./basemap-selector.js").BasemapSection,
                sectionBody
            );
    } else {
        renderItems(section, sectionBody);
    }
}

/**
 * Generates the DOM pour l'set des sections de the legend.
 */
function renderSections(bodyEl: HTMLElement | null, sections: LMSection[]) {
    if (!bodyEl) return;
    if (!L?.DomUtil) return;
    DOMSecurity.clearElementFast(bodyEl);
    if (!Array.isArray(sections) || sections.length === 0) {
        const emptyEl = L.DomUtil.create("div", "gl-layer-manager__empty", bodyEl);
        emptyEl.textContent = getLabel("ui.layer_manager.empty");
        return;
    }
    sections
        .filter((s) => s.id !== "poi" && s.id !== "route")
        .forEach((section) => _renderSectionEl(section, bodyEl));
    if (LabelButtonManager && GeoJSONCore) {
        const allLayers = GeoJSONCore._layers || new Map();
        allLayers.forEach((layerData, layerId) => {
            if (layerData.currentStyle) LabelButtonManager.syncImmediate(layerId);
        });
    }
}

export { renderSections };
export type { LMSection };
