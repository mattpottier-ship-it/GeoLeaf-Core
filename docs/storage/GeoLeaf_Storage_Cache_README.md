# 💾 GeoLeaf Storage & Cache - Documentation Avancée

Product Version: GeoLeaf Platform V1  

**Modules** : `GeoLeaf.CacheManager`, `GeoLeaf.StorageDB`, `GeoLeaf.SyncManager`, `GeoLeaf.OfflineDetector`  
**Modules future-ready** : `GeoLeaf.Storage.Compression`, `GeoLeaf.Storage.CachingStrategy`  
**Version** : 3.2.0  
**Fichiers source** : `src/static/js/storage/` (13 root + 10 cache/ + 4 layer-selector/ + 5 db/ = 32 fichiers)  
**Dernière mise à jour** : 15 février 2026

---

## 📋 Vue d'ensemble

Le système de **Storage & Cache** GeoLeaf fournit une solution complète pour :
- **Cache offline des profils** : Config, couches GeoJSON, tuiles, icônes, styles
- **Stockage persistant IndexedDB** : Données, préférences, file de synchro
- **Compression intelligente** : Réduction 40-60% de la taille des données
- **Stratégies de cache** : LRU, LFU, TTL, FIFO pour optimiser l'espace
- **Détection offline** : Modes online/offline avec fallback automatique
- **Télémétrie** : Statistiques d'usage et performance

---

## 🗂️ Architecture du système de storage

```
storage/                            (13 fichiers root)
├── cache-manager.js            // Orchestrateur principal du cache profils
├── indexeddb.js                // Gestion IndexedDB (couches, préférences, sync)
├── cache-control.js            // Contrôle manuel du cache (UI)
├── offline-detector.js         // Détection état online/offline
├── sync-manager.js             // Gestion synchro online ↔ offline
├── telemetry.js                // Collecte statistiques usage
├── schema-validators.js        // Validation schémas IndexedDB
├── idb-helper.js               // Helpers IndexedDB (promisify, transactions)
├── storage-helper.js           // Helpers storage (quota, cleanup)
├── sw.js                       // Service Worker (4 stratégies de cache)
├── sw-register.js              // Enregistrement/mise à jour Service Worker
├── compression.js              // ⏳ Future-ready — Compression (gzip/deflate)
├── cache-strategy.js           // ⏳ Future-ready — Stratégies cache (LRU, LFU, TTL, FIFO)
├── cache/                      // Modules cache spécialisés (10 fichiers)
│   ├── downloader.js           // Téléchargement parallèle ressources
│   ├── download-handler.js     // Gestion des téléchargements individuels
│   ├── fetch-manager.js        // Orchestration des requêtes fetch
│   ├── retry-handler.js        // Gestion des tentatives de retry
│   ├── progress-tracker.js     // Suivi de progression
│   ├── storage.js              // Sauvegarde IndexedDB
│   ├── calculator.js           // Calcul taille cache
│   ├── validator.js            // Validation ressources
│   ├── metrics.js              // Métriques performance
│   ├── resource-enumerator.js  // Énumération ressources profil
│   └── layer-selector/         // Sélection de couches pour cache (4 fichiers)
│       ├── core.js             // Logique principale sélection
│       ├── data-fetching.js    // Récupération données couches
│       ├── row-rendering.js    // Rendu des lignes de sélection
│       └── selection-cache.js  // Cache de sélection
└── db/                         // Modules IndexedDB spécialisés (5 fichiers)
    ├── layers.js               // CRUD couches GeoJSON
    ├── preferences.js          // CRUD préférences utilisateur
    ├── sync.js                 // File de synchro offline
    ├── backups.js              // Sauvegardes de données
    └── images.js               // Stockage images/icônes
```

---

## 🧩 Module 1 : `GeoLeaf.CacheManager` (cache-manager.js)

### Rôle

**Orchestrateur principal** du cache offline. Coordonne le téléchargement, la validation, la compression et le stockage de profils complets.

### API Principale

#### `init(options)`

Initialise le cache manager avec la configuration.

**Options** :
- `enableProfileCache` : Activer le cache profils (défaut: false)
- `maxRetries` : Nombre de tentatives par ressource (défaut: 3)
- `concurrentDownloads` : Téléchargements simultanés (défaut: 10)
- `concurrentTileDownloads` : Tuiles simultanées par couche (défaut: 2)
- `tileDownloadDelay` : Délai entre tuiles (ms, défaut: 100)

