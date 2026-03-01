/**
 * @fileoverview GeoLeaf Lazy Loading Module
 * @version 1.0.0
 */

import { Log } from "../log/index.js";

const _g =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? (window as object) : ({} as Window);

interface LazyLoaderModulesConfig {
    timeout: number;
    retries: number;
    cacheBust: boolean;
}

interface LazyLoaderImagesConfig {
    rootMargin: string;
    threshold: number;
    loadingClass: string;
    loadedClass: string;
    errorClass: string;
}

interface LazyLoaderChunksConfig {
    preload: string[];
    defer: string[];
}

interface LazyLoaderConfig {
    modules: LazyLoaderModulesConfig;
    images: LazyLoaderImagesConfig;
    chunks: LazyLoaderChunksConfig;
}

const DEFAULT_CONFIG: LazyLoaderConfig = {
    modules: {
        timeout: 15000,
        retries: 2,
        cacheBust: false,
    },
    images: {
        rootMargin: "50px",
        threshold: 0.1,
        loadingClass: "lazy-loading",
        loadedClass: "lazy-loaded",
        errorClass: "lazy-error",
    },
    chunks: {
        preload: ["core", "ui"],
        defer: ["poi", "geojson", "route", "legend"],
    },
};

const moduleCache = new Map<string, unknown>();
const loadingPromises = new Map<string, Promise<unknown>>();

const metrics = {
    modulesLoaded: 0,
    imagesLoaded: 0,
    totalLoadTime: 0,
    errors: 0,
};

export class LazyLoader {
    config: LazyLoaderConfig;
    imageObserver: IntersectionObserver | null = null;

    constructor(config: Partial<LazyLoaderConfig> = {}) {
        this.config = this._mergeConfig(DEFAULT_CONFIG, config);
        this.init();
    }

    init(): void {
        this._preloadCoreModules();
        if (Log) Log.info("[GeoLeaf.Utils.LazyLoader] Lazy loading system initialized");
    }

    async loadModule(
        moduleName: string,
        modulePath: string,
        options: Partial<LazyLoaderModulesConfig> = {}
    ): Promise<unknown> {
        const startTime = performance.now();

        try {
            if (moduleCache.has(moduleName)) return moduleCache.get(moduleName);
            if (loadingPromises.has(moduleName)) return await loadingPromises.get(moduleName);

            const loadingPromise = this._loadModuleScript(moduleName, modulePath, options);
            loadingPromises.set(moduleName, loadingPromise);

            const result = await loadingPromise;
            moduleCache.set(moduleName, result);
            loadingPromises.delete(moduleName);

            const loadTime = performance.now() - startTime;
            metrics.modulesLoaded++;
            metrics.totalLoadTime += loadTime;

            if (Log) Log.info(`[LazyLoader] Module "${moduleName}" loaded in ${loadTime.toFixed(2)}ms`);
            return result;
        } catch (error) {
            loadingPromises.delete(moduleName);
            metrics.errors++;
            if (Log) Log.error(`[LazyLoader] Failed to load module "${moduleName}":`, error);
            throw error;
        }
    }

