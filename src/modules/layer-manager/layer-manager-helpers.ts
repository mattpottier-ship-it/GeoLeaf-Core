/* eslint-disable security/detect-object-injection */
/**
 * GeoLeaf LayerManager — Pure Helper Functions
 * Extracted from layer-manager-api.ts — Sprint 1 refactoring.
 * Contains stateless helpers used during LayerManager initialization.
 *
 * @module layer-manager/layer-manager-helpers
 */

"use strict";

import { Log } from "../log/index.js";

/**
 * Merges a layerManagerConfig object into the module options.
 * Adds/updates sections based on configuration, sorted by order.
 * @internal
 */
export function _applyLayerManagerConfig(lmConfig: any, options: any): void {
    if (lmConfig.title) options.title = lmConfig.title;

    if (typeof lmConfig.collapsedByDefault === "boolean")
        options.collapsed = lmConfig.collapsedByDefault;

    if (!(Array.isArray(lmConfig.sections) && lmConfig.sections.length > 0)) return;

    const configSections = lmConfig.sections
        .slice()
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((s: any) => ({
            id: s.id,
            label: s.label,
            order: s.order,
            collapsedByDefault: s.collapsedByDefault,
            items: [],
        }));

    if (!Array.isArray(options.sections)) options.sections = [];

    configSections.forEach((configSection: any) => {
        const existingSection = options.sections.find((s: any) => s.id === configSection.id);
        if (!existingSection) {
            options.sections.push(configSection);
        } else if (configSection.label && !existingSection.label) {
            existingSection.label = configSection.label;
        }
    });

    options.sections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    Log?.info("[GeoLeaf.LayerManager] Sections merged with layerManagerConfig");
}

/**
 * Resolves the current basemap definitions from Baselayers or Config.
 * @internal
 */
export function _resolveBasemapDefs(g: any): Record<string, any> | null {
    if (g.GeoLeaf?.Baselayers && typeof g.GeoLeaf.Baselayers.getBaseLayers === "function") {
        return g.GeoLeaf.Baselayers.getBaseLayers() || {};
    }
    if (g.GeoLeaf.Config && typeof g.GeoLeaf.Config.get === "function") {
        return g.GeoLeaf.Config.get("basemaps") || {};
    }
    return null;
}

/**
 * Builds the auto-populated basemap section items from the basemap definitions.
 * @internal
 */
export function _buildAutoBasemapSections(g: any): any[] {
    const defs = _resolveBasemapDefs(g);
    if (!defs || Object.keys(defs).length === 0) return [];
    const baseItems = Object.keys(defs).map((k) => ({ id: k, label: (defs[k] || {}).label || k }));
    return baseItems.length ? [{ id: "basemap", label: "Fond de carte", items: baseItems }] : [];
}

/**
 * Creates a layer entry descriptor for the layer manager.
 * @internal
 */
export function _createLayerEntry(layerId: any, options: any): any {
    return {
        id: layerId,
        label: options.label || layerId,
        toggleable: true,
        themes: options.themes || null,
        styles: options.styles || null,
        labels: options.labels || null,
    };
}

/**
 * Merges a new item into an existing section's items array (upsert by id).
 * @internal
 */
export function _mergeItem(existing: any, newItem: any): void {
    const idx = existing.items.findIndex((i: any) => i.id === newItem.id);
    if (idx !== -1) {
        existing.items[idx] = Object.assign({}, existing.items[idx], newItem);
    } else {
        existing.items.push(newItem);
    }
}

/**
 * Merges a section descriptor into an existing section (items, label, order, collapsedByDefault).
 * @internal
 */
export function _mergeSection(existing: any, section: any): void {
    if (Array.isArray(section.items)) {
        if (!Array.isArray(existing.items)) existing.items = [];
        section.items.forEach((item: any) => _mergeItem(existing, item));
        existing.items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    }
    if (section.label) existing.label = section.label;
    if (section.order !== undefined) existing.order = section.order;
    if (section.collapsedByDefault !== undefined)
        existing.collapsedByDefault = section.collapsedByDefault;
}

/**
 * Resolves the Leaflet map instance from options or GeoLeaf.Core.
 * @internal
 */
export function _resolveMap(options: any, g: any): any {
    let map = options.map || null;
    if (!map && g.GeoLeaf.Core && typeof g.GeoLeaf.Core.getMap === "function") {
        map = g.GeoLeaf.Core.getMap();
    }
    return map;
}
