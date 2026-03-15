/**
 * Module Legend Control
 * Controle Leaflet pour display une legend cartographical
 *
 * DEPENDENCIES:
 * - Leaflet (L.Control, L.DomUtil, L.DomEvent)
 * - GeoLeaf.Log (optional)
 * - GeoLeaf._LegendRenderer
 *
 * EXPOSE:
 * - GeoLeaf._LegendControl
 */

import { Log } from "../log/index.js";
import { DOMSecurity } from "../utils/dom-security.js";
import { POIMarkers } from "../poi/markers.js";
import { LegendRenderer } from "./legend-renderer.js";
import type { LegendSection, LegendFooter } from "./legend-renderer.js";
import { getLabel } from "../i18n/i18n.js";

const L =
    typeof globalThis !== "undefined"
        ? (globalThis as unknown as { L?: LeafletGlobal }).L
        : undefined;

interface LeafletGlobal {
    Control: { extend: (props: Record<string, unknown>) => new (opts: unknown) => unknown };
    DomUtil: { create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement };
    DomEvent: {
        on: (el: HTMLElement, ev: string, fn: (ev: Event) => void) => void;
        stopPropagation: (ev: Event) => void;
        disableClickPropagation: (el: HTMLElement) => void;
        disableScrollPropagation: (el: HTMLElement) => void;
    };
    setOptions: (obj: unknown, opts: unknown) => void;
}

let _alreadyLogged = false;
let _spriteDetected = false;

/**
 * S'assure que le sprite SVG des icons est loaded avec verification robuste
 */
async function ensureSpriteLoaded(callback?: (loaded: boolean) => void): Promise<void> {
    if (POIMarkers && typeof POIMarkers.ensureProfileSpriteInjectedSync === "function") {
        if (!_alreadyLogged) {
            Log?.debug("[Legend] Loading SVG sprite for icons...");
            _alreadyLogged = true;
        }

        await POIMarkers.ensureProfileSpriteInjectedSync();

        const spriteEl = document.querySelector('svg[data-geoleaf-sprite="profile"]');
        if (spriteEl) {
            if (!_spriteDetected) {
                Log?.info("[Legend] SVG sprite detected and ready for use");
                _spriteDetected = true;
            }
            if (typeof callback === "function") callback(true);
            return;
        }

        new Promise<boolean>((resolve) => {
            const observer = new MutationObserver((_mutations, obs) => {
                const el = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                if (el) {
                    obs.disconnect();
                    clearTimeout(timerId);
                    if (!_spriteDetected) {
                        if (Log) Log.info("[Legend] SVG sprite detected via MutationObserver");
                        _spriteDetected = true;
                    }
                    resolve(true);
                }
            });
            observer.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true,
            });

            const timerId = setTimeout(() => {
                observer.disconnect();
                if (Log) Log.warn("[Legend] SVG sprite not found after 2s");
                resolve(false);
            }, 2000);
        }).then((found) => {
            if (typeof callback === "function") callback(found);
        });
    } else {
        Log?.debug("[Legend] GeoLeaf._POIMarkers.ensureProfileSpriteInjectedSync non disponible");
        if (typeof callback === "function") callback(false);
    }
}

export interface LegendControlOptions {
    position?: string;
    title?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    sections?: LegendSection[];
    footer?: LegendFooter;
}

export interface LegendAccordionEntry {
    layerId: string;
    label: string;
    collapsed?: boolean;
    order?: number;
    visible?: boolean;
    sections?: LegendSection[];
}

interface LegendControlInstance {
    _map: unknown;
    _container: HTMLElement | null;
    _bodyEl: HTMLElement;
    _glOptions: LegendControlOptions;
    _buildStructure(): void;
    _renderContent(): void;
    _toggleCollapsed(): void;
    updateMultiLayerContent(legendsArray: LegendAccordionEntry[]): void;
    updateContent(legendData: {
        title?: string;
        sections?: LegendSection[];
        footer?: LegendFooter;
    }): void;
    show(): void;
    hide(): void;
}

function _buildLegendHeader(
    opts: LegendControlOptions,
    wrapper: HTMLElement,
    self: LegendControlInstance
): void {
    if (!opts.title) return;
    const header = L!.DomUtil.create("div", "gl-map-legend__header", wrapper);
    const titleEl = L!.DomUtil.create("h2", "gl-map-legend__title", header);
    titleEl.textContent = opts.title ?? "";
    if (opts.collapsible) {
        const toggleEl = L!.DomUtil.create(
            "button",
            "gl-map-legend__toggle",
            header
        ) as HTMLButtonElement;
        toggleEl.type = "button";
        toggleEl.setAttribute("aria-label", getLabel("aria.legend.toggle"));
        toggleEl.textContent = "⟱";
        L!.DomEvent.on(toggleEl, "click", function (ev) {
            L!.DomEvent.stopPropagation(ev);
            self._toggleCollapsed();
        });
    }
}

