# Limitation : Paramètre `normalized` et système de mapping

Product Version: GeoLeaf Platform V1  
**Date :** 10 décembre 2025  
**Statut :** ⚠️ Fonctionnalité partiellement implémentée  
**Impact :** Moyen - Le système charge `mapping.json` mais ne l'applique jamais

---

## 📋 Résumé

Les paramètres `normalized` et `mappingId` dans `profile.json` sont **déclarés mais non fonctionnels**. Le système vérifie si un mapping est requis et charge le fichier `mapping.json`, mais **n'applique jamais les transformations définies**.

---

## 🔍 Analyse détaillée

### Configuration attendue dans `profile.json`

```json
{
    "id": "world_countries_public",
    "type": "geojson",
    "url": "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",

    "normalized": false, // ⚠️ Devrait déclencher une transformation
    "mappingId": "world-countries-public", // ⚠️ Devrait référencer le mapping à appliquer

    "geometryType": "polygon"
    // ... autres options
}
```

### Fichier `mapping.json` correspondant

```json
{
    "source": "public_world_geo",
    "mapping": {
        "id": "properties.name",
        "title": "properties.name",
        "location.lat": "geometry.coordinates[0][0][1]",
        "location.lng": "geometry.coordinates[0][0][0]",
        "attributes.region": "properties.region",
        "attributes.subregion": "properties.subregion"
    }
}
```

---

## 🐛 Comportement actuel

### 1. Chargement du profil (`src/modules/config/profile.js`)

**Ligne 214 :**

```javascript
requiresMapping = profile.layers.some((layer) => layer.normalized === false);
```

✅ **Ce qui fonctionne :**

- Le système détecte correctement si au moins une couche a `normalized: false`
- Il charge alors le fichier `mapping.json` depuis le profil

**Lignes 218-222 :**

```javascript
const mappingPromise =
    isPoiMappingEnabled && requiresMapping
        ? Loader.fetchJson(`${baseUrl}/mapping.json?t=${timestamp}`, fetchOptions).catch((err) => {
              Log.error(
                  "[GeoLeaf.Config.Profile] mapping.json requis (normalized:false) mais non trouvé ou invalide.",
                  err
              );
              return null;
          })
        : Promise.resolve(null);
```

✅ Le fichier `mapping.json` est bien chargé en mémoire

---

### 2. Conversion des données (`src/modules/geojson/loader.js`)

**Ligne 294 :**

```javascript
geojsonData = DataConverter ? DataConverter.autoConvert(rawData) : rawData;
```

❌ **Le problème :**

- La fonction `autoConvert` est appelée **sans passer** :
    - Le paramètre `normalized` de la couche
    - Le `mappingId` de la couche
    - L'objet `mapping` chargé depuis `mapping.json`

---

### 3. Auto-conversion (`src/modules/config/data-converter.js`)

**Lignes 481-484 :**

```javascript
// Cas 1 : Déjà GeoJSON
if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    Log.debug("[DataConverter.autoConvert] Données déjà en GeoJSON, passage direct");
    return data; // ⚠️ AUCUNE TRANSFORMATION APPLIQUÉE
}
```

❌ **Le problème :**

- Si les données sont déjà au format GeoJSON, elles sont retournées telles quelles
- **Aucun mapping n'est appliqué**, même si `normalized: false`
- Le paramètre `mappingId` n'est jamais consulté

---

## 🎯 Conséquences pratiques

### Pourquoi ça fonctionne quand même ?

Les couches publiques comme `world_countries_public` s'affichent car :

