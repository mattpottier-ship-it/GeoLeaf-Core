# GeoLeaf.Storage â€“ Documentation du module Storage
**Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.storage.js` + sous-modules `storage/`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---
Le module **GeoLeaf.Storage** fournit une API unifiÃ©e pour la gestion du stockage persistant et du mode offline dans GeoLeaf.

Il orchestrate trois sous-modules principaux :
- **IndexedDB** : cache persistant des couches et donnÃ©es cartographiques
- **Cache Manager** : gestion des profils mÃ©tier pour usage offline
- **Offline Detector** : dÃ©tection de l'Ã©tat de connectivitÃ© et affichage d'un badge

---

## 1. RÃ´le fonctionnel du Storage

GeoLeaf.Storage a quatre responsabilitÃ©s principales :

1. **Initialiser et coordonner** les modules de stockage (IndexedDB, Cache Manager, Offline Detector)
2. **Fournir une API simple** pour cacher des profils entiers pour usage offline
3. **DÃ©tecter l'Ã©tat de connectivitÃ©** et permettre le fonctionnement offline
4. **GÃ©rer le stockage persistant** des couches GeoJSON, prÃ©fÃ©rences utilisateur, et files d'attente de synchronisation

> Important : GeoLeaf.Storage nÃ©cessite un navigateur compatible avec **IndexedDB** (tous les navigateurs modernes).

---

## 2. API publique de GeoLeaf.Storage

### 2.1 `GeoLeaf.Storage.init(options)`

Initialise tous les modules de stockage (IndexedDB, Cache Manager, Offline Detector).

```js
await GeoLeaf.Storage.init(options);
```

- **ParamÃ¨tres :**
  - `options` : objet de configuration (optionnel)
    - `options.indexedDB` : configuration IndexedDB
      - `name` : nom de la base de donnÃ©es (dÃ©faut : `'geoleaf-db'`)
      - `version` : version de la base (dÃ©faut : `1`)
    - `options.cache` : configuration Cache Manager
      - `enableProfileCache` : activer cache des profils (dÃ©faut : `true`)
    - `options.offline` : configuration Offline Detector
      - `showBadge` : afficher le badge offline (dÃ©faut : `true`)
      - `badgePosition` : position du badge (dÃ©faut : `'top-right'`)
    - `options.enableOfflineDetector` : activer le dÃ©tecteur offline (dÃ©faut : `false`)

- **Retour :**
  - `Promise<boolean>` : `true` si l'initialisation rÃ©ussit

- **Ã‰vÃ©nements Ã©mis :**
  - `geoleaf:storage:initialized` : Ã©mis aprÃ¨s initialisation complÃ¨te

#### Exemple minimal

```js
// Initialisation basique
await GeoLeaf.Storage.init();
```

#### Exemple avec options

```js
// Initialisation avec configuration complÃ¨te
await GeoLeaf.Storage.init({
  indexedDB: {
    name: 'my-app-db',
    version: 2
  },
  cache: {
    enableProfileCache: true
  },
  offline: {
    showBadge: true,
    badgePosition: 'bottom-left'
  },
  enableOfflineDetector: true
});
```

---

### 2.2 Sous-modules accessibles

Le module Storage expose trois sous-modules :

#### `GeoLeaf.Storage.DB`

AccÃ¨s direct au module **IndexedDB** pour opÃ©rations bas niveau.

```js
// Exemple : cacher une couche
await GeoLeaf.Storage.DB.cacheLayer('layer-id', geojsonData, 'tourism');

// RÃ©cupÃ©rer une couche depuis le cache
const cachedLayer = await GeoLeaf.Storage.DB.getLayer('layer-id');
```

#### `GeoLeaf.Storage.CacheManager`

AccÃ¨s au **Cache Manager** pour gÃ©rer les profils.

```js
// Cacher un profil complet
await GeoLeaf.Storage.CacheManager.cacheProfile('tourism');

// Vérifier le statut du cache d'un profil
const status = await GeoLeaf.Storage.CacheManager.getCacheStatus('tourism');