    private async _loadModuleScript(
        moduleName: string,
        modulePath: string,
        options: Partial<LazyLoaderModulesConfig> = {}
    ): Promise<unknown> {
        const config = { ...this.config.modules, ...options };
        const finalPath = config.cacheBust ? `${modulePath}?v=${Date.now()}` : modulePath;
        const importPromise = import(/* webpackIgnore: true */ finalPath as string);
        if (!config.timeout) return importPromise;
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Module "${moduleName}" load timeout`)), config.timeout)
        );
        return Promise.race([importPromise, timeoutPromise]);
    }

    private _extractModuleExports(moduleName: string): unknown {
        const patterns = [
            `GeoLeaf.${moduleName}`,
            `GeoLeaf._${moduleName}`,
            `GeoLeaf.Utils.${moduleName}`,
            moduleName,
        ];
        for (const pattern of patterns) {
            const moduleExports = this._getNestedProperty(_g as Record<string, unknown>, pattern);
            if (moduleExports) return moduleExports;
        }
        return { name: moduleName, loaded: true };
    }

    private _getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
        return path.split(".").reduce((current: unknown, key) => {
            const o = current as Record<string, unknown> | null;
            return o && o[key] !== undefined ? o[key] : null;
        }, obj);
    }

    private _ensureObserver(): void {
        if (!this.imageObserver) this._initImageObserver();
    }

    private _initImageObserver(): void {
        if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
        this.imageObserver = new IntersectionObserver(
            (entries) => this._handleImageIntersection(entries),
            {
                rootMargin: this.config.images.rootMargin,
                threshold: this.config.images.threshold,
            }
        );
    }

    private _handleImageIntersection(entries: IntersectionObserverEntry[]): void {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement;
                this._loadImage(img);
                this.imageObserver?.unobserve(img);
            }
        });
    }

    private _loadImage(img: HTMLImageElement): void {
        const config = this.config.images;
        img.classList.add(config.loadingClass);
        const startTime = performance.now();
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = tempImg.src;
            img.classList.remove(config.loadingClass);
            img.classList.add(config.loadedClass);
            metrics.imagesLoaded++;
            if (Log) Log.debug(`[LazyLoader] Image loaded in ${(performance.now() - startTime).toFixed(2)}ms: ${img.src}`);
        };
        tempImg.onerror = () => {
            img.classList.remove(config.loadingClass);
            img.classList.add(config.errorClass);
            metrics.errors++;
            if (Log) Log.warn(`[LazyLoader] Image load failed: ${tempImg.src}`);
        };
        tempImg.src = img.dataset.src || img.src;
    }

    enableImageLazyLoading(selector = "img[data-src]"): void {
        this._ensureObserver();
        const images = document.querySelectorAll(selector);
        if (this.imageObserver) {
            images.forEach((img) => this.imageObserver!.observe(img));
        } else {
            images.forEach((img) => this._loadImage(img as HTMLImageElement));
        }
        if (Log) Log.info(`[LazyLoader] Enabled lazy loading for ${images.length} images`);
    }

    scan(selector = "img[data-src]"): number {
        this._ensureObserver();
        const images = document.querySelectorAll(selector);
        if (images.length) {
            if (this.imageObserver) {
                images.forEach((img) => this.imageObserver!.observe(img));
            } else {
                images.forEach((img) => this._loadImage(img as HTMLImageElement));
            }
            if (Log) Log.info(`[LazyLoader] scan() — ${images.length} image(s) trouvée(s)`);
        }
        return images.length;
    }

    initialize(options: { autoScan?: boolean; selector?: string } = {}): void {
        const { autoScan = true, selector = "img[data-src]" } = options;
        if (!autoScan) return;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.scan(selector), { once: true });
        } else {
            this.scan(selector);
        }
    }

    private _preloadCoreModules(): void {
        this.config.chunks.preload.forEach((moduleName) => {
            if (!moduleCache.has(moduleName) && this._shouldPreloadModule(moduleName)) {
                this._preloadModule(moduleName);
            }
        });
    }

    private _shouldPreloadModule(moduleName: string): boolean {
        const moduleExists = this._extractModuleExports(moduleName);
        return !moduleExists || (typeof moduleExists === "object" && moduleExists !== null && (moduleExists as { name?: string }).name === moduleName);
    }

    private _preloadModule(moduleName: string): void {
        const modulePath = this._getModulePath(moduleName);
        if (modulePath) {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.href = modulePath;
            document.head.appendChild(link);
            if (Log) Log.debug(`[LazyLoader] Prefetching module: ${moduleName}`);
        }
    }

    private _getModulePath(moduleName: string): string | null {
        const pathMap: Record<string, string> = {
            poi: "poi/add-form-orchestrator.js",
            geojson: "geojson/loader.js",
            route: "geoleaf.route.js",
            legend: "geoleaf.legend.js",
            themes: "themes/theme-loader.js",
        };
        const basePath = this._getBasePath();
        return pathMap[moduleName] ? `${basePath}/${pathMap[moduleName]}` : null;
    }

    private _getBasePath(): string {
        const scripts = document.getElementsByTagName("script");
        for (const script of scripts) {
            if (script.src && script.src.includes("geoleaf")) {
                const srcParts = script.src.split("/");
                srcParts.pop();
                return srcParts.join("/");
            }
        }
        return "./src/modules";
    }

    getMetrics(): typeof metrics & { averageLoadTime: number } {
        return {
            ...metrics,
            averageLoadTime: metrics.modulesLoaded > 0 ? metrics.totalLoadTime / metrics.modulesLoaded : 0,
        };
    }

    clearCache(): void {
        moduleCache.clear();
        loadingPromises.clear();
        if (Log) Log.info("[LazyLoader] Module cache cleared");
    }

    private _mergeConfig(defaultConfig: LazyLoaderConfig, userConfig: Partial<LazyLoaderConfig>): LazyLoaderConfig {
        const merged: LazyLoaderConfig = {
            modules: { ...defaultConfig.modules },
            images: { ...defaultConfig.images },
            chunks: { ...defaultConfig.chunks },
        };
        if (userConfig.modules && typeof userConfig.modules === "object") {
            merged.modules = { ...defaultConfig.modules, ...userConfig.modules };
        }
        if (userConfig.images && typeof userConfig.images === "object") {
            merged.images = { ...defaultConfig.images, ...userConfig.images };
        }
        if (userConfig.chunks && typeof userConfig.chunks === "object") {
            merged.chunks = { ...defaultConfig.chunks, ...userConfig.chunks };
        }
        return merged;
    }
}

let _lazyLoaderInstance: LazyLoader | null = null;

export function getLazyLoader(): LazyLoader {
    if (!_lazyLoaderInstance) _lazyLoaderInstance = new LazyLoader();
    return _lazyLoaderInstance;
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => getLazyLoader().initialize(), { once: true });
    } else {
        Promise.resolve().then(() => getLazyLoader().initialize());
    }
}