function _renderLegendContent(bodyEl: HTMLElement, opts: LegendControlOptions): void {
    DOMSecurity.clearElementFast(bodyEl);
    if (!LegendRenderer) {
        if (Log) Log.error("[Legend] LegendRenderer not available");
        return;
    }
    ensureSpriteLoaded();
    if (Array.isArray(opts.sections))
        opts.sections.forEach((section) => LegendRenderer.renderSection(bodyEl, section));
    if (opts.footer) LegendRenderer.renderFooter(bodyEl, opts.footer);
}

function _doLegendOnAdd(instance: LegendControlInstance, mapInstance: unknown): HTMLElement | null {
    instance._map = mapInstance;
    instance._container = L!.DomUtil.create("div", "gl-map-legend") as HTMLElement;
    if (L!.DomEvent) {
        L!.DomEvent.disableClickPropagation(instance._container);
        L!.DomEvent.disableScrollPropagation(instance._container);
    }
    instance._buildStructure();
    return instance._container;
}

function _updateMultiLayerLegendContent(
    instance: LegendControlInstance,
    legendsArray: LegendAccordionEntry[]
): void {
    if (!instance._bodyEl) return;
    DOMSecurity.clearElementFast(instance._bodyEl);
    if (!LegendRenderer || typeof LegendRenderer.renderAccordion !== "function") {
        if (Log) Log.error("[Legend] Renderer.renderAccordion not available");
        return;
    }
    ensureSpriteLoaded(function (spriteLoaded) {
        if (Log) Log.debug("[Legend] Sprite loaded:", spriteLoaded, "- Rendering accordions");
        if (Array.isArray(legendsArray))
            legendsArray.forEach((accordionData) =>
                LegendRenderer.renderAccordion(instance._bodyEl, accordionData)
            );
        if (!spriteLoaded) {
            setTimeout(function () {
                const spriteEl = document.querySelector('svg[data-geoleaf-sprite="profile"]');
                if (spriteEl && Log) {
                    Log.info("[Legend] Sprite loaded late - Re-rendering accordions");
                    instance.updateMultiLayerContent(legendsArray);
                }
            }, 1000);
        }
    });
}

function _doLegendBuildStructure(self: LegendControlInstance): void {
    const opts = self._glOptions;
    const wrapper = L!.DomUtil.create("div", "gl-map-legend__wrapper", self._container!);
    _buildLegendHeader(opts, wrapper, self);
    self._bodyEl = L!.DomUtil.create("div", "gl-map-legend__body", wrapper);
    if (opts.collapsed) self._container!.classList.add("gl-map-legend--collapsed");
    self._renderContent();
}

function _buildLegendControlClass(options: LegendControlOptions) {
    return L!.Control.extend({
        options: { position: options.position || "bottomleft" },
        initialize(
            this: LegendControlInstance,
            controlOptions: { _glOptions?: LegendControlOptions }
        ) {
            L!.setOptions(this, controlOptions || {});
            this._glOptions = controlOptions?._glOptions ?? options;
        },
        onAdd(this: LegendControlInstance, mapInstance: unknown) {
            return _doLegendOnAdd(this, mapInstance);
        },
        onRemove(this: LegendControlInstance) {
            this._map = null;
            this._container = null;
        },
        _buildStructure(this: LegendControlInstance) {
            _doLegendBuildStructure(this);
        },
        _renderContent(this: LegendControlInstance) {
            if (this._bodyEl) _renderLegendContent(this._bodyEl, this._glOptions);
        },
        updateMultiLayerContent(this: LegendControlInstance, legendsArray: LegendAccordionEntry[]) {
            _updateMultiLayerLegendContent(this, legendsArray);
        },
        updateContent(
            this: LegendControlInstance,
            legendData: { title?: string; sections?: LegendSection[]; footer?: LegendFooter }
        ) {
            if (legendData.title) this._glOptions.title = legendData.title;
            if (legendData.sections) this._glOptions.sections = legendData.sections;
            if (legendData.footer) this._glOptions.footer = legendData.footer;
            this._renderContent();
        },
        _toggleCollapsed(this: LegendControlInstance) {
            const isCollapsed = this._container!.classList.toggle("gl-map-legend--collapsed");
            this._glOptions.collapsed = isCollapsed;
        },
        show(this: LegendControlInstance) {
            if (this._container) this._container.style.display = "block";
        },
        hide(this: LegendControlInstance) {
            if (this._container) this._container.style.display = "none";
        },
    });
}

/**
 * Creates a controle Leaflet pour the legend cartographical
 */
function createLegendControl(options: LegendControlOptions): unknown {
    if (!L || !L.Control) {
        if (Log) Log.error("[Legend] Leaflet L.Control not available");
        return null;
    }
    const LegendControlClass = _buildLegendControlClass(options);
    return new LegendControlClass({ position: options.position, _glOptions: options });
}

const LegendControl = {
    create: createLegendControl,
};
export { LegendControl };
