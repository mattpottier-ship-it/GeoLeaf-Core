/**
 * Module Legend Renderer
 * Rendu des symboles de légende cartographique
 *
 * DÉPENDANCES:
 * - Leaflet (L.DomUtil)
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LegendRenderer
 */

import { Log } from "../log/index.js";
import { _UIComponents } from "../ui/components.js";

export interface LegendSection {
    title?: string;
    items?: LegendItem[];
}

export interface LegendItem {
    label?: string;
    description?: string;
    symbol?: Record<string, unknown>;
    order?: number;
}

export interface LegendFooter {
    text?: string;
    style?: string;
}

export interface LegendAccordionData {
    layerId: string;
    label: string;
    collapsed?: boolean;
    visible?: boolean;
    sections?: LegendSection[];
}

const L =
    typeof globalThis !== "undefined"
        ? (
              globalThis as unknown as {
                  L?: {
                      DomUtil: {
                          create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement;
                      };
                  };
              }
          ).L
        : undefined;

/**
 * Rendu d'une section de légende
 */
function renderSection(container: HTMLElement, section: LegendSection): HTMLElement | undefined {
    if (!L?.DomUtil) return undefined;
    const sectionEl = L.DomUtil.create("div", "gl-legend__section", container);

    if (section.title) {
        const titleEl = L.DomUtil.create("h3", "gl-legend__section-title", sectionEl);
        titleEl.textContent = section.title;
    }

    const itemsContainer = L.DomUtil.create("div", "gl-legend__items", sectionEl);
    if (Array.isArray(section.items)) {
        section.items.forEach((item) => renderItem(itemsContainer, item));
    }

    return sectionEl;
}

/**
 * Rendu d'un item de légende
 */
function renderItem(container: HTMLElement, item: LegendItem): HTMLElement | undefined {
    if (!L?.DomUtil) return undefined;
    const itemEl = L.DomUtil.create("div", "gl-legend__item", container);

    const symbolEl = L.DomUtil.create("div", "gl-legend__symbol", itemEl);
    renderSymbol(symbolEl, item);

    const textContainer = L.DomUtil.create("div", "gl-legend__text", itemEl);

    const labelEl = L.DomUtil.create("span", "gl-legend__label", textContainer);
    labelEl.textContent = item.label ?? "";

    if (item.description) {
        const descEl = L.DomUtil.create("span", "gl-legend__description", textContainer);
        descEl.textContent = item.description;
    }

    return itemEl;
}

/**
 * Rendu d'un symbole selon son type
 */
function renderSymbol(container: HTMLElement, item: LegendItem): void {
    if (_UIComponents && typeof _UIComponents.renderSymbol === "function") {
        _UIComponents.renderSymbol(container, item);
    } else {
        if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
    }
}

/**
 * Rendu du footer
 */
function renderFooter(container: HTMLElement, footer: LegendFooter | null | undefined): void {
    if (!footer?.text) return;
    if (!L?.DomUtil) return;
    const footerEl = L.DomUtil.create("div", "gl-legend__footer", container);
    footerEl.textContent = footer.text;

    if (footer.style === "italic") {
        footerEl.style.fontStyle = "italic";
    }
}

/**
 * Rendu d'un accordéon pour une couche
 */
function renderAccordion(container: HTMLElement, accordionData: LegendAccordionData): void {
    const _UIComponentsResolved = (
        globalThis as unknown as {
            GeoLeaf?: {
                _UIComponents?: {
                    createAccordion: (
                        container: HTMLElement,
                        config: Record<string, unknown>
                    ) => { bodyEl: HTMLElement };
                };
            };
        }
    ).GeoLeaf?._UIComponents;
    if (!_UIComponentsResolved) {
        if (Log) Log.error("[LegendRenderer] Module _UIComponents non disponible");
        return;
    }

    const { bodyEl } = _UIComponentsResolved.createAccordion(container, {
        layerId: accordionData.layerId,
        label: accordionData.label,
        collapsed: accordionData.collapsed !== false,
        visible: accordionData.visible,
        onToggle: (_layerId: string, _expanded: boolean) => {
            const _gl = globalThis as unknown as {
                GeoLeaf?: { Legend?: { toggleAccordion?: (id: string) => void } };
            };
            if (_gl.GeoLeaf?.Legend && typeof _gl.GeoLeaf.Legend.toggleAccordion === "function") {
                _gl.GeoLeaf.Legend.toggleAccordion(accordionData.layerId);
            }
        },
    });

    if (Array.isArray(accordionData.sections)) {
        accordionData.sections.forEach((section) => {
            renderSection(bodyEl, section);
        });
    }
}

const LegendRenderer = {
    renderSection,
    renderItem,
    renderSymbol,
    renderFooter,
    renderAccordion,
};
export { LegendRenderer };