// Supprimer le cache d'un profil
await GeoLeaf.Storage.CacheManager.clearCache('tourism');
```

#### `GeoLeaf.Storage.OfflineDetector`

AccÃ¨s au **dÃ©tecteur offline**.

```js
// Initialiser le dÃ©tecteur
GeoLeaf.Storage.OfflineDetector.init();

// VÃ©rifier l'Ã©tat de connexion
const isOnline = GeoLeaf.Storage.OfflineDetector.isOnline();

// DÃ©truire le dÃ©tecteur
GeoLeaf.Storage.OfflineDetector.destroy();
```

---

### 2.3 `GeoLeaf.Storage.isAvailable()`

VÃ©rifie si le stockage est disponible et initialisÃ©.

```js
const isReady = GeoLeaf.Storage.isAvailable();
```

- **Retour :** `boolean` - `true` si IndexedDB est initialisÃ©

#### Exemple

```js
if (GeoLeaf.Storage.isAvailable()) {
  console.log('Storage prÃªt');
} else {
  console.warn('Storage non initialisÃ©');
}
```

---

### 2.4 `GeoLeaf.Storage.isOffline()`

VÃ©rifie si l'application est en mode offline.

```js
const offline = GeoLeaf.Storage.isOffline();
```

- **Retour :** `boolean` - `true` si offline

#### Exemple

```js
if (GeoLeaf.Storage.isOffline()) {
  console.log('Mode offline - utilisation du cache local');
} else {
  console.log('Mode online - chargement depuis le rÃ©seau');
}
```

---

### 2.5 `GeoLeaf.Storage.getStats()`

Obtient des statistiques complÃ¨tes sur le stockage.

```js
const stats = await GeoLeaf.Storage.getStats();
```

- **Retour :** `Promise<Object>` avec structure :
  ```js
  {
    storage: {
      used: 1048576,        // octets utilisÃ©s
      quota: 1073741824,    // quota total
      percentage: 0.1       // pourcentage utilisÃ©
    },
    layers: {
      count: 15,           // nombre de couches en cache
      byProfile: {         // dÃ©tail par profil
        'tourism': 15
      }
    },
    sync: {
      pending: 2,          // opÃ©rations en attente de sync
      failed: 0            // opÃ©rations Ã©chouÃ©es
    },
    cache: {
      profiles: ['tourism']  // profils en cache
    },
    online: true          // Ã©tat de connexion
  }
  ```

#### Exemple

```js
const stats = await GeoLeaf.Storage.getStats();
console.log(`Storage: ${(stats.storage.used / 1024 / 1024).toFixed(2)} MB utilisÃ©s`);
console.log(`Couches en cache: ${stats.storage.count}`);
console.log(`Profils disponibles offline: ${stats.cache.profiles.join(', ')}`);
```

---

### 2.6 `GeoLeaf.Storage.clearAll()`

Nettoie complÃ¨tement le stockage (toutes les donnÃ©es).

```js
await GeoLeaf.Storage.clearAll();
```

- **Retour :** `Promise<void>`
- **Ã‰vÃ©nements Ã©mis :** `geoleaf:storage:cleared`

âš ï¸ **Attention** : Cette opÃ©ration est destructive et efface tous les profils en cache, les prÃ©fÃ©rences et les files d'attente de synchronisation.

#### Exemple

```js
// Confirmation avant nettoyage
if (confirm('Supprimer toutes les donnÃ©es en cache ?')) {
  await GeoLeaf.Storage.clearAll();
  console.log('Cache vidÃ©');
}
```

---

### 2.7 `GeoLeaf.Storage.close()`

Ferme toutes les connexions de stockage proprement.

```js
GeoLeaf.Storage.close();
```

Utile lors du dÃ©montage de l'application ou avant rechargement.

---

### 2.8 `GeoLeaf.Storage.downloadProfileForOffline(profileId, onProgress)`

Helper pour tÃ©lÃ©charger un profil complet pour usage offline.

```js
await GeoLeaf.Storage.downloadProfileForOffline(profileId, onProgress);
```

- **ParamÃ¨tres :**
  - `profileId` : `string` - ID du profil Ã  tÃ©lÃ©charger
  - `onProgress` : `Function` (optionnel) - callback de progression (percent)

- **Retour :** `Promise<Object>` - rÃ©sultat du tÃ©lÃ©chargement
- **Erreurs :** `Error` si quota insuffisant ou profil introuvable

#### Exemple

```js
try {
  await GeoLeaf.Storage.downloadProfileForOffline('tourism', (percent) => {
    console.log(`Téléchargement: ${percent}%`);
    // Mettre à jour une barre de progression
    document.getElementById('progress').value = percent;
  });
  
  alert('Profil tourism disponible offline !');
} catch (error) {
  console.error('Erreur tÃ©lÃ©chargement:', error.message);
}
```

---

### 2.9 `GeoLeaf.Storage.isProfileAvailableOffline(profileId)`

VÃ©rifie si un profil est disponible offline.

```js
const isAvailable = await GeoLeaf.Storage.isProfileAvailableOffline(profileId);
```

- **ParamÃ¨tres :**
  - `profileId` : `string` - ID du profil

- **Retour :** `Promise<boolean>` - `true` si le profil est en cache

#### Exemple

```js
const hasTourism = await GeoLeaf.Storage.isProfileAvailableOffline('tourism');
if (hasTourism) {
  console.log('Profil tourism disponible offline');
} else {
  console.log('Profil tourism nécessite connexion réseau');
}
```

---

### 2.10 `GeoLeaf.Storage.getOfflineProfiles()`

Obtient la liste des profils disponibles offline.

```js
const profiles = await GeoLeaf.Storage.getOfflineProfiles();
```

- **Retour :** `Promise<Array<string>>` - liste des IDs de profils en cache

#### Exemple

```js
const offlineProfiles = await GeoLeaf.Storage.getOfflineProfiles();
console.log('Profils disponibles offline:', offlineProfiles);
// Afficher dans l'UI
offlineProfiles.forEach(profileId => {
  console.log(`âœ“ ${profileId}`);
});
```

---

## 3. Architecture interne

### 3.1 Modules composants

```
GeoLeaf.Storage (API publique)
    â”œâ”€â”€ GeoLeaf._StorageDB (IndexedDB)
    â”‚   â”œâ”€â”€ Object Stores:
    â”‚   â”‚   â”œâ”€â”€ layers           (couches GeoJSON)
    â”‚   â”‚   â”œâ”€â”€ sync_queue       (opÃ©rations diffÃ©rÃ©es)
    â”‚   â”‚   â”œâ”€â”€ preferences      (prÃ©fÃ©rences utilisateur)
    â”‚   â”‚   â””â”€â”€ metadata         (mÃ©tadonnÃ©es)
    â”‚   â””â”€â”€ MÃ©thodes:
    â”‚       â”œâ”€â”€ init()
    â”‚       â”œâ”€â”€ cacheLayer()
    â”‚       â”œâ”€â”€ getLayer()
    â”‚       â”œâ”€â”€ getLayersByProfile()
    â”‚       â””â”€â”€ getStorageStats()
    â”‚
    â”œâ”€â”€ GeoLeaf._CacheManager
    â”‚   â”œâ”€â”€ ResponsabilitÃ©s:
    â”‚   â”‚   â”œâ”€â”€ Cache profils complets
    â”‚   â”‚   â”œâ”€â”€ Estimation taille
    â”‚   â”‚   â””â”€â”€ Gestion quota
    â”‚   â””â”€â”€ MÃ©thodes:
    â”‚       â”œâ”€â”€ cacheProfile()
    â”‚       â”œâ”€â”€ isProfileCached()
    â”‚       â”œâ”€â”€ listCachedProfiles()
    â”‚       â”œâ”€â”€ clearCache()
    â”‚       â””â”€â”€ estimateProfileSize()
    â”‚
    â””â”€â”€ GeoLeaf._OfflineDetector
        â”œâ”€â”€ ResponsabilitÃ©s:
        â”‚   â”œâ”€â”€ DÃ©tection connectivitÃ©
        â”‚   â”œâ”€â”€ Badge UI
        â”‚   â””â”€â”€ Ã‰vÃ©nements rÃ©seau
        â””â”€â”€ MÃ©thodes:
            â”œâ”€â”€ init()
            â”œâ”€â”€ isOnline()
            â””â”€â”€ destroy()
