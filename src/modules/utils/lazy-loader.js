/**
 * @fileoverview GeoLeaf Lazy Loading Module
 * Sprint 3.4: Advanced lazy loading for modules, images, and code splitting
 *
 * Features:
 * - Module lazy loading with caching
 * - Image lazy loading with intersection observer
 * - Dynamic imports for code splitting
 * - Performance monitoring
 * - Error handling and fallbacks
 *
 * @version 1.0.0
 * @author GeoLeaf Team
 * @since 2026-01-17
 */

import { Log } from "../log/index.js";

// Phase 7 B2 fix: globalThis used directly (replaces legacy namespace shim from _namespace.js)
const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

("use strict");

/**
 * Lazy Loading Configuration
 */
const DEFAULT_CONFIG = {
    // Module loading
    modules: {
        timeout: 15000,
        retries: 2,
        cacheBust: false,
    },
    // Image lazy loading
    images: {
        rootMargin: "50px",
        threshold: 0.1,
        loadingClass: "lazy-loading",
        loadedClass: "lazy-loaded",
        errorClass: "lazy-error",
    },
    // Code splitting
    chunks: {
        preload: ["core", "ui"],
        defer: ["poi", "geojson", "route", "legend"],
    },
};

/**
 * Module cache for loaded modules
 */
const moduleCache = new Map();
const loadingPromises = new Map();

/**
 * Performance metrics
 */
const metrics = {
    modulesLoaded: 0,
    imagesLoaded: 0,
    totalLoadTime: 0,
    errors: 0,
};

/**
 * @class LazyLoader
 * @description Advanced lazy loading system for GeoLeaf
 */
export class LazyLoader {
    constructor(config = {}) {
        this.config = this._mergeConfig(DEFAULT_CONFIG, config);
        this.imageObserver = null;
        this.init();
    }

    /**
     * Initialize lazy loader
     */
    init() {
        // B2 [PERF-02]: _initImageObserver() est désormais différé au premier scan()
        // via _ensureObserver() — évite une allocation IntersectionObserver inutile au boot.
        this._preloadCoreModules();

        if (Log) {
            Log.info("[GeoLeaf.Utils.LazyLoader] Lazy loading system initialized");
        }
    }

    /**
     * Lazy load a module dynamically
     * @param {string} moduleName - Module identifier
     * @param {string} modulePath - Path to module file
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Module exports
     */
    async loadModule(moduleName, modulePath, options = {}) {
        const startTime = performance.now();

        try {
            // Check cache first
            if (moduleCache.has(moduleName)) {
                return moduleCache.get(moduleName);
            }

            // Check if already loading
            if (loadingPromises.has(moduleName)) {
                return await loadingPromises.get(moduleName);
            }

            // Create loading promise
            const loadingPromise = this._loadModuleScript(moduleName, modulePath, options);
            loadingPromises.set(moduleName, loadingPromise);

            const result = await loadingPromise;

            // Cache and metrics
            moduleCache.set(moduleName, result);
            loadingPromises.delete(moduleName);

            const loadTime = performance.now() - startTime;
            metrics.modulesLoaded++;
            metrics.totalLoadTime += loadTime;

            if (Log) {
                Log.info(`[LazyLoader] Module "${moduleName}" loaded in ${loadTime.toFixed(2)}ms`);
            }

            return result;
        } catch (error) {
            loadingPromises.delete(moduleName);
            metrics.errors++;

            if (Log) {
                Log.error(`[LazyLoader] Failed to load module "${moduleName}":`, error);
            }

            throw error;
        }
    }