1. **GeoJSON standard compatible** :

    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": { ... },
          "properties": {
            "name": "France",
            "region": "Europe"
          }
        }
      ]
    }
    ```

2. **Accès direct aux properties** :
    - `properties.name` est accessible pour les popups
    - Les `styleRules` peuvent référencer `properties.name`
    - Les tooltips fonctionnent avec `field: "properties.name"`

### Limitations observées

Cependant, vous **perdez** :

❌ **Structure normalisée GeoLeaf** :

```javascript
{
  id: "france",
  title: "France",           // ❌ Absent, devait venir du mapping
  description: "",            // ❌ Absent
  latlng: [46.6, 2.3],       // ❌ Absent, centroïde non calculé
  attributes: {
    region: "Europe",         // ❌ Devait être mappé
    subregion: "Western Europe"
  },
  categoryId: null,
  subCategoryId: null
}
```

❌ **Fonctionnalités impactées** :

- Recherche textuelle avancée (indexation limitée)
- Centrage automatique sur un élément
- Intégration cohérente avec les POI normalisés
- Tri et filtres dans le tableau de données
- Sidepanel avec structure prédéfinie

---

## 📊 Comparaison : Données attendues vs reçues

### Données source (GeoJSON public)

```json
{
  "type": "Feature",
  "properties": {
    "name": "France",
    "ADMIN": "France",
    "ISO_A3": "FRA"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[2.5, 51.0], [8.2, 48.8], ...]]
  }
}
```

### Après mapping (attendu mais non appliqué)

```javascript
{
  id: "france",                    // ⬅️ properties.name
  title: "France",                 // ⬅️ properties.name
  latlng: [46.6, 2.3],            // ⬅️ Centroïde calculé
  attributes: {
    region: undefined,             // ⬅️ properties.region (absent dans source)
    subregion: undefined
  },
  // + toute la structure normalisée GeoLeaf
}
```

### Résultat actuel (sans transformation)

```javascript
{
  type: "Feature",
  properties: {
    name: "France",          // ✅ Utilisable directement
    ADMIN: "France",
    ISO_A3: "FRA"
  },
  geometry: { ... }          // ✅ Géométrie Leaflet fonctionne
}
```

---

## 🔧 Solutions de contournement

### Option 1 : Accepter la limitation (recommandé actuellement)

Mettez `normalized: true` et utilisez directement les `properties` :

```json
{
    "id": "world_countries_public",
    "normalized": true, // ✅ Reflète la réalité
    // Ne pas utiliser mappingId

    "popup": {
        "detailPopup": [
            {
                "field": "properties.name", // ✅ Accès direct
                "label": "Pays"
            }
        ]
    },

    "styleRules": [
        {
            "when": {
                "field": "properties.name", // ✅ Fonctionne
                "operator": "eq",
                "value": "France"
            }
        }
    ]
}
```

### Option 2 : Normaliser manuellement les données

Créez un fichier GeoJSON normalisé localement :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "france",
      "geometry": { ... },
      "properties": {
        "id": "france",
        "title": "France",
        "description": "Pays d'Europe de l'Ouest",
        "categoryId": "countries",
        "subCategoryId": "europe-west",
        "name": "France",
        "region": "Europe"
      }
    }
  ]
}
```

Puis dans le profil :

```json
{
    "url": "../profiles/tourism/datas/countries_normalized.json",
    "normalized": true
}
```

### Option 3 : Implémenter le système de mapping (développement requis)

**Modifications nécessaires dans `loader.js` :**

```javascript
// Ligne 294 - AVANT
geojsonData = DataConverter ? DataConverter.autoConvert(rawData) : rawData;

// Ligne 294 - APRÈS
const mappingConfig =
    def.normalized === false && def.mappingId
        ? GeoLeaf.Config.Profile.getMappingById(def.mappingId)
        : null;

geojsonData = DataConverter
    ? DataConverter.autoConvert(rawData, def.normalized, mappingConfig)
    : rawData;
```

**Modifications nécessaires dans `data-converter.js` :**

```javascript
autoConvert(data, normalized = true, mappingConfig = null) {
    if (!data) {
        return { type: "FeatureCollection", features: [] };
    }

    // Si déjà GeoJSON ET normalized=false, appliquer le mapping
    if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
        if (normalized === false && mappingConfig) {
            return this.applyMapping(data, mappingConfig);
        }
        return data;
    }

    // ... reste du code
}

/**
 * Applique un mapping sur une FeatureCollection
 */
applyMapping(geojsonData, mappingConfig) {
    if (!mappingConfig || !mappingConfig.mapping) {
        return geojsonData;
    }

    const mappedFeatures = geojsonData.features.map(feature => {
        const mappedProperties = {};

        // Appliquer chaque règle de mapping
        for (const [targetField, sourcePath] of Object.entries(mappingConfig.mapping)) {
            const value = this._getNestedValue(feature, sourcePath);
            this._setNestedValue(mappedProperties, targetField, value);
        }

        return {
            ...feature,
            properties: {
                ...feature.properties,
                ...mappedProperties
            }
        };
    });

    return {
        ...geojsonData,
        features: mappedFeatures
    };
}

_getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

_setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => {
        if (!acc[key]) acc[key] = {};
        return acc[key];
    }, obj);
    target[lastKey] = value;
}
```

