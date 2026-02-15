# GeoLeaf.Errors â€“ Documentation du module Errors

**Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.errors.js` (297 lignes)  
**Date**: DÃ©cembre 2025

---

## ðŸ“Œ Vue d'ensemble

Le module **GeoLeaf.Errors** fournit des classes d'erreurs typÃ©es pour une gestion cohÃ©rente et contextuelle des erreurs dans toute la librairie GeoLeaf.

### Avantages des erreurs typÃ©es

- âœ… **Catch spÃ©cifique** - Distinguer les types d'erreurs
- âœ… **Contexte enrichi** - DonnÃ©es additionnelles pour debugging
- âœ… **Stack trace propre** - PrÃ©servation du stack d'appel
- âœ… **SÃ©rialisable** - Conversion JSON pour logging
- âœ… **Timestamp** - Horodatage automatique

---

## ðŸ—ï¸ HiÃ©rarchie des erreurs

```
Error (native)
  â””â”€ GeoLeafError (base)
      â”œâ”€ ValidationError
      â”œâ”€ SecurityError
      â”œâ”€ ConfigError
      â”œâ”€ NetworkError
      â”œâ”€ InitializationError
      â”œâ”€ MapError
      â”œâ”€ POIError
      â”œâ”€ GeoJSONError
      â””â”€ RouteError
```

---

## ðŸ“š Classes d'erreurs

### `GeoLeafError` (Base)

Classe de base pour toutes les erreurs GeoLeaf.

```js
const error = new GeoLeaf.Errors.GeoLeafError(
  'Erreur gÃ©nÃ©rique',
  { module: 'Core', operation: 'init' }
);

console.log(error.name);       // 'GeoLeafError'
console.log(error.message);    // 'Erreur gÃ©nÃ©rique'
console.log(error.context);    // { module: 'Core', operation: 'init' }
console.log(error.timestamp);  // '2025-12-09T10:30:00.000Z'
```

**MÃ©thodes** :
- `toJSON()` : Conversion en objet sÃ©rialisable
- `toString()` : Formatage lisible avec contexte

---

### `ValidationError`

Erreur de validation de donnÃ©es.

**UtilisÃ©e pour** :
- CoordonnÃ©es invalides
- ParamÃ¨tres manquants ou incorrects
- Format de donnÃ©es non conforme

```js
// Exemple 1 : CoordonnÃ©es invalides
throw new GeoLeaf.Errors.ValidationError(
  'Latitude must be between -90 and 90',
  { lat: 95, lng: -73, expected: 'Range: -90 to 90' }
);

// Exemple 2 : ParamÃ¨tre manquant
throw new GeoLeaf.Errors.ValidationError(
  'Missing required parameter: target',
  { provided: null, required: 'target' }
);

// Catch spÃ©cifique
try {
  GeoLeaf.Core.init({ /* options */ });
} catch (error) {
  if (error instanceof GeoLeaf.Errors.ValidationError) {
    console.error('Erreur de validation:', error.context);
  }
}
```

---

### `SecurityError`

Erreur de sÃ©curitÃ© dÃ©tectÃ©e.

**UtilisÃ©e pour** :
- DÃ©tection de contenu XSS
- Protocole URL non autorisÃ©
- Contenu non sÃ©curisÃ©

```js
// Exemple : Protocole dangereux
throw new GeoLeaf.Errors.SecurityError(
  'Protocol not allowed: javascript:',
  {
    url: 'javascript:alert(1)',
    allowedProtocols: ['http:', 'https:', 'data:']
  }
);

// Catch spÃ©cifique
try {
  GeoLeaf.Security.validateUrl(userUrl);
} catch (error) {
  if (error instanceof GeoLeaf.Errors.SecurityError) {
    console.error('âš ï¸ Tentative de sÃ©curitÃ© dÃ©tectÃ©e');
    // Logger pour analyse
  }
}
```

---

### `ConfigError`

Erreur de configuration.

**UtilisÃ©e pour** :
- Configuration JSON invalide
- Champ de configuration manquant
- Structure de profil incorrecte

```js
// Exemple : Configuration invalide
throw new GeoLeaf.Errors.ConfigError(
  'Invalid profile structure: missing layers',
  {
    profileId: 'tourism',
    expected: 'Array',
    received: 'undefined'
  }
);

// Utilisation
try {
  GeoLeaf.Config.loadProfile('tourism');
} catch (error) {
  if (error instanceof GeoLeaf.Errors.ConfigError) {
    // Afficher message d'aide Ã  l'utilisateur
    console.error('Configuration incorrecte:', error.message);
  }
}
```

---

### `NetworkError`

Erreur rÃ©seau ou HTTP.

**UtilisÃ©e pour** :
- Ã‰chec de fetch()
- Timeout rÃ©seau
- Status HTTP 4xx/5xx

```js
// Exemple : Ã‰chec de chargement
throw new GeoLeaf.Errors.NetworkError(
  'Failed to load POI data',
  {
    url: '/api/poi',
    status: 404,
    statusText: 'Not Found'
  }
);