```

### 3.2 Flux de donnÃ©es

```
1. Initialisation
   GeoLeaf.Storage.init()
   â””â”€â”€ Initialise IndexedDB, CacheManager, OfflineDetector
   â””â”€â”€ Ã‰met: geoleaf:storage:initialized

2. TÃ©lÃ©chargement profil offline
   GeoLeaf.Storage.downloadProfileForOffline('tourism')
   â””â”€â”€ CacheManager.estimateProfileSize()
   â””â”€â”€ CacheManager.cacheProfile()
       â””â”€â”€ Pour chaque couche:
           â””â”€â”€ IndexedDB.cacheLayer(layerId, data, 'tourism')

3. Chargement avec fallback cache
   if (GeoLeaf.Storage.isOffline()) {
     data = await GeoLeaf.Storage.DB.getLayer(layerId)
   } else {
     data = await fetch(url)
     await GeoLeaf.Storage.DB.cacheLayer(layerId, data, profileId)
   }

4. Nettoyage
   GeoLeaf.Storage.clearAll()
   â””â”€â”€ CacheManager.clearCache() pour chaque profil
   â””â”€â”€ IndexedDB clear() sur tous les object stores
   â””â”€â”€ Ã‰met: geoleaf:storage:cleared
```

---

## 4. Ã‰vÃ©nements

Le module Storage Ã©met les Ã©vÃ©nements suivants :

| Ã‰vÃ©nement | DÃ©tail | Description |
|-----------|--------|-------------|
| `geoleaf:storage:initialized` | - | Storage initialisÃ© avec succÃ¨s |
| `geoleaf:storage:cleared` | - | Tout le cache a Ã©tÃ© vidÃ© |
| `geoleaf:storage:profile:cached` | `{profileId}` | Profil mis en cache |
| `geoleaf:storage:profile:cleared` | `{profileId}` | Cache d'un profil supprimÃ© |
| `geoleaf:offline:changed` | `{online: boolean}` | Ã‰tat de connexion modifiÃ© |

### Exemple d'Ã©coute

```js
document.addEventListener('geoleaf:storage:initialized', () => {
  console.log('Storage prÃªt !');
});

