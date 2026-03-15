/**
 * LayerManager — Item Controls
 * Rendu des items of a section et de leurs controles (toggle, label, style-selector).
 *
 * Extrait de layer-manager/renderer.ts (split Sprint 1 roadmap).
 *
 * @module geoleaf.layer-manager.item-controls
 */
"use strict";

import { StyleSelector } from "./style-selector.js";
import { _UIComponents } from "../ui/components.js";
import { LabelButtonManager } from "../labels/label-button-manager.js";
import { checkLayerVisibility } from "./visibility-checker.js";
import { attachToggleHandler } from "./toggle-handler.js";
import { getLabel } from "../i18n/i18n.js";

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

export interface LMSection {
    id?: string;
    label?: string;
    collapsedByDefault?: boolean;
    items?: LMItem[];
    _isExpanded?: boolean;
}

export interface LMItem {
    id?: string;
    label?: string;
    toggleable?: boolean;
    styles?: unknown;
    value?: unknown;
}

/**
 * Rend les items of a section in the DOM.
 */
function renderItems(section: LMSection, sectionEl: HTMLElement) {
    if (!L?.DomUtil) return;
    const listEl = L.DomUtil.create("div", "gl-layer-manager__items", sectionEl);

    section.items!.forEach((item: LMItem) => {
        const itemEl = L.DomUtil.create("div", "gl-layer-manager__item", listEl);

        // Addsr l'attribut data-layer-id pour faciliter la recherche DOM
        if (item.id) {
            itemEl.setAttribute("data-layer-id", item.id);

            // Addsr la class gl-layer--hidden si the layer n'est pas visible au loading
            const isVisible = checkLayerVisibility(item.id);
            if (!isVisible) {
                itemEl.classList.add("gl-layer--hidden");
            }
        }

        // Conteneur de la line maine (always created for the layout en column)
        const mainRow = L.DomUtil.create("div", "gl-layer-manager__item-row", itemEl);

        // Label
        const labelEl = L.DomUtil.create("span", "gl-layer-manager__label", mainRow);
        labelEl.textContent = item.label || "";

        // Toggle d'display pour the layers toggleable
        if (item.toggleable && item.id) {
            renderToggleControls(item, mainRow, itemEl);
        } else if (item.id) {
            // Same pour the layers non-toggleable, create le button label
            const controlsContainer = L.DomUtil.create(
                "div",
                "gl-layer-manager__item-controls",
                mainRow
            );

            // Createsr le button de label
            if (LabelButtonManager) {
                LabelButtonManager.createButton(item.id, controlsContainer);
                LabelButtonManager.syncImmediate(item.id);
            }
        } else {
            // Value/info complementary pour items sans ID
            if (typeof item.value !== "undefined") {
                const valueEl = L.DomUtil.create("span", "gl-layer-manager__value", itemEl);
                valueEl.textContent = String(item.value);
            }
        }
    });
}

/**
 * Rend les controles toggle for a item (button label + button toggle + style selector).
 */
function renderToggleControls(item: LMItem, mainRow: HTMLElement, itemEl: HTMLElement) {
    if (!L?.DomUtil) return;
    const controlsContainer = L.DomUtil.create("div", "gl-layer-manager__item-controls", mainRow);

    // Createsr le button de label via le centralized manager
    if (LabelButtonManager && item.id) {
        LabelButtonManager.createButton(item.id, controlsContainer);
        LabelButtonManager.syncImmediate(item.id);
    }

    // Check the state initial
    const isActive = checkLayerVisibility(item.id!);

    const toggleBtn = _UIComponents.createToggleButton(controlsContainer, {
        isActive: isActive,
        className: "gl-layer-manager__item-toggle",
        title: getLabel("aria.layer.toggle"),
    });

    // Attacher le manager for toggle (checkLayerVisibility injected comme callback)
    attachToggleHandler(
        toggleBtn as HTMLButtonElement & {
            _toggleHandlerAttached?: boolean;
            _isToggling?: boolean;
        },
        item.id!,
        checkLayerVisibility
    );

    // Selector de styles si available
    if (item.styles && StyleSelector && item.id) {
        const styleElement = StyleSelector.renderDOM(
            item as import("./style-selector.js").LayerItemForStyle
        );
        if (styleElement) {
            itemEl.appendChild(styleElement);
            StyleSelector.bindEvents(
                styleElement,
                item as import("./style-selector.js").LayerItemForStyle
            );
        }
    }
}

/**
 * Fallback pour create un toggle button si _UIComponents non available.
 */
function createToggleFallback(container: HTMLElement, isActive: boolean): HTMLElement {
    if (!L?.DomUtil) return document.createElement("div");
    const toggleBtn = L.DomUtil.create(
        "button",
        "gl-layer-manager__item-toggle",
        container
    ) as HTMLButtonElement;
    toggleBtn.type = "button";
    toggleBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
    toggleBtn.title = getLabel("aria.layer.toggle");
    if (isActive) {
        toggleBtn.classList.add("gl-layer-manager__item-toggle--on");
    }
    return toggleBtn;
}

export { renderItems, renderToggleControls, createToggleFallback };