**Exemple** :

```javascript
GeoLeaf.CacheManager.init({
  enableProfileCache: true,
  maxRetries: 5,
  concurrentDownloads: 15,
  concurrentTileDownloads: 3,
  tileDownloadDelay: 50
});
```

#### `cacheProfile(profileId, options)`

Cache un profil complet (config, datas, icons, styles, tuiles).

**Options** :
- `onProgress` : Callback de progression
- `selection` : Sélection personnalisée (couches, tuiles)

**Retourne** : `Promise<Object>` avec résumé du cache

**Exemple** :

```javascript
const result = await GeoLeaf.CacheManager.cacheProfile('tourism', {
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent}%`);
    console.log(`Downloaded: ${progress.downloaded}/${progress.total} resources`);
    console.log(`Status: ${progress.status}`);
  },
  selection: {
    layers: ['restaurants', 'pharmacies'], // Sélection de couches
    tiles: {
      zoomLevels: [12, 13, 14],
      bounds: [[48.8, 2.2], [48.9, 2.4]] // Zone géographique
    }
  }
});

console.log(result);
// {
//   profileId: 'tourism',
//   totalResources: 125,
//   downloaded: 123,
//   failed: 2,
//   totalSize: 15728640, // bytes
//   duration: 12500,     // ms
//   manifest: { ... }
// }
```

#### `clearProfileCache(profileId)`

Efface le cache d'un profil spécifique.

```javascript
await GeoLeaf.CacheManager.clearProfileCache('tourism');
GeoLeaf.UI.Notifications.success('Cache du profil "tourism" effacé');
```

#### `clearAllCache()`

Efface tout le cache (tous profils).

```javascript
await GeoLeaf.CacheManager.clearAllCache();
```

#### `getCacheStats(profileId)`

Récupère les statistiques de cache d'un profil.

```javascript
const stats = await GeoLeaf.CacheManager.getCacheStats('tourism');
console.log(stats);
// {
//   profileId: 'tourism',
//   cachedAt: 1705680000000,
//   size: 15728640,
//   resources: {
//     config: 1,
//     layers: 8,
//     tiles: 104,
//     icons: 10,
//     styles: 2
//   }
// }
```

#### `isProfileCached(profileId)`

Vérifie si un profil est mis en cache.

```javascript
const isCached = await GeoLeaf.CacheManager.isProfileCached('tourism');
if (isCached) {
  console.log('Profil disponible offline');
}
```

#### `getManifest(profileId)`

Récupère le manifeste d'un profil caché.

```javascript
const manifest = await GeoLeaf.CacheManager.getManifest('tourism');
console.log(manifest);
// {
//   profileId: 'tourism',
//   version: '1.0.0',
//   cachedAt: 1705680000000,
//   resources: [
//     { type: 'config', url: '/profiles/tourism.json', size: 5120 },
//     { type: 'layer', url: '/data/restaurants.geojson', size: 102400 },
//     ...
//   ]
// }
```

#### `cancelDownload()`

Annule le téléchargement en cours.

```javascript
GeoLeaf.CacheManager.cancelDownload();
```

---

## 🧩 Module 2 : `GeoLeaf.StorageDB` (indexeddb.js)

### Rôle

Gestion du **stockage persistant local** avec IndexedDB. Fournit 4 object stores :

1. **layers** : Cache des couches GeoJSON
2. **preferences** : Préférences utilisateur
3. **sync_queue** : File d'attente synchronisation offline
4. **metadata** : Métadonnées cache (manifestes, stats)

### API Principale

#### `init()`

Initialise la connexion IndexedDB.

```javascript
await GeoLeaf.Storage.DB.init();
console.log('IndexedDB prêt');
```

#### `saveLayer(layerData)`

Sauvegarde une couche GeoJSON en cache.

**Structure** :
- `id` : ID de la couche
- `profileId` : ID du profil
- `data` : Données GeoJSON compressées
- `timestamp` : Date de cache
- `size` : Taille (bytes)

**Exemple** :

```javascript
await GeoLeaf.Storage.DB.saveLayer({
  id: 'restaurants',
  profileId: 'tourism',
  data: geojsonData,
  timestamp: Date.now(),
  size: 102400
});
```

#### `getLayer(layerId)`

Récupère une couche depuis le cache.

```javascript
const layer = await GeoLeaf.Storage.DB.getLayer('restaurants');
if (layer) {
  console.log('Couche trouvée en cache:', layer.data);
} else {
  console.log('Couche non cachée, téléchargement requis');
}
```

#### `deleteLayer(layerId)`

Supprime une couche du cache.

```javascript
await GeoLeaf.Storage.DB.deleteLayer('restaurants');
```

#### `getAllLayers(profileId)`

Récupère toutes les couches d'un profil.

```javascript
const layers = await GeoLeaf.Storage.DB.getAllLayers('tourism');
console.log(`${layers.length} couches en cache`);
```

#### `setPreference(key, value)`

Sauvegarde une préférence utilisateur.

```javascript
await GeoLeaf.Storage.DB.setPreference('theme', 'dark');
await GeoLeaf.Storage.DB.setPreference('mapCenter', [48.8566, 2.3522]);
```

#### `getPreference(key)`

Récupère une préférence.

```javascript
const theme = await GeoLeaf.Storage.DB.getPreference('theme');
console.log('Thème actif:', theme); // 'dark'
```

#### `addToSyncQueue(operation)`

Ajoute une opération à la file de synchro offline.

**Structure** :
- `id` : ID unique
- `profileId` : ID du profil
- `operation` : Type (`'create'`, `'update'`, `'delete'`)
- `data` : Données de l'opération
- `status` : État (`'pending'`, `'syncing'`, `'synced'`, `'failed'`)
- `timestamp` : Date de création

**Exemple** :

```javascript
await GeoLeaf.Storage.DB.addToSyncQueue({
  id: 'sync_001',
  profileId: 'tourism',
  operation: 'create',
  data: {
    type: 'poi',
    poi: { id: 'poi_123', title: 'Nouveau restaurant', ... }
  },
  status: 'pending',
  timestamp: Date.now()
});
```

#### `getSyncQueue(profileId)`

Récupère la file de synchro d'un profil.

```javascript
const queue = await GeoLeaf.Storage.DB.getSyncQueue('tourism');
console.log(`${queue.length} opérations en attente de synchro`);
```

#### `clearSyncQueue(profileId)`

Vide la file de synchro.

```javascript
await GeoLeaf.Storage.DB.clearSyncQueue('tourism');
```

#### `setMetadata(key, value)`

Sauvegarde des métadonnées.

```javascript
await GeoLeaf.Storage.DB.setMetadata('cache_version', '3.2.0');
await GeoLeaf.Storage.DB.setMetadata('last_sync', Date.now());
```

#### `getMetadata(key)`

Récupère des métadonnées.

```javascript
const lastSync = await GeoLeaf.Storage.DB.getMetadata('last_sync');
console.log('Dernière synchro:', new Date(lastSync));
```

---

## 🧩 Module 3 : `GeoLeaf.Storage.Compression` (compression.js)

> ⏳ **Future-ready** : Ce module est implémenté et présent dans le code source mais **n'est pas encore bundlé** dans `geoleaf-storage.plugin.js`. Il sera activé dans une prochaine version.

### Rôle

Compression/décompression des données cachées. **Réduit la taille de 40-60%** pour les données JSON.

### Formats supportés

- **gzip** : Standard web, meilleure compression
- **deflate** : Plus rapide, compression légèrement inférieure

### API Principale

#### `init(options)`

Initialise le module de compression.

**Options** :
- `enabled` : Activer compression (défaut: true)
- `format` : Format (`'gzip'` ou `'deflate'`, défaut: `'gzip'`)
- `minSize` : Taille min pour compression (bytes, défaut: 1024)
- `compressTypes` : Types MIME à compresser

**Exemple** :

```javascript
GeoLeaf.Storage.Compression.init({
  enabled: true,
  format: 'gzip',
  minSize: 2048, // Compresser seulement si > 2 KB
  compressTypes: [
    'application/json',
    'text/plain',
    'text/xml'
  ]
});
```

#### `compress(data, options)`

Compresse des données.

**Paramètres** :
- `data` : String, Blob ou ArrayBuffer
- `options` :
  - `format` : Format de compression
  - `contentType` : Type MIME des données

**Retourne** : `Promise<Blob>` avec données compressées

**Exemple** :

```javascript
const geojson = JSON.stringify({
  type: 'FeatureCollection',
  features: [...]
});

