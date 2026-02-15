# GeoLeaf — IndexedDB & IDB Helper

> **Version** : 3.2.0 — **Date** : 15 février 2026
> **Plugin** : Storage (`geoleaf-storage.plugin.js`)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Module StorageDB (indexeddb.js)](#3-module-storagedb-indexeddbjs)
4. [Module IDBHelper (idb-helper.js)](#4-module-idbhelper-idb-helperjs)
5. [Sous-modules DB spécialisés](#5-sous-modules-db-spécialisés)
6. [Schema Validators](#6-schema-validators)
7. [Exemples d'utilisation](#7-exemples-dutilisation)
8. [Dépannage](#8-dépannage)
9. [Voir aussi](#9-voir-aussi)

---

## 1. Vue d'ensemble

Le système IndexedDB de GeoLeaf fournit un stockage **persistant côté client** pour :

- **Couches GeoJSON** : cache local des données géographiques (profils, couches)
- **Préférences utilisateur** : thème, basemap, zoom, filtres actifs
- **File de synchronisation** : opérations offline (ajout/édition/suppression de POI) en attente de sync
- **Métadonnées** : timestamps, versions, tailles des caches
- **Images** : icônes et images POI mises en cache

Le module est chargé via le **plugin Storage** et n'est disponible que si `geoleaf-storage.plugin.js` est inclus.

---

## 2. Architecture

```
storage/
├── idb-helper.js          ← Wrapper promise-based (utilitaire bas niveau)
├── indexeddb.js            ← Module principal StorageDB (5 object stores)
├── schema-validators.js   ← Validation des données avant écriture
└── db/                    ← Sous-modules spécialisés par object store
    ├── layers.js          ← CRUD couches GeoJSON
    ├── preferences.js     ← Key-value préférences
    ├── sync.js            ← File d'attente synchronisation
    ├── backups.js         ← Sauvegardes automatiques
    └── images.js          ← Cache images POI
```

### Dépendances internes

```
IDBHelper ← utilisé par → StorageDB, CacheStorage, CacheManager
StorageDB ← utilisé par → DB Modules (lazy loading)
SchemaValidators ← utilisé par → StorageDB (validation avant écriture)
```

---

## 3. Module StorageDB (`indexeddb.js`)

**Namespace** : `GeoLeaf.StorageDB`
**Taille** : ~507 lignes

### Object Stores

| Store | Clé | Index | Contenu |
|-------|-----|-------|---------|
| `layers` | `id` | `profileId` | Données GeoJSON des couches |
| `preferences` | `key` | — | Préférences utilisateur (key-value) |
| `sync_queue` | `id` (auto-increment) | `profileId`, `status` | Opérations offline en attente |
| `metadata` | `key` | — | Métadonnées cache (timestamps, versions) |
| `images` | `id` | `profileId` | Images et icônes POI |

### Configuration par défaut

```javascript
{
    _dbName: "geoleaf-db",
    _dbVersion: 2
}
```

### API principale

#### `StorageDB.init(config)`

Initialise la connexion IndexedDB. Crée la base et les object stores si nécessaire.

```javascript
await GeoLeaf.StorageDB.init({
    name: 'geoleaf-db',   // optionnel, défaut: 'geoleaf-db'
    version: 2              // optionnel, défaut: 2
});
```

**Mécanisme de robustesse** : utilise `promisifyRequest()` avec un **timeout de 15 secondes**. Si le timeout est atteint, bascule automatiquement vers une connexion IDB directe (sans `IDBHelper`).

#### `StorageDB.saveLayer(profileId, layerData)`

Sauvegarde une couche GeoJSON dans l'object store `layers`.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `profileId` | `string` | Identifiant du profil |
| `layerData` | `object` | Données GeoJSON complètes |

#### `StorageDB.getLayer(profileId, layerId)`

Récupère une couche depuis le cache.

#### `StorageDB.deleteLayer(profileId, layerId)`

Supprime une couche du cache.

#### `StorageDB.getAllLayers(profileId)`

Récupère toutes les couches d'un profil.

#### `StorageDB.setPreference(key, value)`

Sauvegarde une préférence utilisateur.

#### `StorageDB.getPreference(key)`

Récupère une préférence.

#### `StorageDB.addToSyncQueue(operation)`

Ajoute une opération à la file de synchronisation offline.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `operation` | `object` | `{ profileId, operation, data, status, timestamp }` |

#### `StorageDB.getSyncQueue(profileId)`

Récupère toutes les opérations en attente de synchronisation.

#### `StorageDB.clearSyncQueue(profileId)`

Vide la file de synchronisation après sync réussie.

#### `StorageDB.setMetadata(key, value)`

Sauvegarde une métadonnée (ex: version du cache, timestamp dernière sync).

#### `StorageDB.getMetadata(key)`

Récupère une métadonnée.

### Chargement différé des sous-modules

Les sous-modules DB (`db/layers.js`, `db/preferences.js`, etc.) sont initialisés à la demande via `_ensureModule()` :

```javascript
// Interne — chaque appel vérifie si le module est initialisé
_ensureModule(moduleName) {
    if (this._modules[moduleName]) return this._modules[moduleName];
    if (GeoLeaf.Storage._DBModules && GeoLeaf.Storage._DBModules[moduleName]) {
        const moduleConfig = GeoLeaf.Storage._DBModules[moduleName];
        this._modules[moduleName] = moduleConfig.init(this._db);
        return this._modules[moduleName];
    }
    return null;
}
```

---

## 4. Module IDBHelper (`idb-helper.js`)

**Namespace** : `GeoLeaf.Storage.IDBHelper`
**Taille** : ~280 lignes

Wrapper promise-based qui élimine ~80 lignes de code répétitif de wrapping de requêtes IndexedDB. Utilisé en interne par `indexeddb.js`, `cache/storage.js` et `cache-manager.js`.

### API complète

#### `IDBHelper.promisify(request, operation)`

Transforme une `IDBRequest` en Promise avec logging d'erreur via `ErrorLogger`.

```javascript
const result = await GeoLeaf.Storage.IDBHelper.promisify(
    objectStore.get(key),
    'Get layer:tourism-poi'
);
```

#### `IDBHelper.get(db, storeName, key)`

Lit un enregistrement par clé.

```javascript
const layer = await IDBHelper.get(db, 'layers', 'tourism-poi');
```

#### `IDBHelper.getAll(db, storeName)`

Récupère tous les enregistrements d'un store.

```javascript
const allPrefs = await IDBHelper.getAll(db, 'preferences');
```

#### `IDBHelper.put(db, storeName, data)`

Écrit ou met à jour un enregistrement.

```javascript
await IDBHelper.put(db, 'layers', { id: 'poi-1', data: geojson, timestamp: Date.now() });
```

#### `IDBHelper.delete(db, storeName, key)`

Supprime un enregistrement par clé.

```javascript
await IDBHelper.delete(db, 'layers', 'poi-1');
```

#### `IDBHelper.batchPut(db, storeName, items)`

Écrit plusieurs enregistrements dans une seule transaction (performant pour les imports bulk).

```javascript
await IDBHelper.batchPut(db, 'layers', [layer1, layer2, layer3]);
```

#### `IDBHelper.count(db, storeName)`

Compte le nombre d'enregistrements dans un store.

```javascript
const nbLayers = await IDBHelper.count(db, 'layers'); // → 42
```

#### `IDBHelper.clear(db, storeName)`

Vide entièrement un object store.

```javascript
await IDBHelper.clear(db, 'sync_queue');
```

#### `IDBHelper.getAllKeys(db, storeName)`

Récupère toutes les clés d'un store (sans les données).

```javascript
const keys = await IDBHelper.getAllKeys(db, 'preferences'); // → ['theme', 'basemap', 'zoom']
```

#### `IDBHelper.getByIndex(db, storeName, indexName, query)`

Lit des enregistrements via un index secondaire.

```javascript
const profileLayers = await IDBHelper.getByIndex(db, 'layers', 'profileId', 'tourism');
```

#### `IDBHelper.openCursor(db, storeName, callback)`

Ouvre un curseur pour itérer sur les enregistrements (traitement séquentiel, pas de chargement mémoire complet).

```javascript
await IDBHelper.openCursor(db, 'layers', (cursor) => {
    console.log(cursor.value);
    cursor.continue();
});
```

---

## 5. Sous-modules DB spécialisés

Chaque sous-module de `storage/db/` est initialisé paresseusement par `StorageDB._ensureModule()` et enregistré via `GeoLeaf.Storage._DBModules`.

### `db/layers.js`

Opérations CRUD sur les couches GeoJSON cachées. Gère la sérialisation/désérialisation des FeatureCollections.

### `db/preferences.js`

Stockage key-value pour les préférences utilisateur : thème UI, basemap active, niveau de zoom, filtres actifs, état du panneau latéral.

### `db/sync.js`

Gestion de la file d'attente de synchronisation offline. Chaque opération (ajout/édition/suppression de POI) est enregistrée avec un statut (`pending`, `syncing`, `synced`, `error`).

### `db/backups.js`

Sauvegardes automatiques des données utilisateur. Permet la restauration en cas de corruption de la base.

### `db/images.js`

Cache des images et icônes POI. Stocke les blobs directement dans IndexedDB pour un accès offline.

---

## 6. Schema Validators

**Fichier** : `storage/schema-validators.js`
**Namespace** : `GeoLeaf.Storage.Validators` + `GeoLeaf.Storage.Schemas`

### Validators (types simples)

| Validator | Vérifie |
|-----------|---------|
| `Theme` | `'light'` ou `'dark'` uniquement |
| `JSON` | Chaîne JSON parsable |
| `ProfileID` | Format d'identifiant de profil valide |
| `URL` | URL syntaxiquement correcte |
| `Timestamp` | Nombre positif (epoch ms) |
| `Size` | Entier positif (octets) |
| `Integer` | Nombre entier |
| `Boolean` | Booléen strict |

### Schemas (objets composés)

| Schema | Valide |
|--------|--------|
| `Layer` | Objet couche GeoJSON avec `id`, `profileId`, `data`, `timestamp` |
| `Preference` | Objet préférence avec `key`, `value` |
| `SyncQueueItem` | Opération de sync avec `profileId`, `operation`, `data`, `status` |
| `Metadata` | Métadonnée avec `key`, `value`, `timestamp` |
| `CacheEntry` | Entrée de cache avec intégrité (checksum, taille, expiration) |

---

## 7. Exemples d'utilisation

### Vérifier si IndexedDB est disponible

```javascript
if (GeoLeaf.StorageDB && GeoLeaf.StorageDB._db) {
    console.log('IndexedDB prêt');
}
```

### Sauvegarder et récupérer une préférence

```javascript
await GeoLeaf.StorageDB.setPreference('ui-theme', 'dark');
const theme = await GeoLeaf.StorageDB.getPreference('ui-theme');
// → 'dark'
```

### Lister les couches en cache pour un profil

```javascript
const layers = await GeoLeaf.StorageDB.getAllLayers('tourism');
console.log(`${layers.length} couches en cache pour le profil tourism`);
```

### Ajouter une opération offline à la queue de sync

```javascript
await GeoLeaf.StorageDB.addToSyncQueue({
    profileId: 'tourism',
    operation: 'add-poi',
    data: { name: 'Nouveau POI', lat: 43.5, lng: 1.5 },
    status: 'pending',
    timestamp: Date.now()
});
```

### Utiliser IDBHelper pour un batch import

```javascript
const layers = fetchedLayers.map(l => ({ id: l.id, profileId: 'tourism', data: l.geojson }));
await GeoLeaf.Storage.IDBHelper.batchPut(db, 'layers', layers);
```

---

## 8. Dépannage

### Erreur "promisifyRequest timeout (15s)"

La connexion IDB prend trop de temps. Causes possibles :
- Autre onglet bloquant une mise à jour de version (`onblocked`)
- Quota de stockage atteint
- Base corrompue

**Solution** : fermer les autres onglets GeoLeaf, ou vider le stockage via DevTools > Application > IndexedDB.

### Erreur "Object store not found"

La structure de la base ne correspond pas à la version attendue.

**Solution** : supprimer la base `geoleaf-db` dans DevTools et recharger.

### Données non persistées après rechargement

Vérifier que le navigateur n'est pas en **mode navigation privée** (IndexedDB peut être éphémère dans ce mode sur certains navigateurs).

---

## 9. Voir aussi

- [Storage README](GeoLeaf_Storage_README.md) — vue d'ensemble du système de stockage
- [Cache détaillé](cache-detailed.md) — modules de cache offline
- [Offline Detector](offline-detector.md) — détection online/offline
- [Plugins Guide](../plugins/GeoLeaf_Plugins_README.md) — architecture plugin