    /**
     * Load module dynamically via ESM import() — remplace l'ancienne injection <script>
     * B6 [DEAD-04]: _loadModuleScript() (script injection) supprimé — remplacé par import()
     * @private
     */
    async _loadModuleScript(moduleName, modulePath, options) {
        const config = { ...this.config.modules, ...options };
        const finalPath = config.cacheBust ? `${modulePath}?v=${Date.now()}` : modulePath;

        const importPromise = import(/* webpackIgnore: true */ finalPath);

        if (!config.timeout) return importPromise;

        // Timeout wrapper
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Module "${moduleName}" load timeout`)),
                config.timeout
            )
        );
        return Promise.race([importPromise, timeoutPromise]);
    }

    /**
     * Extract module exports from global namespace
     * @private
     */
    _extractModuleExports(moduleName) {
        // Common patterns for GeoLeaf modules
        const patterns = [
            `GeoLeaf.${moduleName}`,
            `GeoLeaf._${moduleName}`,
            `GeoLeaf.Utils.${moduleName}`,
            moduleName,
        ];

        for (const pattern of patterns) {
            const moduleExports = this._getNestedProperty(_g, pattern);
            if (moduleExports) {
                return moduleExports;
            }
        }

        // Fallback - return the module name (for modules that register themselves)
        return { name: moduleName, loaded: true };
    }

    /**
     * Get nested property from object
     * @private
     */
    _getNestedProperty(obj, path) {
        return path.split(".").reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * Garantit que l'ImageObserver est initialisé avant utilisation (lazy-init)
     * B2 [PERF-02]: création différée au premier appel de scan() ou enableImageLazyLoading()
     * @private
     */
    _ensureObserver() {
        if (!this.imageObserver) {
            this._initImageObserver();
        }
    }

    /**
     * Initialize image lazy loading with Intersection Observer
     * @private
     * @note Ne pas appeler _loadAllImages() ici : la requête DOM doit être différée
     *       jusqu'au premier appel explicite de scan() / enableImageLazyLoading().
     */
    _initImageObserver() {
        if (!("IntersectionObserver" in window)) {
            // Fallback pour navigateurs anciens — pas de requête DOM ici.
            // enableImageLazyLoading() / scan() gère le fallback naturellement
            // (imageObserver === null → chargement direct dans enableImageLazyLoading).
            return;
        }

        this.imageObserver = new IntersectionObserver(
            (entries) => this._handleImageIntersection(entries),
            {
                rootMargin: this.config.images.rootMargin,
                threshold: this.config.images.threshold,
            }
        );
    }

    /**
     * Handle image intersection
     * @private
     */
    _handleImageIntersection(entries) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this._loadImage(img);
                this.imageObserver.unobserve(img);
            }
        });
    }

    /**
     * Load a single image
     * @private
     */
    _loadImage(img) {
        const config = this.config.images;

        img.classList.add(config.loadingClass);

        const startTime = performance.now();

        const tempImg = new Image();

        tempImg.onload = () => {
            img.src = tempImg.src;
            img.classList.remove(config.loadingClass);
            img.classList.add(config.loadedClass);

            const loadTime = performance.now() - startTime;
            metrics.imagesLoaded++;

            if (Log) {
                Log.debug(`[LazyLoader] Image loaded in ${loadTime.toFixed(2)}ms: ${img.src}`);
            }
        };

        tempImg.onerror = () => {
            img.classList.remove(config.loadingClass);
            img.classList.add(config.errorClass);
            metrics.errors++;

            if (Log) {
                Log.warn(`[LazyLoader] Image load failed: ${tempImg.src}`);
            }
        };

        tempImg.src = img.dataset.src || img.src;
    }

    /**
     * Enable lazy loading for images
     * @param {string} selector - CSS selector for images (default: 'img[data-src]')
     */
    enableImageLazyLoading(selector = "img[data-src]") {
        this._ensureObserver(); // B2: init différé au premier appel
        const images = document.querySelectorAll(selector);

        if (this.imageObserver) {
            images.forEach((img) => this.imageObserver.observe(img));
        } else {
            // Fallback - load all images immediately
            images.forEach((img) => this._loadImage(img));
        }

        if (Log) {
            Log.info(`[LazyLoader] Enabled lazy loading for ${images.length} images`);
        }
    }

    /**
     * Scanne le DOM et active le lazy loading sur les images trouvées.
     * C'est ici que la requête DOM est effectuée — jamais dans le constructeur.
     * @param {string} [selector='img[data-src]'] - Sélecteur CSS
     * @returns {number} Nombre d'images trouvées
     */
    scan(selector = "img[data-src]") {
        this._ensureObserver(); // B2: init différé au premier appel
        const images = document.querySelectorAll(selector);
        if (images.length) {
            if (this.imageObserver) {
                images.forEach((img) => this.imageObserver.observe(img));
            } else {
                // Fallback : pas d'IntersectionObserver — chargement immédiat
                images.forEach((img) => this._loadImage(img));
            }
            if (Log) {
                Log.info(`[LazyLoader] scan() — ${images.length} image(s) trouvée(s)`);
            }
        }
        return images.length;
    }

    /**
     * Initialise le lazy loading en différant le scan jusqu'au DOMContentLoaded
     * si le DOM n'est pas encore prêt. Remplace l'auto-scan du constructeur.
     * @param {object} [options={}]
     * @param {boolean} [options.autoScan=true] - Lancer automatiquement scan()
     * @param {string} [options.selector='img[data-src]'] - Sélecteur CSS
     */
    initialize(options = {}) {
        const { autoScan = true, selector = "img[data-src]" } = options;
        if (!autoScan) return;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.scan(selector), {
                once: true,
            });
        } else {
            this.scan(selector);
        }
    }

    /**
     * Preload core modules
     * @private
     */
    _preloadCoreModules() {
        const coreModules = this.config.chunks.preload;

        coreModules.forEach((moduleName) => {
            // Only preload if not already loaded
            if (!moduleCache.has(moduleName) && this._shouldPreloadModule(moduleName)) {
                this._preloadModule(moduleName);
            }
        });
    }

    /**
     * Check if module should be preloaded
     * @private
     */
    _shouldPreloadModule(moduleName) {
        // Check if module is already available in GeoLeaf namespace
        const moduleExists = this._extractModuleExports(moduleName);
        return !moduleExists || moduleExists.name === moduleName;
    }

    /**
     * Preload a module (non-blocking)
     * @private
     */
    _preloadModule(moduleName) {
        const modulePath = this._getModulePath(moduleName);
        if (modulePath) {
            // Create link prefetch for better performance
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.href = modulePath;
            document.head.appendChild(link);

            if (Log) {
                Log.debug(`[LazyLoader] Prefetching module: ${moduleName}`);
            }
        }
    }

    /**
     * Get module path from name
     * @private
     */
    _getModulePath(moduleName) {
        // Common GeoLeaf module paths
        const pathMap = {
            poi: "poi/add-form-orchestrator.js",
            geojson: "geojson/loader.js",
            route: "geoleaf.route.js",
            legend: "geoleaf.legend.js",
            themes: "themes/theme-loader.js",
        };

        const basePath = this._getBasePath();
        return pathMap[moduleName] ? `${basePath}/${pathMap[moduleName]}` : null;
    }

    /**
     * Get base path for GeoLeaf modules
     * @private
     */
    _getBasePath() {
        // Try to detect base path from current script
        const scripts = document.getElementsByTagName("script");
        for (const script of scripts) {
            if (script.src && script.src.includes("geoleaf")) {
                const srcParts = script.src.split("/");
                srcParts.pop(); // Remove filename
                return srcParts.join("/");
            }
        }
        // Fallback
        return "./src/modules";
    }

    /**
     * Load all images immediately (fallback)
     * @private
     */
    _loadAllImages() {
        const images = document.querySelectorAll("img[data-src]");
        images.forEach((img) => this._loadImage(img));
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...metrics,
            averageLoadTime:
                metrics.modulesLoaded > 0 ? metrics.totalLoadTime / metrics.modulesLoaded : 0,
        };
    }

    /**
     * Clear module cache
     */
    clearCache() {
        moduleCache.clear();
        loadingPromises.clear();

        if (Log) {
            Log.info("[LazyLoader] Module cache cleared");
        }
    }

    /**
     * Merge configuration objects
     * @private
     */
    _mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };

        for (const key in userConfig) {
            if (typeof userConfig[key] === "object" && !Array.isArray(userConfig[key])) {
                merged[key] = { ...defaultConfig[key], ...userConfig[key] };
            } else {
                merged[key] = userConfig[key];
            }
        }

        return merged;
    }
}

// Singleton lazy — perf 5.2: création différée au premier accès
let _lazyLoaderInstance = null;

export function getLazyLoader() {
    if (!_lazyLoaderInstance) {
        _lazyLoaderInstance = new LazyLoader();
    }
    return _lazyLoaderInstance;
}

// Auto-scan au démarrage via initialize() — la requête DOM est différée
// jusqu'au DOMContentLoaded ou à la microtâche post-parsing (jamais à l'import).
// perf 5.7 / C9: plus de querySelectorAll au niveau module.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            getLazyLoader().initialize();
        },
        { once: true }
    );
} else {
    // DOM déjà prêt : activer via microtâche pour ne pas bloquer le parsing
    Promise.resolve().then(() => getLazyLoader().initialize());
}