const compressed = await GeoLeaf.Storage.Compression.compress(geojson, {
  format: 'gzip',
  contentType: 'application/json'
});

console.log(`Taille originale: ${geojson.length} bytes`);
console.log(`Taille compressée: ${compressed.size} bytes`);
console.log(`Réduction: ${((1 - compressed.size / geojson.length) * 100).toFixed(1)}%`);
// → Réduction: 57.3%
```

#### `decompress(compressedData, format)`

Décompresse des données.

```javascript
const decompressed = await GeoLeaf.Storage.Compression.decompress(
  compressed,
  'gzip'
);

const geojsonText = await decompressed.text();
const geojson = JSON.parse(geojsonText);
```

#### `shouldCompress(data, contentType)`

Détermine si des données devraient être compressées.

```javascript
const should = GeoLeaf.Storage.Compression.shouldCompress(
  jsonString,
  'application/json'
);
console.log(should); // true si > minSize
```

### Performance

**Benchmark (GeoJSON 500 KB)** :
- Compression gzip : ~280ms → 210 KB (58% réduction)
- Décompression gzip : ~90ms
- Compression deflate : ~210ms → 230 KB (54% réduction)
- Décompression deflate : ~70ms

---

## 🧩 Module 4 : `GeoLeaf.Storage.CachingStrategy` (cache-strategy.js)

> ⏳ **Future-ready** : Ce module est implémenté et présent dans le code source mais **n'est pas encore bundlé** dans `geoleaf-storage.plugin.js`. Il sera activé dans une prochaine version.

### Rôle

Implémente des **stratégies intelligentes** pour gérer l'éviction du cache quand l'espace est limité.

### Stratégies disponibles

1. **LRU (Least Recently Used)** : Éviction des éléments les moins récemment utilisés
2. **LFU (Least Frequently Used)** : Éviction des éléments les moins fréquemment utilisés
3. **TTL (Time-To-Live)** : Éviction basée sur la durée de vie
4. **FIFO (First In First Out)** : Éviction des éléments les plus anciens

### API Principale

#### Créer une stratégie LRU

```javascript
const lruCache = new GeoLeaf.Storage.CachingStrategy.LRUCache(
  100 * 1024 * 1024 // 100 MB max
);
```

#### `add(key, value, metadata)`

Ajoute un élément au cache.

```javascript
lruCache.add('restaurants', geojsonData, {
  profileId: 'tourism',
  timestamp: Date.now()
});
```

#### `get(key)`

Récupère un élément (met à jour l'accès pour LRU).

```javascript
const data = lruCache.get('restaurants');
if (data) {
  console.log('Trouvé en cache');
} else {
  console.log('Cache miss');
}
```

#### `evict()`

Évince un élément selon la stratégie.

```javascript
lruCache.evict(); // Retire l'élément LRU
```

#### `getStats()`

Récupère les statistiques du cache.

```javascript
const stats = lruCache.getStats();
console.log(stats);
// {
//   maxSize: 104857600,
//   currentSize: 67108864,
//   itemCount: 8,
//   utilization: '64.0'
// }
```

### Stratégie LFU (Least Frequently Used)

```javascript
const lfuCache = new GeoLeaf.Storage.CachingStrategy.LFUCache(50 * 1024 * 1024);

