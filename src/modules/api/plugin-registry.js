/*!
 * GeoLeaf Core – API / PluginRegistry
 * © 2026 Mattieu Pottier — MIT License
 */

/**
 * Registre léger des plugins et modules GeoLeaf chargés.
 * Permet aux intégrateurs d'interroger les capacités disponibles.
 *
 * @module api/plugin-registry
 * @example
 * GeoLeaf.plugins.isLoaded('storage')      // → true/false
 * GeoLeaf.plugins.getLoadedPlugins()        // → ['core', 'storage', 'labels']
 * GeoLeaf.plugins.canActivate('addpoi')     // → true si dépendances OK
 */

const _registry = new Map(); // name → { name, version, loaded, loadedAt, metadata }

const _lazyResolvers = new Map(); // name → () => Promise<void>

export const PluginRegistry = {
    /**
     * Enregistre un plugin comme chargé.
     * Appelé automatiquement par globals.js et les fichiers plugins.
     * @param {string} name - Identifiant du plugin (ex: 'storage', 'addpoi', 'labels')
     * @param {object} [metadata] - Métadonnées optionnelles { version, requires, optional }
     */
    register(name, metadata = {}) {
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
     * Enregistre un resolver lazy (appelé par bundle-entry.js).
     * @param {string} name
     * @param {Function} resolver - () => Promise<void>
     */
    registerLazy(name, resolver) {
        _lazyResolvers.set(name, resolver);
    },

    /**
     * Vérifie si un plugin est actuellement chargé.
     * @param {string} name
     * @returns {boolean}
     */
    isLoaded(name) {
        return _registry.has(name) && _registry.get(name).loaded === true;
    },

    /**
     * Vérifie si un plugin peut être activé (ses dépendances `requires` sont chargées).
     * @param {string} name
     * @returns {boolean}
     */
    canActivate(name) {
        const entry = _registry.get(name);
        if (!entry) return _lazyResolvers.has(name);
        return entry.requires.every((dep) => PluginRegistry.isLoaded(dep));
    },

    /**
     * Charge un plugin lazy par son nom.
     * @param {string} name
     * @returns {Promise<void>}
     */
    async load(name) {
        if (PluginRegistry.isLoaded(name)) return;
        const resolver = _lazyResolvers.get(name);
        if (!resolver)
            throw new Error(
                `[GeoLeaf.plugins] Module inconnu : "${name}". Modules disponibles : ${[..._lazyResolvers.keys()].join(", ")}`
            );
        await resolver();
    },

    /**
     * Retourne la liste des noms de plugins chargés.
     * @returns {string[]}
     */
    getLoadedPlugins() {
        return [..._registry.keys()].filter((k) => _registry.get(k).loaded);
    },

    /**
     * Retourne la liste de tous les modules disponibles (chargés + lazy disponibles).
     * @returns {string[]}
     */
    getAvailableModules() {
        return [...new Set([..._registry.keys(), ..._lazyResolvers.keys()])];
    },

    /**
     * Retourne les métadonnées d'un plugin.
     * @param {string} name
     * @returns {object|null}
     */
    getInfo(name) {
        return _registry.get(name) || null;
    },

    /**
     * Affiche dans la console un rapport des plugins premium chargés.
     * Silencieux si aucun plugin premium n'est chargé (core seul).
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
            console.info("%c[PLUGINS] Core MIT — 0 plugin premium chargé", "color:#6b7280;font-style:italic");
            return;
        }

        console.groupCollapsed(
            // eslint-disable-line no-console
            `%c[PLUGINS] ${premium.length} plugin(s) premium chargé(s)`,
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
                    `     [PLUGINS] ${entry.name} : healthCheck échoué — vérifiez le chargement du plugin.`
                );
            }
        }
        console.groupEnd(); // eslint-disable-line no-console
    },

    // Accès interne — ne pas utiliser en dehors de GeoLeaf
    _registry,
    _lazyResolvers,
};