document.addEventListener('geoleaf:offline:changed', (e) => {
  if (e.detail.online) {
    console.log('Connexion rÃ©tablie');
  } else {
    console.log('Mode offline activÃ©');
  }
});
```

---

## 5. Configuration dans geoleaf.config.json

```json
{
  "storage": {
    "enabled": true,
    "indexedDB": {
      "name": "geoleaf-db",
      "version": 1
    },
    "cache": {
      "enableProfileCache": true,
      "maxCacheSize": 104857600
    },
    "offline": {
      "enabled": true,
      "showBadge": true,
      "badgePosition": "top-right",
      "checkInterval": 30000
    }
  }
}
```

---

## 6. Cas d'usage pratiques

### 6.1 Application offline-first

```js
// 1. Initialiser le storage avec dÃ©tecteur offline
await GeoLeaf.Storage.init({
  enableOfflineDetector: true,
  offline: {
    showBadge: true,
    badgePosition: 'top-right'
  }
});

// 2. TÃ©lÃ©charger profil pour offline
if (confirm('TÃ©lÃ©charger le profil pour usage offline ?')) {
  await GeoLeaf.Storage.downloadProfileForOffline('tourism', (percent) => {
    console.log(`TÃ©lÃ©chargement: ${percent}%`);
  });
  alert('Profil disponible offline !');
}

// 3. Charger avec fallback automatique
async function loadLayer(layerId, url) {
  if (GeoLeaf.Storage.isOffline()) {
    // Mode offline : charger depuis cache
    console.log('Mode offline - chargement depuis cache');
    return await GeoLeaf.Storage.DB.getLayer(layerId);
  } else {
    // Mode online : charger depuis rÃ©seau + mise en cache
    const response = await fetch(url);
    const data = await response.json();
    await GeoLeaf.Storage.DB.cacheLayer(layerId, data, 'tourism');
    return data;
  }
}
```

### 6.2 Gestion du quota de stockage

```js
// VÃ©rifier l'espace disponible avant tÃ©lÃ©chargement
const stats = await GeoLeaf.Storage.getStats();
const availableMB = (stats.storage.quota - stats.storage.used) / 1024 / 1024;