lfuCache.add('layer_1', data1);
lfuCache.add('layer_2', data2);

// Accès répétés à layer_1
lfuCache.get('layer_1'); // freq = 2
lfuCache.get('layer_1'); // freq = 3

// layer_2 sera évincé en premier (fréquence 1)
lfuCache.evict();
```

### Stratégie TTL (Time-To-Live)

```javascript
const ttlCache = new GeoLeaf.Storage.CachingStrategy.TTLCache(
  50 * 1024 * 1024,
  3600000 // TTL = 1 heure
);

ttlCache.add('layer_1', data1);

// Après 1 heure, l'élément est automatiquement évincé
setTimeout(() => {
  const data = ttlCache.get('layer_1');
  console.log(data); // null (expiré)
}, 3700000);
```

### Stratégie FIFO (First In First Out)

```javascript
const fifoCache = new GeoLeaf.Storage.CachingStrategy.FIFOCache(50 * 1024 * 1024);

fifoCache.add('layer_1', data1);
fifoCache.add('layer_2', data2);
fifoCache.add('layer_3', data3);

// layer_1 sera évincé en premier (ajouté en premier)
fifoCache.evict();
```

---

## 🧩 Module 5 : `GeoLeaf.Storage.OfflineDetector` (offline-detector.js)

### Rôle

Détecte l'état **online/offline** et déclenche des événements pour adapter l'application.

### API Principale

#### `init()`

Initialise le détecteur offline.

```javascript
GeoLeaf.Storage.OfflineDetector.init();
```

#### Événements émis

- `geoleaf:offline` : Connexion perdue
- `geoleaf:online` : Connexion rétablie

**Exemple** :

```javascript
document.addEventListener('geoleaf:offline', () => {
  console.log('Mode offline activé');
  GeoLeaf.UI.Notifications.warning('Connexion perdue, basculement en mode offline');
  
  // Basculer sur le cache
  GeoLeaf.Config.useOfflineMode = true;
});

