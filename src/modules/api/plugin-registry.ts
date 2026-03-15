/*!
 * GeoLeaf Core – API / PluginRegistry
 * © 2026 Mattieu Pottier — MIT License
 */

/**
 * Lightweight registry of loaded GeoLeaf plugins and modules.
 * Allows integrators to query available capabilities.
 *
 * @module api/plugin-registry
 * @example
 * GeoLeaf.plugins.isLoaded('storage')      // → true/false
 * GeoLeaf.plugins.getLoadedPlugins()        // → ['core', 'storage', 'labels']
 * GeoLeaf.plugins.canActivate('addpoi')     // → true if dependencies OK
 */

const _registry = new Map(); // name → { name, version, loaded, loadedAt, metadata }

const _lazyResolvers = new Map(); // name → () => Promise<void>

export const PluginRegistry = {
    /**
     * Registers a plugin as loaded.
     * Called automatically by globals.js and plugin files.
     * @param {string} name - Plugin identifier (e.g. 'storage', 'addpoi', 'labels')
     * @param {object} [metadata] - Optional metadata { version, requires, optional }
     */
    register(name: any, metadata: any = {}) {
        _registry.set(name, {
            name,
            version: metadata.version || null,
            loaded: true,
            loadedAt: Date.now(),
            requires: metadata.requires || [],
            optional: metadata.optional || [],
            label: metadata.label || name,
            healthCheck: metadata.healthCheck || null,
        });
    },

    /**
     * Registers a lazy resolver (called by bundle-entry.js).
     * @param {string} name
     * @param {Function} resolver - () => Promise<void>
     */
    registerLazy(name: any, resolver: any) {
        _lazyResolvers.set(name, resolver);
    },

    /**
     * Checks if a plugin is currently loaded.
     * @param {string} name
     * @returns {boolean}
     */
    isLoaded(name: any) {
        return _registry.has(name) && _registry.get(name).loaded === true;
    },

    /**
     * Checks if a plugin can be activated (its `requires` dependencies are loaded).
     * @param {string} name
     * @returns {boolean}
     */
    canActivate(name: any) {
        const entry = _registry.get(name);
        if (!entry) return _lazyResolvers.has(name);
        return entry.requires.every((dep: any) => PluginRegistry.isLoaded(dep));
    },

    /**
     * Loads a plugin lazy par son nom.
     * @param {string} name
     * @returns {Promise<void>}
     */
    async load(name: any) {
        if (PluginRegistry.isLoaded(name)) return;
        const resolver = _lazyResolvers.get(name);
        if (!resolver)
            throw new Error(
                `[GeoLeaf.plugins] Module inconnu : "${name}". Modules disponibles : ${[..._lazyResolvers.keys()].join(", ")}`
            );
        await resolver();
    },

    /**
     * Returns the list of loaded plugin names.
     * @returns {string[]}
     */
    getLoadedPlugins() {
        return [..._registry.keys()].filter((k) => _registry.get(k).loaded);
    },

    /**
     * Returns the list of all availabthe modules (loaded + lazy available).
     * @returns {string[]}
     */
    getAvailableModules() {
        return [...new Set([..._registry.keys(), ..._lazyResolvers.keys()])];
    },

    /**
     * Returns the metadata of a plugin.
     * @param {string} name
     * @returns {object|null}
     */
    getInfo(name: any) {
        return _registry.get(name) || null;
    },

    /**
     * Prints a console report of loaded premium plugins.
     * Silent if no premium plugin is loaded (core only).
     */
    reportPremiumPlugins() {
        const CORE_MODULES = new Set([
            "core",
            "labels",
            "route",
            "table",
            "legend",
            "layerManager",
            "themes",
            "basemapSelector",
            "poiCore",
            "poiRenderers",
            "poiExtras",
            "poi",
            "basemap-selector",
        ]);
        const premium = [..._registry.values()].filter(
            (e) => e.loaded && !CORE_MODULES.has(e.name)
        );
        if (premium.length === 0) {
            console.info(
                "%c[PLUGINS] Core MIT — 0 premium plugin loaded",
                "color:#6b7280;font-style:italic"
            );
            return;
        }

        // eslint-disable-next-line no-console
        console.groupCollapsed(
            `%c[PLUGINS] ${premium.length} premium plugin(s) loaded`,
            "color:#7c3aed;font-weight:bold"
        );
        for (const entry of premium) {
            const healthy = typeof entry.healthCheck === "function" ? entry.healthCheck() : true;
            const icon = healthy ? "✅" : "❌";
            const color = healthy ? "color:#16a34a" : "color:#dc2626";
            const label = entry.label || entry.name;
            const version = entry.version ? ` v${entry.version}` : "";
            const status = healthy ? "OK" : "ERREUR — module incomplet";
            console.log(`%c  ${icon} ${label}${version}  [${status}]`, color); // eslint-disable-line no-console
            if (!healthy) {
                console.warn(
                    // eslint-disable-line no-console
                    `     [PLUGINS] ${entry.name} : healthCheck failed — check plugin loading.`
                );
            }
        }
        console.groupEnd(); // eslint-disable-line no-console
    },

    // Internal access — do not use outside GeoLeaf
    _registry,
    _lazyResolvers,
};
