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

(function (global) {
    'use strict';

    // Ensure GeoLeaf namespace
    if (typeof global.GeoLeaf === 'undefined') {
        global.GeoLeaf = {};
    }
    if (typeof global.GeoLeaf.Utils === 'undefined') {
        global.GeoLeaf.Utils = {};
    }

    /**
     * Lazy Loading Configuration
     */
    const DEFAULT_CONFIG = {
        // Module loading
        modules: {
            timeout: 15000,
            retries: 2,
            cacheBust: false
        },
        // Image lazy loading
        images: {
            rootMargin: '50px',
            threshold: 0.1,
            loadingClass: 'lazy-loading',
            loadedClass: 'lazy-loaded',
            errorClass: 'lazy-error'
        },
        // Code splitting
        chunks: {
            preload: ['core', 'ui'],
            defer: ['poi', 'geojson', 'route', 'legend']
        }
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
        errors: 0
    };

    /**
     * @class LazyLoader
     * @description Advanced lazy loading system for GeoLeaf
     */
    class LazyLoader {
        constructor(config = {}) {
            this.config = this._mergeConfig(DEFAULT_CONFIG, config);
            this.imageObserver = null;
            this.init();
        }

        /**
         * Initialize lazy loader
         */
        init() {
            this._initImageObserver();
            this._preloadCoreModules();
            
            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info('[GeoLeaf.Utils.LazyLoader] Lazy loading system initialized');
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
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info(`[LazyLoader] Module "${moduleName}" loaded in ${loadTime.toFixed(2)}ms`);
                }
                
                return result;
                
            } catch (error) {
                loadingPromises.delete(moduleName);
                metrics.errors++;
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error(`[LazyLoader] Failed to load module "${moduleName}":`, error);
                }
                
                throw error;
            }
        }

        /**
         * Load module script dynamically
         * @private
         */
        async _loadModuleScript(moduleName, modulePath, options) {
            const config = { ...this.config.modules, ...options };
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const timeoutId = setTimeout(() => {
                    document.head.removeChild(script);
                    reject(new Error(`Module "${moduleName}" load timeout`));
                }, config.timeout);

                script.onload = () => {
                    clearTimeout(timeoutId);
                    
                    // Try to extract module from global namespace
                    const moduleExports = this._extractModuleExports(moduleName);
                    resolve(moduleExports);
                };

                script.onerror = () => {
                    clearTimeout(timeoutId);
                    document.head.removeChild(script);
                    reject(new Error(`Failed to load script for module "${moduleName}"`));
                };

                const finalPath = config.cacheBust 
                    ? `${modulePath}?v=${Date.now()}`
                    : modulePath;
                    
                script.src = finalPath;
                script.async = true;
                document.head.appendChild(script);
            });
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
                moduleName
            ];

            for (const pattern of patterns) {
                const moduleExports = this._getNestedProperty(global, pattern);
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
            return path.split('.').reduce((current, key) => {
                return current && current[key] !== undefined ? current[key] : null;
            }, obj);
        }

        /**
         * Initialize image lazy loading with Intersection Observer
         * @private
         */
        _initImageObserver() {
            if (!('IntersectionObserver' in window)) {
                // Fallback for older browsers
                this._loadAllImages();
                return;
            }

            this.imageObserver = new IntersectionObserver(
                (entries) => this._handleImageIntersection(entries),
                {
                    rootMargin: this.config.images.rootMargin,
                    threshold: this.config.images.threshold
                }
            );
        }

        /**
         * Handle image intersection
         * @private
         */
        _handleImageIntersection(entries) {
            entries.forEach(entry => {
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
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.debug(`[LazyLoader] Image loaded in ${loadTime.toFixed(2)}ms: ${img.src}`);
                }
            };
            
            tempImg.onerror = () => {
                img.classList.remove(config.loadingClass);
                img.classList.add(config.errorClass);
                metrics.errors++;
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.warn(`[LazyLoader] Image load failed: ${tempImg.src}`);
                }
            };
            
            tempImg.src = img.dataset.src || img.src;
        }

        /**
         * Enable lazy loading for images
         * @param {string} selector - CSS selector for images (default: 'img[data-src]')
         */
        enableImageLazyLoading(selector = 'img[data-src]') {
            const images = document.querySelectorAll(selector);
            
            if (this.imageObserver) {
                images.forEach(img => this.imageObserver.observe(img));
            } else {
                // Fallback - load all images immediately
                images.forEach(img => this._loadImage(img));
            }
            
            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info(`[LazyLoader] Enabled lazy loading for ${images.length} images`);
            }
        }

        /**
         * Preload core modules
         * @private
         */
        _preloadCoreModules() {
            const coreModules = this.config.chunks.preload;
            
            coreModules.forEach(moduleName => {
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
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = modulePath;
                document.head.appendChild(link);
                
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.debug(`[LazyLoader] Prefetching module: ${moduleName}`);
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
                'poi': 'poi/add-form-orchestrator.js',
                'geojson': 'geojson/loader.js',
                'route': 'geoleaf.route.js',
                'legend': 'geoleaf.legend.js',
                'themes': 'themes/theme-loader.js'
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
            const scripts = document.getElementsByTagName('script');
            for (let script of scripts) {
                if (script.src && script.src.includes('geoleaf')) {
                    const srcParts = script.src.split('/');
                    srcParts.pop(); // Remove filename
                    return srcParts.join('/');
                }
            }
            // Fallback
            return './src/static/js';
        }

        /**
         * Load all images immediately (fallback)
         * @private
         */
        _loadAllImages() {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => this._loadImage(img));
        }

        /**
         * Get performance metrics
         * @returns {Object} Performance metrics
         */
        getMetrics() {
            return {
                ...metrics,
                averageLoadTime: metrics.modulesLoaded > 0 
                    ? metrics.totalLoadTime / metrics.modulesLoaded 
                    : 0
            };
        }

        /**
         * Clear module cache
         */
        clearCache() {
            moduleCache.clear();
            loadingPromises.clear();
            
            if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.info('[LazyLoader] Module cache cleared');
            }
        }

        /**
         * Merge configuration objects
         * @private
         */
        _mergeConfig(defaultConfig, userConfig) {
            const merged = { ...defaultConfig };
            
            for (const key in userConfig) {
                if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                    merged[key] = { ...defaultConfig[key], ...userConfig[key] };
                } else {
                    merged[key] = userConfig[key];
                }
            }
            
            return merged;
        }
    }

    // Create global instance
    const lazyLoader = new LazyLoader();

    // Export to GeoLeaf namespace
    global.GeoLeaf.Utils.LazyLoader = LazyLoader;
    global.GeoLeaf.Utils.lazyLoader = lazyLoader;

    // Convenience methods
    global.GeoLeaf.loadModule = (name, path, options) => lazyLoader.loadModule(name, path, options);
    global.GeoLeaf.enableLazyImages = (selector) => lazyLoader.enableImageLazyLoading(selector);

    // Auto-enable image lazy loading on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            lazyLoader.enableImageLazyLoading();
        });
    } else {
        // DOM is already ready
        lazyLoader.enableImageLazyLoading();
    }

    if (global.GeoLeaf.Log) {
        global.GeoLeaf.Log.info('[GeoLeaf.Utils.LazyLoader] Module loaded - advanced lazy loading available');
    }

})(typeof window !== 'undefined' ? window : this);