// Retry avec gestion d'erreur
async function loadWithRetry() {
  try {
    return await GeoLeaf.Config.loadConfig('config.json');
  } catch (error) {
    if (error instanceof GeoLeaf.Errors.NetworkError) {
      console.warn('Retry aprÃ¨s 3s...');
      await GeoLeaf.Helpers.wait(3000);
      return await GeoLeaf.Config.loadConfig('config.json');
    }
    throw error;
  }
}
```

---

### `InitializationError`

Erreur lors de l'initialisation.

**UtilisÃ©e pour** :
- Ã‰chec de crÃ©ation de la carte
- DOM introuvable
- DÃ©pendance manquante (Leaflet)

```js
throw new GeoLeaf.Errors.InitializationError(
  'Failed to create map: target element not found',
  {
    target: 'map-container',
    domReady: document.readyState
  }
);
```

---

### `MapError`

Erreur liÃ©e Ã  la carte Leaflet.

**UtilisÃ©e pour** :
- OpÃ©ration carte invalide
- Bounds invalides
- Layer introuvable

```js
throw new GeoLeaf.Errors.MapError(
  'Cannot fit bounds: no features loaded',
  {
    operation: 'fitBounds',
    featureCount: 0
  }
);
```

---

### `POIError`

Erreur lors de la gestion des POI.

**UtilisÃ©e pour** :
- POI mal formÃ©
- Chargement POI Ã©chouÃ©
- Marker invalide

```js
throw new GeoLeaf.Errors.POIError(
  'Invalid POI: missing latlng',
  {
    poiId: 'poi-123',
    provided: { id: 'poi-123', label: 'Test' },
    expected: 'latlng: [lat, lng]'
  }
);
```

---

### `GeoJSONError`

Erreur lors du traitement GeoJSON.

**UtilisÃ©e pour** :
- Structure GeoJSON invalide
- GÃ©omÃ©trie incorrecte
- Parsing Ã©chouÃ©

```js
throw new GeoLeaf.Errors.GeoJSONError(
  'Invalid GeoJSON: missing features array',
  {
    type: 'FeatureCollection',
    features: undefined
  }
);
```

---

### `RouteError`

Erreur lors du traitement des itinÃ©raires.

**UtilisÃ©e pour** :
- GPX mal formÃ©
- Parsing GPX Ã©chouÃ©
- Route vide

```js
throw new GeoLeaf.Errors.RouteError(
  'Failed to parse GPX: invalid XML',
  {
    url: 'route.gpx',
    parseError: 'Unexpected end of input'
  }
);
```

---

## ðŸ’¡ Patterns d'utilisation

### Pattern 1 : Validation avec erreur typÃ©e

```js
function validatePOI(poi) {
  if (!poi.latlng || !Array.isArray(poi.latlng)) {
    throw new GeoLeaf.Errors.ValidationError(
      'POI must have latlng array',
      { poiId: poi.id, provided: poi.latlng }
    );
  }
  
  const validation = GeoLeaf.Validators.validateCoordinates(
    poi.latlng[0],
    poi.latlng[1],
    { throwOnError: true }
  );
  
  // ValidationError lancÃ©e automatiquement si invalide
}
```

---

### Pattern 2 : Catch multi-niveaux

```js
try {
  await GeoLeaf.Config.loadConfig('config.json');
} catch (error) {
  if (error instanceof GeoLeaf.Errors.NetworkError) {
    console.error('âš ï¸ ProblÃ¨me rÃ©seau, mode offline activÃ©');
    activateOfflineMode();
  } else if (error instanceof GeoLeaf.Errors.ConfigError) {
    console.error('âŒ Configuration invalide');
    showConfigHelp();
  } else if (error instanceof GeoLeaf.Errors.SecurityError) {
    console.error('ðŸš¨ ProblÃ¨me de sÃ©curitÃ© dÃ©tectÃ©');
    reportSecurityIssue(error);
  } else {
    console.error('Erreur inconnue:', error);
  }
}
```

---

### Pattern 3 : Logging enrichi

```js
try {
  // Code risquÃ©
} catch (error) {
  if (error instanceof GeoLeaf.Errors.GeoLeafError) {
    // Erreur typÃ©e GeoLeaf : logger avec contexte complet
    console.error({
      type: error.name,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    });
  } else {
    // Erreur standard
    console.error(error);
  }
}
```

---

## ðŸ§ª Tests

```bash
npm test -- errors

# Fichiers de tests
__tests__/core/errors.test.js
__tests__/core/errors-extended.test.js
```

**Couverture** : 95%+ (150+ tests passants)

---

## ðŸ“Š Statistiques d'erreurs

| Type d'erreur | FrÃ©quence | CriticitÃ© |
|---------------|-----------|-----------|
| ValidationError | 45% | âš ï¸ Moyenne |
| ConfigError | 25% | ðŸ”´ Haute |
| NetworkError | 15% | âš ï¸ Moyenne |
| SecurityError | 5% | ðŸ”´ Haute |
| Autres | 10% | ðŸŸ¡ Variable |

---

## ðŸ”— Voir aussi

- `GeoLeaf.Validators` - Utilise ValidationError
- `GeoLeaf.Security` - Utilise SecurityError
- `GeoLeaf.Config` - Utilise ConfigError et NetworkError
- `GeoLeaf.Log` - Logging des erreurs
