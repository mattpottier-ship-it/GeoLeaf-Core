/**
 * Module Control pour LayerManager
 * Setsion du controle Leaflet custom
 *
 * DEPENDENCIES:
 * - Leaflet (L.Control, L.DomUtil, L.DomEvent, L.setOptions)
 * - GeoLeaf.Log (optional)
 * - GeoLeaf._LayerManagerRenderer (pour renderSections)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerControl
 */

"use strict";

import { Log } from "../log/index.js";
import { LMRenderer } from "./renderer.js";
import type { LMSection } from "./renderer.js";
import { getLabel } from "../i18n/i18n.js";

const L =
    typeof globalThis !== "undefined" ? (globalThis as unknown as { L?: LeafletL }).L : undefined;

interface LeafletL {
    Control: {
        extend: (props: Record<string, unknown>) => new (opts: unknown) => LMControlInstance;
    };
    DomUtil: { create: (tag: string, cls: string, parent?: HTMLElement) => HTMLElement };
    DomEvent: {
        on: (el: HTMLElement, ev: string, fn: (ev: Event) => void) => void;
        stopPropagation: (ev: Event) => void;
        disableClickPropagation: (el: HTMLElement) => void;
        disableScrollPropagation: (el: HTMLElement) => void;
    };
    setOptions: (obj: unknown, opts: unknown) => void;
}

export interface LMControlOptions {
    position?: string;
    title?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    collapsedByDefault?: boolean;
    sections?: LMSection[];
}

interface LMControlInstance {
    _map: unknown;
    _container: HTMLElement | null;
    _bodyEl: HTMLElement;
    _glOptions: LMControlOptions & { sections?: LMSection[] };
    _buildStructure(): void;
    _renderSections(sections: LMSection[]): void;
    _toggleCollapsed(): void;
    updateSections(sections: unknown[]): void;
    refresh(): void;
}

function _buildLMHeader(opts: LMControlOptions, mainWrapper: HTMLElement): HTMLElement {
    const headerWrapper = L!.DomUtil.create("div", "gl-layer-manager__header-wrapper", mainWrapper);
    const header = L!.DomUtil.create("div", "gl-layer-manager__header", headerWrapper);
    const titleEl = L!.DomUtil.create("div", "gl-layer-manager__title", header);
    titleEl.textContent = opts.title || "Legend";
    return header;
}

function _buildLMCollapsibleToggle(header: HTMLElement, self: LMControlInstance): void {
    const toggleEl = L!.DomUtil.create(
        "button",
        "gl-layer-manager__toggle",
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

function _buildLMBody(
    instance: LMControlInstance,
    opts: LMControlOptions,
    mainWrapper: HTMLElement
): void {
    const bodyWrapper = L!.DomUtil.create("div", "gl-layer-manager__body-wrapper", mainWrapper);
    instance._bodyEl = L!.DomUtil.create("div", "gl-layer-manager__body", bodyWrapper);
    const initialCollapsed = opts.collapsed ?? opts.collapsedByDefault ?? false;
    if (initialCollapsed) {
        instance._container!.classList.add("gl-layer-manager--collapsed");
        opts.collapsed = true;
    }
    if (LMRenderer)
        LMRenderer.renderSections(instance._bodyEl, (opts.sections ?? []) as LMSection[]);
    else if (Log) Log.error("[LayerManager] _LayerManagerRenderer non disponible");
}

function _doLMOnAdd(instance: LMControlInstance, mapInstance: unknown): HTMLElement | null {
    instance._map = mapInstance;
    instance._container = L!.DomUtil.create("div", "gl-layer-manager");
    if (L!.DomEvent) {
        L!.DomEvent.disableClickPropagation(instance._container);
        L!.DomEvent.disableScrollPropagation(instance._container);
    }
    instance._buildStructure();
    return instance._container;
}

function _buildLMControlClass(options: LMControlOptions) {
    return L!.Control.extend({
        options: { position: options.position || "bottomright" },
        initialize(
            this: LMControlInstance,
            controlOptions: { _glOptions?: LMControlOptions & { sections?: LMSection[] } }
        ) {
            L!.setOptions(this, controlOptions || {});
            this._glOptions = (controlOptions?._glOptions ??
                options) as LMControlInstance["_glOptions"];
        },
        onAdd(this: LMControlInstance, mapInstance: unknown) {
            return _doLMOnAdd(this, mapInstance);
        },
        onRemove(this: LMControlInstance) {
            this._map = null;
            this._container = null;
        },
        _buildStructure(this: LMControlInstance) {
            const opts = this._glOptions;
            const mainWrapper = L!.DomUtil.create(
                "div",
                "gl-layer-manager__main-wrapper",
                this._container!
            );
            const header = _buildLMHeader(opts, mainWrapper);
            if (opts.collapsible) _buildLMCollapsibleToggle(header, this);
            _buildLMBody(this, opts, mainWrapper);
        },
        _renderSections(this: LMControlInstance, sections: LMSection[]) {
            if (LMRenderer) LMRenderer.renderSections(this._bodyEl, sections);
            else if (Log) Log.error("[LayerManager] _LayerManagerRenderer non disponible");
        },
        updateSections(this: LMControlInstance, sections: LMSection[]) {
            this._glOptions.sections = Array.isArray(sections) ? sections : [];
            this._renderSections(this._glOptions.sections);
        },
        refresh(this: LMControlInstance) {
            if (LMRenderer && typeof LMRenderer.syncToggles === "function")
                LMRenderer.syncToggles();
            else if (this._glOptions?.sections) this._renderSections(this._glOptions.sections);
        },
        _toggleCollapsed(this: LMControlInstance) {
            const isCollapsed = this._container!.classList.toggle("gl-layer-manager--collapsed");
            this._glOptions.collapsed = isCollapsed;
        },
    });
}

function createLayerManagerControl(options: LMControlOptions): LMControlInstance | null {
    if (!L || !L.Control) {
        if (Log) Log.error("[LayerManager] Leaflet L.Control non disponible");
        return null;
    }
    const LayerManagerControlClass = _buildLMControlClass(options);
    return new LayerManagerControlClass({
        position: options.position,
        _glOptions: options,
    }) as LMControlInstance;
}

const LMControl = {
    create: createLayerManagerControl,
};
export { LMControl };