document.addEventListener('geoleaf:online', () => {
  console.log('Connexion rétablie');
  GeoLeaf.UI.Notifications.success('Connexion rétablie');
  
  // Synchroniser les données
  GeoLeaf.Storage.SyncManager.sync();
});
```

#### `isOnline()`

Vérifie l'état online.

```javascript
if (GeoLeaf.Storage.OfflineDetector.isOnline()) {
  console.log('Online');
} else {
  console.log('Offline');
}
```

#### `ping(url)`

Teste la connectivité vers une URL.

```javascript
const isReachable = await GeoLeaf.Storage.OfflineDetector.ping('/api/health');
if (isReachable) {
  console.log('Serveur joignable');
}
```

---

## 🧩 Module 6 : `GeoLeaf.Storage.SyncManager` (sync-manager.js)

### Rôle

Gère la **synchronisation** des opérations offline ↔ online (POIs créés/modifiés offline).

### API Principale

#### `sync(profileId)`

Synchronise la file d'attente d'un profil.

```javascript
document.addEventListener('geoleaf:online', async () => {
  const result = await GeoLeaf.Storage.SyncManager.sync('tourism');
  console.log(`${result.synced} opérations synchronisées`);
  console.log(`${result.failed} opérations échouées`);
});
```

#### `addOperation(operation)`

Ajoute une opération à la file de synchro.

```javascript
// Créer un POI offline
const poi = {
  id: 'poi_temp_123',
  title: 'Nouveau restaurant',
  lat: 48.8566,
  lng: 2.3522
};

await GeoLeaf.Storage.SyncManager.addOperation({
  profileId: 'tourism',
  operation: 'create',
  data: { type: 'poi', poi }
});

GeoLeaf.UI.Notifications.info('POI sauvegardé localement, sera synchronisé quand connexion rétablie');
```

#### `getQueueSize(profileId)`

Récupère le nombre d'opérations en attente.

```javascript
const queueSize = await GeoLeaf.Storage.SyncManager.getQueueSize('tourism');
console.log(`${queueSize} opérations en attente de synchro`);
```

---

## 🧩 Module 7 : `GeoLeaf.Storage.Telemetry` (telemetry.js)

### Rôle

Collecte des **statistiques d'usage** et de performance pour optimiser l'application.

### Métriques collectées

- Temps de chargement des couches
- Taille du cache par profil
- Nombre de cache hits/misses
- Performance compression/décompression
- Fréquence d'accès aux ressources

### API Principale

#### `init(options)`

Initialise la télémétrie.

```javascript
GeoLeaf.Storage.Telemetry.init({
  enabled: true,
  endpoint: '/api/telemetry', // Optionnel : serveur de collecte
  batchSize: 50,
  flushInterval: 60000 // 1 minute
});
```

#### `track(event, metadata)`

Enregistre un événement.

```javascript
GeoLeaf.Storage.Telemetry.track('layer_loaded', {
  layerId: 'restaurants',
  duration: 250, // ms
  size: 102400,  // bytes
  fromCache: true
});
```

#### `getStats()`

Récupère les statistiques.

```javascript
const stats = await GeoLeaf.Storage.Telemetry.getStats();
console.log(stats);
// {
//   cacheHits: 127,
//   cacheMisses: 15,
//   avgLoadTime: 185, // ms
//   totalCacheSize: 15728640 // bytes
// }
```

---

## 🧩 Module 8 : Service Worker (sw.js + sw-register.js)

### Rôle

Le **Service Worker** intercepte les requêtes réseau pour fournir un cache automatique des assets et un fonctionnement offline transparent.

> ✅ **Implémenté** : Le Service Worker est fonctionnel depuis la version 3.2.0.

### Stratégies de cache (sw.js)

| Stratégie | Usage | Description |
|-----------|-------|-------------|
| `cache-first` | Tuiles, icônes | Cache local prioritaire, réseau en fallback |
| `network-first` | API, GeoJSON | Réseau prioritaire, cache en fallback |
| `stale-while-revalidate` | Config, profils | Réponse cache immédiate + mise à jour en arrière-plan |
| `network-only` | Auth, sync | Toujours réseau, pas de cache |

### API (sw-register.js)

#### `register(options)`

Enregistre le Service Worker.

```javascript
await GeoLeaf.Storage.ServiceWorker.register({
  scope: '/',
  updateOnReload: true
});
```

#### `update()`

Force la vérification de mise à jour du Service Worker.

```javascript
await GeoLeaf.Storage.ServiceWorker.update();
```

#### `unregister()`

Désenregistre le Service Worker.

```javascript
await GeoLeaf.Storage.ServiceWorker.unregister();
```

### Événement

- `geoleaf:sw:updated` : émis quand une nouvelle version du SW est disponible

```javascript
document.addEventListener('geoleaf:sw:updated', () => {
  if (confirm('Nouvelle version disponible. Recharger ?')) {
    window.location.reload();
  }
});
```

---

## 💡 Exemples d'intégration

### Exemple 1 : Cache complet d'un profil

```javascript
// Initialiser le cache manager
GeoLeaf.CacheManager.init({
  enableProfileCache: true,
  maxRetries: 5,
  concurrentDownloads: 15
});

