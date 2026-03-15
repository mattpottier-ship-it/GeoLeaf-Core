/* eslint-disable no-console */ // Service Worker context — Log module unavailable, console is required
/* global __SW_DEBUG__ */ // build-time constant injected by Rollup replace plugin
/**
 * GeoLeaf Service Worker — Core (Lite)
 *
 * Lightweight version of the Service Worker for the open-source (free) bundle.
 * Handles basic offline cache for:
 * - Static assets (JS, CSS, fonts)
 * - Profile resources (JSON, GeoJSON, SVG)
 * - Configurations (network-first with cache fallback)
 *
 * Strategies:
 * - Cache-First: Static assets and profiles (stale-while-revalidate)
 * - Network-First: Configurations with cache fallback
 *
 * ⚠️ Does NOT handle (reserved for the premium Storage plugin):
 * - IndexedDB tiles (tileCacheStrategy)
 * - Background Sync (POI sync queue)
 * - IndexedDB access from the SW
 *
 * For full offline support (tiles, sync, IndexedDB),
 * use the Storage plugin which provides sw.js (full version).
 *
 * @version __GEOLEAF_VERSION__
 * @see sw.js (full version in the Storage plugin)
 */

"use strict";

// __SW_DEBUG__ is a build-time constant — injected as a plain boolean by Rollup at build time
// SERVICE WORKER debug flag — set to true only for development
// In production, all SW console.log calls are removed at build time via terser
const _SW_DEBUG = typeof __SW_DEBUG__ !== "undefined" ? __SW_DEBUG__ : false;

const CACHE_VERSION = "geoleaf-v__GEOLEAF_VERSION__";
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_PROFILE_PREFIX = `${CACHE_VERSION}-profile-`;
const CACHE_TILES = `${CACHE_VERSION}-tiles`;
const CACHE_RUNTIME = `${CACHE_VERSION}-runtime`;

// Core assets to pre-cache (empty for now — depends on deployment)
const STATIC_ASSETS = [];

// URLs to never cache
const CACHE_BLACKLIST = [/\/api\//, /chrome-extension/, /\/__/];

// ═══════════════════════════════════════════════
// INSTALL EVENT
// ═══════════════════════════════════════════════
self.addEventListener("install", (event) => {
    if (_SW_DEBUG) console.log("[SW-Core] Installing Service Worker v" + CACHE_VERSION);

    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_STATIC);
                if (STATIC_ASSETS.length > 0) {
                    await cache.addAll(
                        STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" }))
                    );
                }
                await self.skipWaiting();
                if (_SW_DEBUG) console.log("[SW-Core] Installation complete");
            } catch (error) {
                console.error("[SW-Core] Pre-cache failed:", error);
                await self.skipWaiting();
            }
        })()
    );
});

// ═══════════════════════════════════════════════
// ACTIVATE EVENT
// ═══════════════════════════════════════════════
self.addEventListener("activate", (event) => {
    if (_SW_DEBUG) console.log("[SW-Core] Activating Service Worker v" + CACHE_VERSION);

    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (
                            cacheName.startsWith("geoleaf-") &&
                            cacheName !== CACHE_VERSION &&
                            !cacheName.startsWith(CACHE_VERSION)
                        ) {
                            if (_SW_DEBUG) console.log("[SW-Core] Deleting old cache:", cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                if (_SW_DEBUG) console.log("[SW-Core] Old caches cleared");
                return self.clients.claim();
            })
    );
});

// ═══════════════════════════════════════════════
// FETCH EVENT
// ═══════════════════════════════════════════════
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore blacklisted URLs
    if (CACHE_BLACKLIST.some((pattern) => pattern.test(url.href))) {
        return;
    }

    // Strategy based on resource type
    if (isProfileResource(url)) {
        event.respondWith(cacheFirstStrategy(request, getCacheNameForProfile(url)));
    } else if (isTileRequest(url)) {
        // Core version: tiles go through the network with simple Cache API
        // (no tileCacheStrategy IndexedDB — reserved for the Storage plugin)
        event.respondWith(tileSimpleStrategy(request));
    } else if (isStaticAsset(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_STATIC));
    } else if (isConfigFile(url)) {
        event.respondWith(networkFirstStrategy(request, CACHE_RUNTIME));
    } else {
        event.respondWith(networkFirstStrategy(request, CACHE_RUNTIME));
    }
});

