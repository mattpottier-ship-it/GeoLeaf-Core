# GeoLeaf — Cache System (détaillé)

> **Version** : 3.2.0 — **Date** : 15 février 2026
> **Plugin** : Storage (`geoleaf-storage.plugin.js`)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture du système de cache](#2-architecture-du-système-de-cache)
3. [CacheManager — Orchestrateur](#3-cachemanager--orchestrateur)
4. [Modules de téléchargement](#4-modules-de-téléchargement)
5. [Layer Selector — UI de sélection](#5-layer-selector--ui-de-sélection)
6. [Service Worker](#6-service-worker)
7. [SyncManager](#7-syncmanager)
8. [CacheControl](#8-cachecontrol)
9. [Métriques et monitoring](#9-métriques-et-monitoring)
10. [Exemples d'intégration](#10-exemples-dintégration)
11. [Limitations et quotas](#11-limitations-et-quotas)
12. [Voir aussi](#12-voir-aussi)

---

## 1. Vue d'ensemble

Le système de cache GeoLeaf permet de **télécharger un profil complet** (couches GeoJSON, tuiles, configs, assets) pour un fonctionnement **100% offline**. Il repose sur deux couches complémentaires :

- **Cache API** (via les modules `cache/`) : stockage des ressources HTTP (profils, configs, tuiles)
- **IndexedDB** (via `indexeddb.js` + `db/`) : stockage des données structurées (couches, préférences, sync queue)
- **Service Worker** (`sw.js`) : interception des requêtes réseau pour servir depuis le cache

---

## 2. Architecture du système de cache

```
cache/
├── storage.js              ← Abstraction Cache API (open, put, match, delete)
├── calculator.js           ← Estimation de taille avant téléchargement
├── validator.js            ← Validation intégrité des données cached
├── metrics.js              ← Métriques vitesse / progression
├── resource-enumerator.js  ← Liste des ressources d'un profil à cacher
├── progress-tracker.js     ← Suivi progression UI (% completé)
├── retry-handler.js        ← Logique retry sur erreur réseau
├── fetch-manager.js        ← Gestionnaire requêtes fetch parallèles
├── download-handler.js     ← Orchestration batch downloads
├── downloader.js           ← Téléchargeur principal (API publique)
├── layer-selector/         ← UI de sélection des couches
│   ├── core.js             ← Init, populate, cleanup
│   ├── data-fetching.js    ← Type géométrie + estimation taille
│   ├── row-rendering.js    ← Rendu lignes tableau
│   └── selection-cache.js  ← Sauvegarde/restauration sélection
```

### Modules racine liés

```
storage/
├── cache-manager.js     ← Orchestrateur global du cache
├── cache-control.js     ← Politique de contrôle du cache
├── sw.js                ← Service Worker (contexte séparé)
├── sw-register.js       ← Enregistrement/gestion du SW
└── sync-manager.js      ← Synchronisation online/offline
```

---

## 3. CacheManager — Orchestrateur

**Namespace** : `GeoLeaf.CacheManager`

Le CacheManager est le point d'entrée principal pour les opérations de cache offline. Il coordonne les modules de téléchargement, le suivi de progression et la validation.

### API publique

#### `CacheManager.init(options)`

Initialise le gestionnaire de cache.

```javascript
GeoLeaf.CacheManager.init({
    enableProfileCache: true,
    enableTileCache: true,
    maxCacheSize: 500 * 1024 * 1024  // 500 Mo
});
```

#### `CacheManager.cacheProfile(profileId, options)`

Télécharge et met en cache un profil complet pour l'utilisation offline.

```javascript
const result = await GeoLeaf.CacheManager.cacheProfile('tourism', {
    includeTiles: true,
    tileZoomRange: [10, 16],
    onProgress: (progress) => {
        console.log(`${progress.percent}% — ${progress.downloaded}/${progress.total}`);
    }
});
```

#### `CacheManager.clearProfileCache(profileId)`

Supprime le cache d'un profil spécifique.

#### `CacheManager.clearAllCache()`

Vide l'intégralité du cache.

#### `CacheManager.getCacheStats()`

Retourne les statistiques de cache (taille occupée, nombre d'éléments, utilisation quota).

```javascript
const stats = await GeoLeaf.CacheManager.getCacheStats();
// → { totalSize: 52428800, itemCount: 347, quotaUsage: '12.4%' }
```

#### `CacheManager.isProfileCached(profileId)`

Vérifie si un profil est disponible offline.

#### `CacheManager.getManifest(profileId)`

Retourne la liste des ressources cachées pour un profil.

#### `CacheManager.cancelDownload()`

Annule un téléchargement en cours.

---

## 4. Modules de téléchargement

### `cache/storage.js` — CacheStorage

Abstraction de la [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache). Fournit les opérations `open`, `put`, `match`, `delete` sur les caches nommés.

### `cache/calculator.js` — Calculator

Estime la taille totale d'un téléchargement avant de le lancer. Utilise des requêtes `HEAD` et des heuristiques basées sur le type de couche et le nombre de features.

### `cache/validator.js` — Validator

Vérifie l'intégrité des données cachées : format JSON valide, GeoJSON conforme, taille cohérente.

### `cache/resource-enumerator.js` — ResourceEnumerator

Énumère toutes les ressources nécessaires au fonctionnement offline d'un profil : configs JSON, fichiers GeoJSON, tuiles de fond de carte, icônes, CSS/JS.

### `cache/fetch-manager.js` — FetchManager

Gestionnaire de requêtes `fetch()` avec contrôle de la concurrence, timeouts, et gestion des erreurs réseau.

### `cache/download-handler.js` — DownloadHandler

Orchestre le téléchargement par lots (batch) des ressources énumérées. Gère la parallélisation et la reprise après erreur.

### `cache/retry-handler.js` — RetryHandler

Logique de retry intelligente : backoff exponentiel, nombre max de tentatives, gestion des erreurs réseau vs erreurs serveur (4xx = abandon, 5xx = retry).

### `cache/progress-tracker.js` — ProgressTracker

Suivi de progression avec pourcentage, vitesse de téléchargement, et temps restant estimé. Émet des événements pour la mise à jour de l'UI.

### `cache/metrics.js` — Metrics

Collecte les métriques de téléchargement : vitesse moyenne, temps total, taille par ressource, taux d'erreur.

### `cache/downloader.js` — Downloader

Point d'entrée public pour le téléchargement. Assemble tous les modules ci-dessus dans un workflow cohérent.

---

## 5. Layer Selector — UI de sélection

Le sous-dossier `cache/layer-selector/` implémente l'interface de sélection des couches à mettre en cache. Les 4 modules partagent un namespace commun via `Object.assign()` :

### `core.js`

- `init()` — Initialise le sélecteur
- `populate()` — Remplit la liste avec les couches disponibles
- `cleanup()` — Nettoie les ressources

### `data-fetching.js`

- `getLayerGeometryType()` — Détecte le type de géométrie (Point, Line, Polygon)
- `estimateSize()` — Estime la taille d'une couche

### `row-rendering.js`

- `_createTableHeader()` — En-tête du tableau de sélection
- `createLayerRow()` — Ligne pour une couche GeoJSON
- `createBasemapRow()` — Ligne pour un fond de carte

### `selection-cache.js`

- `loadSelection()` — Restaure la sélection précédente
- `saveSelection()` — Sauvegarde la sélection courante
- `handleSelectAllChange()` — Gère le "tout sélectionner"

> **Note** : ces 4 fichiers utilisent le pattern `Object.assign()` sur un objet partagé. L'ordre de chargement compte : `core.js` doit être importé en premier.

---

## 6. Service Worker

### `sw.js` — Script du Service Worker

**Emplacement** : `src/static/js/storage/sw.js` (copié dans le dossier de déploiement)
**Taille** : ~456 lignes

Le Service Worker intercepte les requêtes réseau et applique différentes **stratégies de cache** :

#### Caches utilisés

| Cache | Pattern | Contenu |
|-------|---------|---------|
| `geoleaf-v{VERSION}-static` | Assets statiques | JS, CSS, fonts, icônes |
| `geoleaf-v{VERSION}-profile-{id}` | Par profil | Configs JSON, GeoJSON, SVG |
| `geoleaf-v{VERSION}-tiles` | Tuiles | Tuiles de fond de carte (OSM, satellite…) |
| `geoleaf-v{VERSION}-runtime` | Runtime | Ressources diverses (API, etc.) |

#### Stratégies de cache

| Stratégie | Utilisation | Comportement |
|-----------|-------------|--------------|
| **Cache-First** | Assets statiques, profils | Sert depuis le cache, met à jour en arrière-plan (stale-while-revalidate) |
| **Network-First** | Configurations | Tente le réseau, fallback sur le cache si offline |
| **Tile Cache** | Tuiles de carte | Cache avec gestion de quota et éviction |
| **Background Sync** | Opérations POI | Enregistre les opérations offline pour sync ultérieure |

#### Blacklist

Les URLs suivantes ne sont **jamais cachées** :
- `/api/` — Appels API dynamiques
- `chrome-extension` — Extensions navigateur
- `/__` — URLs internes framework

#### Cycle de vie

1. **Install** : pré-cache des assets statiques (`STATIC_ASSETS`), puis `skipWaiting()`
2. **Activate** : nettoyage des anciens caches (versions précédentes), puis `clients.claim()`
3. **Fetch** : interception des requêtes avec la stratégie appropriée
4. **Message** : communication avec le thread principal (cache profile, clear cache)
5. **Background Sync** : synchronisation des opérations offline

### `sw-register.js` — Enregistrement du SW

**Namespace** : `GeoLeaf._SWRegister`

#### `_SWRegister.register(options)`

Enregistre le Service Worker.

```javascript
const registration = await GeoLeaf._SWRegister.register({
    path: 'sw.js',   // défaut: 'sw.js'
    scope: '/'        // défaut: '/'
});
```

#### `_SWRegister.update()`

Force une vérification de mise à jour du SW.

```javascript
await GeoLeaf._SWRegister.update();
```

#### `_SWRegister.unregister()`

Désenregistre le Service Worker.

```javascript
await GeoLeaf._SWRegister.unregister();
```

#### `_SWRegister.getRegistration()`

Retourne l'objet `ServiceWorkerRegistration` courant (ou `null`).

#### Événement `geoleaf:sw:updated`

Émis sur `document` quand un nouveau Service Worker est activé :

```javascript
document.addEventListener('geoleaf:sw:updated', () => {
    console.log('Nouvelle version du SW activée');
    // Optionnel : proposer un rechargement à l'utilisateur
});
```

### Activation via config profil

Le Service Worker est activé par le profil :

```json
{
    "storage": {
        "enableServiceWorker": true
    }
}
```

Le code d'initialisation dans `app/init.js` passe cette option à `Storage.init()`, qui appelle `_SWRegister.register()` si `enableServiceWorker` est `true`.

---

## 7. SyncManager

**Namespace** : `GeoLeaf.SyncManager`

Gère la synchronisation des opérations offline vers le backend.

### API

#### `SyncManager.sync()`

Déclenche la synchronisation de la file d'attente.

#### `SyncManager.addOperation(operation)`

Ajoute une opération à la file (utilisé par `SyncHandler` du plugin AddPOI).

#### `SyncManager.getQueueSize()`

Retourne le nombre d'opérations en attente.

---

## 8. CacheControl

**Namespace** : `GeoLeaf.CacheControl`

Politique de contrôle du cache : gestion de la durée de vie, du quota, et des stratégies d'éviction.

---

## 9. Métriques et monitoring

### `cache/metrics.js`

Collecte les métriques de téléchargement pendant les opérations de cache :

- Vitesse de téléchargement (Mo/s)
- Progression par ressource
- Temps total écoulé
- Taux d'erreur réseau

### `storage/telemetry.js`

**Namespace** : `GeoLeaf.Storage.Telemetry`

Module de télémétrie de performance :

- `init(options)` — Initialise la collecte (interval de report, taux d'échantillonnage)
- `track(event, data)` — Enregistre un événement de performance
- `getStats()` — Retourne les statistiques agrégées
- `report()` — Génère un rapport de performance
- Métriques : cache hits/misses, download speeds, memory usage, operation timing

---

## 10. Exemples d'intégration

### Télécharger un profil pour le mode offline

```javascript
// Vérifier si déjà en cache
const isCached = await GeoLeaf.CacheManager.isProfileCached('tourism');

if (!isCached) {
    const result = await GeoLeaf.CacheManager.cacheProfile('tourism', {
        includeTiles: true,
        tileZoomRange: [10, 16],
        onProgress: ({ percent, speed }) => {
            document.getElementById('progress').textContent =
                `${percent}% — ${(speed / 1024).toFixed(1)} Ko/s`;
        }
    });
    console.log('Profile cached:', result);
}
```

### Vérifier l'état du cache

```javascript
const stats = await GeoLeaf.CacheManager.getCacheStats();
console.log(`Cache: ${(stats.totalSize / 1024 / 1024).toFixed(1)} Mo`);
console.log(`${stats.itemCount} éléments`);
console.log(`Quota: ${stats.quotaUsage}`);
```

### Nettoyer le cache d'un profil obsolète

```javascript
await GeoLeaf.CacheManager.clearProfileCache('old-profile');
```

---

## 11. Limitations et quotas

| Navigateur | Quota IndexedDB | Quota Cache API | Notes |
|------------|----------------|-----------------|-------|
| Chrome | 80% de l'espace disque | 80% de l'espace disque | Shared quota |
| Firefox | 50% du disque (max 2 Go) | Même quota | Demande permission > 50 Mo |
| Safari | 1 Go par origin | 1 Go par origin | Éviction après 7 jours sans visite |
| Edge | Identique à Chrome | Identique à Chrome | Chromium-based |

> ⚠️ Les tuiles de carte peuvent consommer beaucoup d'espace. Le `Calculator` estime la taille avant téléchargement pour éviter les dépassements de quota.

---

## 12. Voir aussi

- [Storage README](GeoLeaf_Storage_README.md) — vue d'ensemble du système de stockage
- [IndexedDB](indexeddb.md) — module IndexedDB et IDBHelper
- [Offline Detector](offline-detector.md) — détection online/offline
- [Plugins Guide](../plugins/GeoLeaf_Plugins_README.md) — architecture plugin
- [Architecture Guide](../ARCHITECTURE_GUIDE.md) — architecture globale