---

## 📝 Recommandations

### Pour les développeurs

1. **Court terme** : Documentez clairement que `normalized` doit être `true` pour les données GeoJSON externes
2. **Moyen terme** : Implémentez le système de mapping complet si vous prévoyez d'intégrer régulièrement des sources externes
3. **Long terme** : Créez un outil CLI pour convertir automatiquement des GeoJSON publics vers le format normalisé GeoLeaf

### Pour les utilisateurs

1. ✅ **Utilisez `normalized: true`** pour les sources GeoJSON déjà compatibles
2. ✅ **Référencez directement les properties** dans vos configurations (`field: "properties.xxx"`)
3. ⚠️ **Ne déclarez pas `mappingId`** tant que le système n'est pas implémenté
4. 📝 **Documentez les champs disponibles** de chaque source externe dans vos commentaires

---

## 🧪 Tests de validation

Pour vérifier cette limitation, vous pouvez :

```javascript
// Dans la console navigateur
const profile = GeoLeaf.Config.Profile.getActiveProfile();
const worldLayer = profile.layers.find((l) => l.id === "world_countries_public");

console.log("Normalized:", worldLayer.normalized);
console.log("MappingId:", worldLayer.mappingId);

// Vérifier le mapping chargé
const mapping = GeoLeaf.Config.Profile._activeProfileMapping;
console.log("Mapping loaded:", mapping);

// Vérifier les données réelles
const layerData = GeoLeaf.GeoJSON.getLayerData("world_countries_public");
console.log("Feature properties:", layerData?.[0]?.properties);
console.log("Has normalized title?", layerData?.[0]?.title); // undefined
```

---

## 🔗 Fichiers concernés

| Fichier                                | Ligne   | Statut        | Description                           |
| -------------------------------------- | ------- | ------------- | ------------------------------------- |
| `src/modules/config/profile.js`        | 214     | ✅ Fonctionne | Détection du besoin de mapping        |
| `src/modules/config/profile.js`        | 218-222 | ✅ Fonctionne | Chargement de `mapping.json`          |
| `src/modules/geojson/loader.js`        | 294     | ❌ Incomplet  | N'applique pas le mapping             |
| `src/modules/config/data-converter.js` | 481-484 | ❌ Incomplet  | Retourne GeoJSON sans transformation  |
| `src/modules/config/data-converter.js` | -       | ❌ Manquant   | Fonction `applyMapping()` inexistante |

---

## 📚 Références

- Documentation profils : `docs/config/readme.config-json.md`
- Exemple de configuration : `profiles/tourism/profile.json`
- Tests associés : `__tests__/config/profile.test.js`

---

## ✅ Checklist d'implémentation future

Si vous décidez d'implémenter complètement cette fonctionnalité :

- [ ] Modifier `autoConvert()` pour accepter `normalized` et `mappingConfig`
- [ ] Créer la fonction `applyMapping()` dans `data-converter.js`
- [ ] Passer les paramètres depuis `loader.js` (ligne 294)
- [ ] Ajouter une méthode `getMappingById()` dans `profile.js`
- [ ] Gérer les mappings multiples (plusieurs `mappingId`)
- [ ] Supporter les chemins complexes (`geometry.coordinates[0][0][1]`)
- [ ] Calculer automatiquement les centroïdes pour `latlng`
- [ ] Créer des tests unitaires pour `applyMapping()`
- [ ] Documenter les patterns de mapping supportés
- [ ] Mettre à jour cette documentation

---

**Dernière mise à jour :** 10 décembre 2025  
**Auteur :** Analyse technique GeoLeaf  
**Version GeoLeaf :** v1.0.0 (profil tourism)
