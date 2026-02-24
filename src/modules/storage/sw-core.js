/**
 * GeoLeaf Service Worker — Core (Lite)
 *
 * Version allégée du Service Worker pour le bundle open-source (gratuit).
 * Gère le cache offline basique pour :
 * - Assets statiques (JS, CSS, fonts)
 * - Ressources profils (JSON, GeoJSON, SVG)
 * - Configurations (network-first avec fallback cache)
 *
 * Stratégies :
 * - Cache-First : Assets statiques et profils (stale-while-revalidate)
 * - Network-First : Configurations avec fallback cache
 *
 * ⚠️ Ne gère PAS (réservé au plugin Storage premium) :
 * - Tiles IndexedDB (tileCacheStrategy)
 * - Background Sync (POI sync queue)
 * - Accès IndexedDB depuis le SW
 *
 * Pour le support complet offline (tiles, sync, IndexedDB),
 * utilisez le plugin Storage qui fournit sw.js (version complète).
 *
 * @version __GEOLEAF_VERSION__
 * @see sw.js (version complète dans le plugin Storage)
 */

"use strict";

// Flag de debug SERVICE WORKER — mettre à true uniquement pour le développement
// En production, tous les console.log SW sont supprimés au build via terser
const _SW_DEBUG = typeof __SW_DEBUG__ !== 'undefined' ? __SW_DEBUG__ : false;

const CACHE_VERSION = 'geoleaf-v__GEOLEAF_VERSION__';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_PROFILE_PREFIX = `${CACHE_VERSION}-profile-`;
const CACHE_TILES = `${CACHE_VERSION}-tiles`;
const CACHE_RUNTIME = `${CACHE_VERSION}-runtime`;

// Assets core à pré-cacher (vide pour l'instant — dépend du déploiement)
const STATIC_ASSETS = [];

// URLs à ne jamais cacher
const CACHE_BLACKLIST = [
    /\/api\//,
    /chrome-extension/,
    /\/__/
];

// ═══════════════════════════════════════════════
// INSTALL EVENT
// ═══════════════════════════════════════════════
self.addEventListener('install', (event) => {
    if (_SW_DEBUG) console.log('[SW-Core] Installing Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_STATIC);
                if (STATIC_ASSETS.length > 0) {
                    await cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
                }
                await self.skipWaiting();
                if (_SW_DEBUG) console.log('[SW-Core] Installation complete');
            } catch (error) {
                console.error('[SW-Core] Pre-cache failed:', error);
                await self.skipWaiting();
            }
        })()
    );
});

// ═══════════════════════════════════════════════
// ACTIVATE EVENT
// ═══════════════════════════════════════════════
self.addEventListener('activate', (event) => {
    if (_SW_DEBUG) console.log('[SW-Core] Activating Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName.startsWith('geoleaf-') && cacheName !== CACHE_VERSION && !cacheName.startsWith(CACHE_VERSION)) {
                            if (_SW_DEBUG) console.log('[SW-Core] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                if (_SW_DEBUG) console.log('[SW-Core] Old caches cleared');
                return self.clients.claim();
            })
    );
});

// ═══════════════════════════════════════════════
// FETCH EVENT
// ═══════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les URLs blacklistées
    if (CACHE_BLACKLIST.some(pattern => pattern.test(url.href))) {
        return;
    }

    // Stratégie selon le type de ressource
    if (isProfileResource(url)) {
        event.respondWith(cacheFirstStrategy(request, getCacheNameForProfile(url)));
    } else if (isTileRequest(url)) {
        // Version core : les tuiles passent par le réseau avec cache API simple
        // (pas de tileCacheStrategy IndexedDB — réservé au plugin Storage)
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
self.addEventListener('message', (event) => {
    // Validate message source: only accept messages from controlled clients
    if (!event.source || (event.source.type !== 'window' && event.source.type !== 'worker')) {
        return;
    }

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName.startsWith(CACHE_VERSION)) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }).then(() => {
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
 * Cache-First avec stale-while-revalidate.
 * Sert depuis le cache immédiatement, met à jour en arrière-plan.
 */
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Mise à jour en arrière-plan (stale-while-revalidate)
        fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
            }
        }).catch(() => {});

        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        throw error;
    }
}

/**
 * Network-First avec fallback cache.
 * Essaie le réseau d'abord, sert depuis le cache si hors-ligne.
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
 * Stratégie simplifiée pour les tuiles (version core).
 * Cache API uniquement — pas d'IndexedDB.
 * Retourne un placeholder SVG en dernier recours.
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
    } catch (error) {
        // Placeholder SVG offline
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">Offline</text></svg>',
            {
                headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
                status: 200
            }
        );
    }
}

// ═══════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════

function isProfileResource(url) {
    return url.pathname.includes('/profiles/');
}

function isTileRequest(url) {
    const hostname = url.hostname;
    const path = url.pathname;

    // 1. Providers vectoriels — uniquement les vrais fichiers tuiles (.pbf/.mvt/.png),
    //    PAS les métadonnées (styles JSON, TileJSON) qui doivent passer par networkFirst.
    //    Vérifié EN PREMIER car certains hostnames (tiles.openfreemap.org, api.maptiler.com)
    //    contiennent "tile" et seraient captés par la règle raster générique.
    if (hostname.includes('openfreemap') ||
        hostname.includes('maptiler') ||
        hostname.includes('protomaps') ||
        hostname.includes('versatiles')) {
        return path.endsWith('.pbf') || path.endsWith('.mvt') || path.endsWith('.png');
    }

    // 2. Providers raster — toujours acceptés (hostname suffit)
    if (hostname.includes('tile') ||
        hostname.includes('openstreetmap') ||
        hostname.includes('arcgisonline') ||
        hostname.includes('opentopomap')) {
        return true;
    }

    // 3. Fallback : détection par extension de fichier
    return path.endsWith('.pbf') || path.endsWith('.mvt');
}

function isStaticAsset(url) {
    return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf)$/);
}

function isConfigFile(url) {
    return url.pathname.includes('config.json') || url.pathname.includes('profile.json');
}

function getCacheNameForProfile(url) {
    const match = url.pathname.match(/\/profiles\/([^\/]+)/);
    if (match && match[1]) {
        return `${CACHE_PROFILE_PREFIX}${match[1]}`;
    }
    return CACHE_RUNTIME;
}

if (_SW_DEBUG) console.log('[SW-Core] Service Worker (core/lite) script loaded');