// Cache le profil avec suivi de progression
const cacheButton = document.getElementById('cache-profile-btn');
const progressBar = document.getElementById('cache-progress');

cacheButton.addEventListener('click', async () => {
  try {
    const result = await GeoLeaf.CacheManager.cacheProfile('tourism', {
      onProgress: (progress) => {
        progressBar.value = progress.percent;
        progressBar.textContent = `${progress.downloaded}/${progress.total} ressources`;
      }
    });

    GeoLeaf.UI.Notifications.success(`Profil caché (${(result.totalSize / 1024 / 1024).toFixed(1)} MB)`);
  } catch (error) {
    if (error.isQuotaError) {
      GeoLeaf.UI.Notifications.error('Quota de stockage dépassé, libérez de l\'espace');
    } else {
      GeoLeaf.UI.Notifications.error(`Erreur de cache: ${error.message}`);
    }
  }
});
```

### Exemple 2 : Mode offline automatique

```javascript
// Initialiser la détection offline
GeoLeaf.Storage.OfflineDetector.init();

// Basculer en mode offline
document.addEventListener('geoleaf:offline', async () => {
  // Vérifier si profil est caché
  const isCached = await GeoLeaf.CacheManager.isProfileCached('tourism');
  
  if (isCached) {
    GeoLeaf.UI.Notifications.info('Mode offline activé, utilisation du cache local');
    GeoLeaf.Config.useOfflineMode = true;
  } else {
    GeoLeaf.UI.Notifications.error('Profil non disponible offline, veuillez le cacher d\'abord');
  }
});

// Retour en mode online
document.addEventListener('geoleaf:online', async () => {
  GeoLeaf.Config.useOfflineMode = false;
  
  // Synchroniser les opérations offline
  const result = await GeoLeaf.Storage.SyncManager.sync('tourism');
  if (result.synced > 0) {
    GeoLeaf.UI.Notifications.success(`${result.synced} opérations synchronisées`);
  }
});
```

### Exemple 3 : Cache avec compression

```javascript
// Sauvegarder une couche avec compression
async function saveLayerCompressed(layerId, geojsonData) {
  // Compresser les données
  const compressed = await GeoLeaf.Storage.Compression.compress(
    JSON.stringify(geojsonData),
    { format: 'gzip', contentType: 'application/json' }
  );

  // Sauvegarder en IndexedDB
  await GeoLeaf.Storage.DB.saveLayer({
    id: layerId,
    profileId: 'tourism',
    data: compressed,
    timestamp: Date.now(),
    size: compressed.size,
    compressed: true,
    compressionFormat: 'gzip'
  });

  console.log(`Couche sauvegardée (${compressed.size} bytes)`);
}