// ═══════════════════════════════════════════════
// MESSAGE EVENT
// ═══════════════════════════════════════════════
self.addEventListener("message", (event) => {
    // Validate message source: only accept messages from controlled clinkts
    if (!event.source || (event.source.type !== "window" && event.source.type !== "worker")) {
        return;
    }

    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    if (event.data && event.data.type === "CLEAR_CACHE") {
        event.waitUntil(
            caches
                .keys()
                .then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            if (cacheName.startsWith(CACHE_VERSION)) {
                                return caches.delete(cacheName);
                            }
                        })
                    );
                })
                .then(() => {
                    if (event.ports && event.ports[0]) {
                        event.ports[0].postMessage({ success: true });
                    }
                })
        );
    }
});

// ═══════════════════════════════════════════════
// CACHING STRATEGIES
// ═══════════════════════════════════════════════

/**
 * Cache-First with stale-while-revalidate.
 * Serves from cache immediately, updates in the background.
 */
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Background update (stale-while-revalidate)
        fetch(request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
            })
            .catch(() => {});

        return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
}

/**
 * Network-First with cache fallback.
 * Tries the network first, serves from cache if offline.
 */
async function networkFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        throw error;
    }
}

/**
 * Simplified strategy for tiles (core version).
 * Cache API only — no IndexedDB.
 * Returns an SVG placeholder as last resort.
 */
async function tileSimpleStrategy(request) {
    const cache = await caches.open(CACHE_TILES);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (_error) {
        // Placeholder SVG offline
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">Offline</text></svg>',
            {
                headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
                status: 200,
            }
        );
    }
}

// ═══════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════

function isProfileResource(url) {
    return url.pathname.includes("/profiles/");
}

function _isVectorTileProvider(hostname) {
    return (
        hostname.includes("openfreemap") ||
        hostname.includes("maptiler") ||
        hostname.includes("protomaps") ||
        hostname.includes("versatiles")
    );
}

function _isRasterProvider(hostname) {
    return (
        hostname.includes("tile") ||
        hostname.includes("openstreetmap") ||
        hostname.includes("arcgisonline") ||
        hostname.includes("opentopomap")
    );
}

function _isTileFile(path) {
    return path.endsWith(".pbf") || path.endsWith(".mvt");
}

function isTileRequest(url) {
    const hostname = url.hostname;
    const path = url.pathname;

    // 1. Providers vectoriels — only les vrais files tiles (.pbf/.mvt/.png),
    //    PAS les metadata (styles JSON, TileJSON) qui doivent passer par networkFirst.
    //    Checked FIRST because some hostnames (tiles.openfreemap.org, api.maptiler.com)
    //    contain "tile" and would be caught by the generic raster rule.
    if (_isVectorTileProvider(hostname)) {
        return _isTileFile(path) || path.endsWith(".png");
    }

    // 2. Raster providers — always accepted (hostname is enough)
    if (_isRasterProvider(hostname)) {
        return true;
    }

    // 3. Fallback : detection par extension de file
    return _isTileFile(path);
}

function isStaticAsset(url) {
    return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf)$/);
}

function isConfigFile(url) {
    return url.pathname.includes("config.json") || url.pathname.includes("profile.json");
}

function getCacheNameForProfile(url) {
    const match = url.pathname.match(/\/profiles\/([^/]+)/);
    if (match && match[1]) {
        return `${CACHE_PROFILE_PREFIX}${match[1]}`;
    }
    return CACHE_RUNTIME;
}

if (_SW_DEBUG) console.log("[SW-Core] Service Worker (core/lite) script loaded");