console.log(`Espace disponible: ${availableMB.toFixed(2)} MB`);

if (availableMB < 10) {
  alert('Espace de stockage insuffisant. Veuillez libÃ©rer de l\'espace.');
  
  // Proposer de supprimer d'anciens profils
  const profiles = await GeoLeaf.Storage.getOfflineProfiles();
  console.log('Profils en cache:', profiles);
}
```

### 6.3 Synchronisation diffÃ©rÃ©e

```js
// Ajouter une opÃ©ration en file d'attente de sync (cas offline)
if (GeoLeaf.Storage.isOffline()) {
  await GeoLeaf.Storage.DB.addToSyncQueue({
    type: 'poi:create',
    data: newPOI,
    timestamp: Date.now()
  });
  
  console.log('OpÃ©ration en attente de synchronisation');
}

// Synchroniser quand connexion rÃ©tablie
document.addEventListener('geoleaf:offline:changed', async (e) => {
  if (e.detail.online) {
    console.log('Connexion rÃ©tablie - synchronisation...');
    const queue = await GeoLeaf.Storage.DB.getSyncQueue();
    
    for (const operation of queue) {
      try {
        await syncOperation(operation);
        await GeoLeaf.Storage.DB.removeFromSyncQueue(operation.id);
      } catch (error) {
        console.error('Erreur sync:', error);
      }
    }
  }
});
```

---

## 7. Bonnes pratiques

### âœ… Ã€ faire

- **Toujours initialiser** Storage avant utilisation : `await GeoLeaf.Storage.init()`
- **VÃ©rifier la disponibilitÃ©** avant opÃ©rations : `GeoLeaf.Storage.isAvailable()`
- **GÃ©rer les erreurs** avec try/catch sur opÃ©rations async
- **Surveiller le quota** avec `getStats()` rÃ©guliÃ¨rement
- **Fermer proprement** avec `close()` lors du dÃ©montage

### âŒ Ã€ Ã©viter

- âŒ Utiliser Storage sans initialisation
- âŒ Stocker des donnÃ©es sensibles non chiffrÃ©es
- âŒ Cacher des profils trÃ¨s volumineux sans vÃ©rifier quota
- âŒ Oublier de gÃ©rer le cas offline dans l'application

---

## 8. CompatibilitÃ© navigateurs

| Navigateur | Version minimale | Support |
|------------|------------------|---------|
| Chrome | 24+ | âœ… |
| Firefox | 16+ | âœ… |
| Safari | 10+ | âœ… |
| Edge | 12+ | âœ… |
| Opera | 15+ | âœ… |
| IE | âŒ | Non supportÃ© |

---

## 9. DÃ©pannage

### ProblÃ¨me : "Storage not initialized"

**Cause** : `GeoLeaf.Storage.init()` n'a pas Ã©tÃ© appelÃ© ou a Ã©chouÃ©

**Solution** :
```js
try {
  await GeoLeaf.Storage.init();
} catch (error) {
  console.error('Erreur init storage:', error);
}
```

### ProblÃ¨me : "QuotaExceededError"

**Cause** : Quota de stockage dÃ©passÃ©

**Solution** :
```js
const stats = await GeoLeaf.Storage.getStats();
if (stats.storage.percentage > 0.9) {
  // Nettoyer d'anciens profils
  await GeoLeaf.Storage.CacheManager.clearCache('old-profile');
}
```

### ProblÃ¨me : DonnÃ©es obsolÃ¨tes en cache

**Solution** : Forcer rechargement rÃ©seau et mise Ã  jour cache
```js
// Ignorer cache et recharger
const data = await fetch(url);
await GeoLeaf.Storage.DB.cacheLayer(layerId, data, profileId);
```

---

## 10. Voir aussi

- **IndexedDB** : [docs/storage/indexeddb.md](indexeddb.md)
- **Cache Manager** : [docs/storage/cache-manager.md](cache-manager.md)
- **Offline Detector** : [docs/storage/offline-detector.md](offline-detector.md)
- **Guide dÃ©veloppeur** : [docs/DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)
- **Architecture** : [docs/ARCHITECTURE_GUIDE.md](../ARCHITECTURE_GUIDE.md)
