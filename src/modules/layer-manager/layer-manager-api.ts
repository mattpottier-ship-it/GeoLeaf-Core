/* eslint-disable security/detect-object-injection */
/**



 * GeoLeaf LayerManager API (assemblage namespace LayerManager)



 * @module layer-manager/layer-manager-api



 */

/*!



 * GeoLeaf Core



 * © 2026 Mattieu Pottier



 * Released under the MIT License



 * https://geoleaf.dev



 */

"use strict";

import { Log } from "../log/index.js";

function _applyLayerManagerConfig(lmConfig: any, options: any): void {
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

function _resolveBasemapDefs(g: any): Record<string, any> | null {
    if (g.GeoLeaf?.Baselayers && typeof g.GeoLeaf.Baselayers.getBaseLayers === "function") {
        return g.GeoLeaf.Baselayers.getBaseLayers() || {};
    }

    if (g.GeoLeaf.Config && typeof g.GeoLeaf.Config.get === "function") {
        return g.GeoLeaf.Config.get("basemaps") || {};
    }

    return null;
}

function _buildAutoBasemapSections(g: any): any[] {
    const defs = _resolveBasemapDefs(g);

    if (!defs || Object.keys(defs).length === 0) return [];

    const baseItems = Object.keys(defs).map((k) => ({ id: k, label: (defs[k] || {}).label || k }));

    return baseItems.length ? [{ id: "basemap", label: "Fond de carte", items: baseItems }] : [];
}

function _createLayerEntry(layerId: any, options: any): any {
    return {
        id: layerId,

        label: options.label || layerId,

        toggleable: true,

        themes: options.themes || null,

        styles: options.styles || null,

        labels: options.labels || null,
    };
}

function _mergeItem(existing: any, newItem: any): void {
    const idx = existing.items.findIndex((i: any) => i.id === newItem.id);

    if (idx !== -1) {
        existing.items[idx] = Object.assign({}, existing.items[idx], newItem);
    } else {
        existing.items.push(newItem);
    }
}

function _mergeSection(existing: any, section: any): void {
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

function _resolveMap(options: any, g: any): any {
    let map = options.map || null;

    if (!map && g.GeoLeaf.Core && typeof g.GeoLeaf.Core.getMap === "function") {
        map = g.GeoLeaf.Core.getMap();
    }

    return map;
}

const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

_g.GeoLeaf = _g.GeoLeaf || {};

/**



 * Namespace global GeoLeaf



 */

/**



 * Logger unified



 */

/**



 * Module GeoLeaf.LayerManager (REFACTORED v3.0)



 *



 * ARCHITECTURE MODULAIRE :



 * - layer-manager/shared.js : Shared state



 * - layer-manager/control.js : Controle Leaflet (L.Control)



 * - layer-manager/renderer.js : Rendu des sections et items



 * - layer-manager/basemap-selector.js : Selector de base maps



 * - layer-manager/theme-selector.js : Selector de themes



 * - geoleaf.layer-manager.js (this file): Public aggregator/facade



 *



 * REQUIRED DEPENDENCIES (loadedes avant ce module) :



 * - layer-manager/shared.js → GeoLeaf._LayerManagerShared



 * - layer-manager/renderer.js → GeoLeaf._LayerManagerRenderer



 * - layer-manager/basemap-selector.js → GeoLeaf._LayerManagerBasemapSelector



 * - layer-manager/theme-selector.js → GeoLeaf._LayerManagerThemeSelector



 * - layer-manager/control.js → GeoLeaf._LayerManagerControl



 *



 * Role :



 * - Createsr un controle Leaflet de manager for layers pour GeoLeaf



 * - Displays structured sections (basemaps, layers, categories)



 * - Handle un mode collapsible (collapsible)



 * - Preparation for integration with the Legend module (Phase 6)



 */

const LayerManagerModule = {
    /**



     * Reference to the Leaflet map



     * @type {L.Map|null}



     * @private



     */

    _map: null as any,

    /**



     * Reference to the Leaflet legend control



     * @type {L.Control|null}



     * @private



     */

    _control: null as any,

    /**



     * Timeout for the debounce du refresh



     * @type {number|null}



     * @private



     */

    _refreshTimeout: null as any,

    /**



     * Options internals of the module



     * @type {Object}



     * @private



     */

    _options: {
        position: "bottomright",

        title: "Gestionnaire de layers",

        collapsible: true,

        collapsed: false,

        sections: [] as any[],
    } as any,

    /**



     * Initialization of the module LayerManager



     *



     * @param {Object} options



     * @param {L.Map} [options.map] - Carte Leaflet (si absent, tentative via GeoLeaf.Core.getMap())



     * @param {string} [options.position]



     * @param {string} [options.title]



     * @param {boolean} [options.collapsible]



     * @param {boolean} [options.collapsed]



     * @param {Array} [options.sections]



     * @returns {L.Control|null} - The control LayerManager ou null



     */

    init(options: any = {}) {
        if (typeof _g.L === "undefined" || !_g.L || !_g.L.Control) {
            Log?.error("[GeoLeaf.LayerManager] Leaflet (L.Control) est required mais introuvable.");

            return null;
        }

        const map = _resolveMap(options, _g);

        if (!map) {
            Log?.error(
                "[GeoLeaf.LayerManager] Aucune carte Leaflet disponible. Passe une instance dans init({ map })."
            );

            return null;
        }

        this._map = map;

        Log?.info("[GeoLeaf.LayerManager] init: map assigned");

        this._options = this._mergeOptions(this._options, options);

        // Loadsr les sections from theyerManagerConfig si availables

        this._loadConfigSections();

        // Remplir automaticment la section basemap

        this._autoPopulateBasemap();

        // Autofill minimum si aucune section

        this._autoPopulateSections();

        // Createsr the control Leaflet via le sous-module

        if (!_g.GeoLeaf._LayerManagerControl) {
            Log?.error("[GeoLeaf.LayerManager] Module _LayerManagerControl not loaded");

            return null;
        }

        this._control = _g.GeoLeaf._LayerManagerControl.create(this._options);

        if (!this._control) {
            Log?.error("[GeoLeaf.LayerManager] Failed to create control");

            return null;
        }

        this._control.addTo(this._map);

        Log?.info("[GeoLeaf.LayerManager] Control created and added to map");

        return this._control;
    },

    /**



     * Loads thes sections from the configuration



     * @private



     */

    _loadConfigSections() {
        if (!(_g.GeoLeaf.Config && typeof _g.GeoLeaf.Config.get === "function")) return;

        const layerManagerConfig = _g.GeoLeaf.Config.get("layerManagerConfig");

        if (_g.GeoLeaf.Log)
            _g.GeoLeaf.Log.debug("[LayerManager] Configuration loaded:", {
                title: layerManagerConfig?.title,

                collapsed: layerManagerConfig?.collapsedByDefault,

                sectionsCount: layerManagerConfig?.sections?.length || 0,
            });

        if (layerManagerConfig) _applyLayerManagerConfig(layerManagerConfig, this._options);
    },

    /**



     * Remplit automaticment la section basemap



     * @private



     */

    _autoPopulateBasemap() {
        if (!Array.isArray(this._options.sections)) return;

        const basemapSection = this._options.sections.find((s: any) => s.id === "basemap");

        if (basemapSection && (!basemapSection.items || basemapSection.items.length === 0)) {
            try {
                const basemapDefs = _resolveBasemapDefs(_g);

                if (basemapDefs && Object.keys(basemapDefs).length > 0) {
                    basemapSection.items = Object.keys(basemapDefs).map((k) => {
                        const d = basemapDefs[k] || {};

                        return { id: d.id || k, label: d.label || k };
                    });

                    Log?.info("[GeoLeaf.LayerManager] Section basemap remplie automatically");
                }
            } catch (e) {
                Log?.warn(
                    "[GeoLeaf.LayerManager] Erreur lors du remplissage automatic des basemaps:",
                    e
                );
            }
        }
    },

    /**



     * Autofill minimum des sections



     * @private



     */

    _autoPopulateSections() {
        if (Array.isArray(this._options.sections) && this._options.sections.length > 0) return;

        let autoSections: any[] = [];

        try {
            autoSections = _buildAutoBasemapSections(_g);
        } catch (_e) {
            // ignore
        }

        if (autoSections.length) {
            this._options.sections = autoSections;

            Log?.info("[GeoLeaf.LayerManager] auto-populated sections from Baselayers");
        } else {
            Log?.warn(
                "[GeoLeaf.LayerManager] Aucune section fournie et autoremplissage impossible."
            );
        }
    },

    /**



     * Registers ae GeoJSON layer dans the legend



     * @param {string} layerId - ID de the layer



     * @param {Object} options - Options de the layer



     */

    _registerGeoJsonLayer(layerId: any, options: any = {}) {
        // ...log deleted ([LayerManager] _registerGeoJsonLayer called pour)...

        if (!this._options.sections) {
            this._options.sections = [];
        }

        // Utiliser layerManagerId ou legendSection (backward compatibility)

        const sectionId = options.layerManagerId || options.legendSection || "geojson-default";

        let section = this._options.sections.find((s: any) => s.id === sectionId);

        if (!section) {
            section = {
                id: sectionId,

                label: options.legendSectionLabel || "Couches GeoJSON",

                order: 10,

                items: [],
            };

            this._options.sections.push(section);

            this._options.sections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        }

        const existingItem = section.items.find((item: any) => item.id === layerId);

        if (!existingItem) {
            section.items.push(_createLayerEntry(layerId, options));

            this._updateContent();

            Log?.debug(`[LayerManager] Layer "${layerId}" registered in section "${sectionId}"`);
        }
    },

    /**



     * Unregisters a GeoJSON layer from the legend



     * @param {string} layerId - ID de the layer



     */

    _unregisterGeoJsonLayer(layerId: any) {
        if (!Array.isArray(this._options.sections)) return;

        this._options.sections.forEach((section: any) => {
            if (Array.isArray(section.items)) {
                section.items = section.items.filter((item: any) => item.id !== layerId);
            }
        });

        this._options.sections = this._options.sections.filter(
            (section: any) =>
                section.id === "basemap" ||
                (Array.isArray(section.items) && section.items.length > 0)
        );

        this._updateContent();

        if (Log) Log.debug(`[LayerManager] Layer "${layerId}" unregistered`);
    },

    /**



     * Updates thes sections de the legend



     * @param {Array} sections - Nouvelles sections



     */

    updateSections(sections: any) {
        if (!Array.isArray(sections)) {
            if (Log) Log.warn("[GeoLeaf.LayerManager] updateSections: sections must be an array");

            return;
        }

        this._options.sections = sections;

        this._updateContent();
    },

    /**



     * Adds ou met up to date une section dans the legend



     * @param {Object} section - Section to add {id, label, order, items}



     */

    addSection(section: any) {
        if (!section || !section.id) {
            Log?.warn("[GeoLeaf.LayerManager] addSection: invalid section (missing id)");

            return;
        }

        if (!Array.isArray(this._options.sections)) {
            this._options.sections = [];
        }

        // Chercher une section existing with the same id

        const existingIndex = this._options.sections.findIndex((s: any) => s.id === section.id);

        if (existingIndex !== -1) {
            _mergeSection(this._options.sections[existingIndex], section);
        } else {
            // Addsr la nouvelle section

            this._options.sections.push({
                id: section.id,

                label: section.label || section.id,

                order: section.order || 99,

                collapsedByDefault: section.collapsedByDefault || false,

                items: section.items || [],
            });

            // Trier les sections par order

            this._options.sections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        }

        this._updateContent();

        Log?.debug(`[LayerManager] Section "${section.id}" added/updated`);
    },

    /**



     * Switches the collapsed/expanded state of the legend



     */

    toggleCollapse() {
        this._options.collapsed = !this._options.collapsed;

        if (!this._control) return;

        if (this._options.collapsed) {
            this._control._container.classList.add("gl-layer-manager--collapsed");
        } else {
            this._control._container.classList.remove("gl-layer-manager--collapsed");
        }
    },

    /**



     * Returns whether the legend is collapsed



     * @returns {boolean}



     */

    isCollapsed() {
        return !!this._options.collapsed;
    },

    /**



     * Force le re-rendu du contenu



     * @private



     */

    _updateContent() {
        if (!this._control || typeof this._control.updateSections !== "function") {
            return;
        }

        this._control.updateSections(this._options.sections || []);
    },

    /**



     * Refreshes l'display du LayerManager



     * Used in particular after applying a theme to update toggle button states



     * Version debounced pour groupr les appels multiples (ex: plusieurs layers changent de visibility au zoom)



     * @public



     * @param {boolean} [immediate=false] - Si true, force le refresh immediate sans debounce



     */

    refresh(immediate = false) {
        if (!this._control || typeof this._control.refresh !== "function") {
            if (Log)
                Log.warn(
                    "[LayerManager] refresh(): control not available or refresh method missing"
                );

            return;
        }

        // If immediate refresh requested, cancel debounce and execute

        if (immediate) {
            if (this._refreshTimeout) {
                clearTimeout(this._refreshTimeout);

                this._refreshTimeout = null;
            }

            this._control.refresh();

            if (Log) Log.debug("[LayerManager] Display refreshed (immediate)");

            return;
        }

        // Debounce: cancel le timeout previous et programmer un nouveau refresh

        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }

        this._refreshTimeout = setTimeout(() => {
            this._refreshTimeout = null;

            this._control.refresh();

            if (Log) Log.debug("[LayerManager] Display refreshed (debounced)");
        }, 250);
    },

    /**



     * Fusion d'options (shallow + fusion lightweight pour sous-objects)



     * @param {Object} base



     * @param {Object} override



     * @returns {Object}



     * @private



     */

    _mergeOptions(base: any, override: any) {
        const result = Object.assign({}, base || {});

        if (!override) return result;

        Object.keys(override).forEach((key) => {
            const value = override[key];

            if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === "object" &&
                !Array.isArray(base[key])
            ) {
                result[key] = Object.assign({}, base[key], value);
            } else {
                result[key] = value;
            }
        });

        return result;
    },
};

const LayerManager = LayerManagerModule;

export { LayerManager };