// Charger une couche avec décompression
async function loadLayerCompressed(layerId) {
  const layer = await GeoLeaf.Storage.DB.getLayer(layerId);
  
  if (!layer) return null;

  if (layer.compressed) {
    // Décompresser
    const decompressed = await GeoLeaf.Storage.Compression.decompress(
      layer.data,
      layer.compressionFormat || 'gzip'
    );
    const text = await decompressed.text();
    return JSON.parse(text);
  }

  return layer.data;
}
```

### Exemple 4 : Stratégie LRU pour gérer le cache

```javascript
// Créer un cache LRU pour les couches
const layerCache = new GeoLeaf.Storage.CachingStrategy.LRUCache(
  100 * 1024 * 1024 // 100 MB max
);

// Charger une couche (avec cache)
async function loadLayer(layerId) {
  // Vérifier le cache en mémoire
  let data = layerCache.get(layerId);
  if (data) {
    console.log('Cache hit (mémoire)');
    return data;
  }

  // Vérifier IndexedDB
  data = await GeoLeaf.Storage.DB.getLayer(layerId);
  if (data) {
    console.log('Cache hit (IndexedDB)');
    layerCache.add(layerId, data);
    return data;
  }

  // Télécharger depuis le serveur
  console.log('Cache miss, téléchargement...');
  const response = await fetch(`/data/${layerId}.geojson`);
  data = await response.json();

  // Sauvegarder en cache
  await GeoLeaf.Storage.DB.saveLayer({
    id: layerId,
    data,
    timestamp: Date.now()
  });
  layerCache.add(layerId, data);

  return data;
}
```

---

## 📊 Statistiques de stockage

### Vérifier le quota disponible

```javascript
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  
  const used = estimate.usage;
  const quota = estimate.quota;
  const percent = (used / quota * 100).toFixed(1);
  
  console.log(`Stockage utilisé: ${(used / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Quota total: ${(quota / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Utilisation: ${percent}%`);
}
```

### Persister le stockage (éviter éviction)

```javascript
if (navigator.storage && navigator.storage.persist) {
  const persistent = await navigator.storage.persist();
  
  if (persistent) {
    console.log('Stockage persistant activé (ne sera pas évincé)');
  } else {
    console.log('Stockage non persistant (peut être évincé si espace faible)');
  }
}
```

---

## ⚠️ Limitations

1. **Quota navigateur** : Chrome ~60% disque libre, Firefox ~50% (varie)
2. **Performance IndexedDB** : Lent sur gros datasets (>50MB), utiliser pagination
3. **Compression** : Requiert `CompressionStream` API (Chrome 80+, Firefox 113+)
4. **Synchro offline** : Requiert implémentation backend pour résolution conflits
5. **Télémétrie** : Collecte côté client seulement, non persistante entre sessions

---

## 🔗 Modules liés

- **[GeoLeaf.Config](../config/GeoLeaf_Config_README.md)** : Configuration cache dans `storage.cache`
- **[GeoLeaf.GeoJSON](../geojson/GeoLeaf_GeoJSON_README.md)** : Chargement GeoJSON avec fallback cache
- **[GeoLeaf.UI.Notifications](../ui/GeoLeaf_UI_Components_README.md)** : Notifications pour cache/offline
- **[GeoLeaf.Utils](../utils/GeoLeaf_Utils_README.md)** : FetchHelper utilisé pour téléchargements

---

## 🚀 Améliorations futures

### Phase 1 (Q1 2026) — ✅ Réalisé
- [x] Service Worker pour cache automatique des assets
- [x] Background Sync API pour synchro en tâche de fond
- [ ] Cache Busting intelligent (versioning ressources)

### Phase 2 (Q2 2026)
- [ ] Activation `compression.js` (gzip/deflate) dans le bundle plugin
- [ ] Activation `cache-strategy.js` (LRU, LFU, TTL, FIFO) dans le bundle plugin
- [ ] Compression Brotli (meilleure que gzip)
- [ ] Cache prédictif (preload couches adjacentes)
- [ ] Delta sync (synchro incrémentale, pas full)

### Phase 3 (Q3 2026)
- [ ] Shared Workers pour cache partagé entre onglets
- [ ] WebAssembly pour compression ultra-rapide
- [ ] Conflict resolution UI pour synchro offline

---

**Version** : 3.2.0  
**Dernière mise à jour** : 15 février 2026  
**Sprint 3** : Documentation complète du système Storage & Cache ✅  
**Sprint 4** : Service Worker implémenté, layer-selector refactorisé, dead code nettoyé ✅
