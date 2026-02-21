# GeoLeaf.Validators â€“ Documentation du module Validators

Product Version: GeoLeaf Platform V1 **Version**: 4.0.0  
**Fichier**: `src/modules/geoleaf.validators.js` (441 lignes)  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026  
**DerniÃ¨re vÃ©rification**: 19 janvier 2026

---

## ðŸ“Œ Vue d'ensemble

Le module **GeoLeaf.Validators** fournit des fonctions de validation centralisÃ©es et rÃ©utilisables pour tous les modules GeoLeaf. Il utilise les erreurs typÃ©es de `GeoLeaf.Errors` pour une gestion cohÃ©rente des erreurs.

### ResponsabilitÃ©s principales

- âœ… **Validation de coordonnÃ©es** - Latitude/longitude
- âœ… **Validation d'URLs** - Protocoles, formats
- âœ… **Validation d'emails** - Format RFC 5322
- âœ… **Validation de couleurs** - Hex, RGB, HSL, nommÃ©es
- âœ… **Validation GeoJSON** - Structure et gÃ©omÃ©tries
- âœ… **Validation de types** - Checks gÃ©nÃ©riques

---

## ðŸ” API de validation

### `validateCoordinates(lat, lng, options?)`

Valide des coordonnÃ©es gÃ©ographiques.

**Signature** :

```js
GeoLeaf.Validators.validateCoordinates(
  lat: number,
  lng: number,
  options?: { throwOnError?: boolean }
): { valid: boolean, error: string|null }
```

**Exemples** :

```js
// CoordonnÃ©es valides
const result = GeoLeaf.Validators.validateCoordinates(45.5017, -73.5673);
// Returns: { valid: true, error: null }

// Latitude invalide (> 90)
const result2 = GeoLeaf.Validators.validateCoordinates(95, -73);
// Returns: { valid: false, error: 'Latitude must be between -90 and 90' }

// Mode strict (lance exception)
try {
    GeoLeaf.Validators.validateCoordinates(95, -73, { throwOnError: true });
} catch (error) {
    console.error("CoordonnÃ©es invalides:", error.message);
}
```

**Validations effectuÃ©es** :

- âœ… Type number (pas string ou autre)
- âœ… Valeurs finies (pas NaN, Infinity)
- âœ… Latitude entre -90 et +90
- âœ… Longitude entre -180 et +180

---

### `validateUrl(url, options?)`

Valide une URL avec options de protocole.

**Signature** :

```js
GeoLeaf.Validators.validateUrl(
  url: string,
  options?: {
    allowedProtocols?: string[],
    allowDataImages?: boolean,
    throwOnError?: boolean
  }
): { valid: boolean, error: string|null, url: string|null }
```

**Exemples** :

```js
// URL HTTPS valide
const result = GeoLeaf.Validators.validateUrl("https://example.com/data.json");
// Returns: { valid: true, error: null, url: 'https://example.com/data.json' }

// Protocole non autorisÃ©
const result2 = GeoLeaf.Validators.validateUrl("ftp://example.com/file");
// Returns: { valid: false, error: 'Protocol not allowed', url: null }

// Autoriser seulement HTTPS
const result3 = GeoLeaf.Validators.validateUrl("http://example.com", {
    allowedProtocols: ["https:"],
});
// Returns: { valid: false, error: 'Protocol not allowed', url: null }
```

**Options par dÃ©faut** :

- `allowedProtocols`: `['http:', 'https:', 'data:']`
- `allowDataImages`: `true`
- `throwOnError`: `false`

---

### `validateEmail(email, options?)`

Valide un format d'email.

**Signature** :

```js
GeoLeaf.Validators.validateEmail(
  email: string,
  options?: { throwOnError?: boolean }
): { valid: boolean, error: string|null }
```

**Exemples** :

```js
// Email valide
GeoLeaf.Validators.validateEmail("user@example.com");
// Returns: { valid: true, error: null }

// Email invalide
GeoLeaf.Validators.validateEmail("not-an-email");
// Returns: { valid: false, error: 'Invalid email format' }

// Formats supportÃ©s
GeoLeaf.Validators.validateEmail("user+tag@sub.example.com"); // âœ…
GeoLeaf.Validators.validateEmail("user@localhost"); // âœ…
GeoLeaf.Validators.validateEmail("user@domain.co.uk"); // âœ…
```

---

### `validateColor(color, options?)`

Valide un format de couleur CSS.

**Signature** :

```js
GeoLeaf.Validators.validateColor(
  color: string,
  options?: { throwOnError?: boolean }
): { valid: boolean, error: string|null }
```

**Formats supportÃ©s** :

- Hex court : `#fff`, `#000`
- Hex long : `#ffffff`, `#000000`
- RGB : `rgb(255, 0, 0)`
- RGBA : `rgba(255, 0, 0, 0.5)`
- HSL : `hsl(120, 100%, 50%)`
- HSLA : `hsla(120, 100%, 50%, 0.5)`
- NommÃ©es : `red`, `blue`, `green`, etc.

**Exemples** :

```js
// Couleurs valides
GeoLeaf.Validators.validateColor("#ff0000"); // âœ… Hex
GeoLeaf.Validators.validateColor("rgb(255, 0, 0)"); // âœ… RGB
GeoLeaf.Validators.validateColor("red"); // âœ… NommÃ©e
GeoLeaf.Validators.validateColor("hsl(120, 100%, 50%)"); // âœ… HSL

// Couleurs invalides
GeoLeaf.Validators.validateColor("#gggggg"); // âŒ
GeoLeaf.Validators.validateColor("rgb(300, 0, 0)"); // âŒ (> 255)
```

---

### `validateGeoJSON(geojson, options?)`

Valide la structure d'un objet GeoJSON.

**Signature** :

```js
GeoLeaf.Validators.validateGeoJSON(
  geojson: object,
  options?: {
    requireFeatures?: boolean,
    throwOnError?: boolean
  }
): { valid: boolean, error: string|null }
```

**Exemples** :

```js
// FeatureCollection valide
const geojson = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-73.5673, 45.5017] },
            properties: { name: "Montreal" },
        },
    ],
};

GeoLeaf.Validators.validateGeoJSON(geojson);
// Returns: { valid: true, error: null }

// GeoJSON invalide
const invalid = {
    type: "FeatureCollection",
    // Manque 'features'
};

GeoLeaf.Validators.validateGeoJSON(invalid, { requireFeatures: true });
// Returns: { valid: false, error: 'FeatureCollection must have features array' }
```

**Validations effectuÃ©es** :

- âœ… Type valide (FeatureCollection, Feature, Geometry)
- âœ… Structure conforme Ã  la spec GeoJSON
- âœ… GÃ©omÃ©tries valides (Point, LineString, Polygon, etc.)
- âœ… CoordonnÃ©es prÃ©sentes et correctes

---

## ðŸ”§ Validateurs utilitaires

### `isString(value)`

```js
GeoLeaf.Validators.isString("hello"); // true
GeoLeaf.Validators.isString(123); // false
```

### `isNumber(value)`

```js
GeoLeaf.Validators.isNumber(42); // true
GeoLeaf.Validators.isNumber("42"); // false
```

### `isObject(value)`

```js
GeoLeaf.Validators.isObject({ key: "value" }); // true
GeoLeaf.Validators.isObject([1, 2, 3]); // false (array)
```

### `isArray(value)`

```js
GeoLeaf.Validators.isArray([1, 2, 3]); // true
GeoLeaf.Validators.isArray({ 0: 1, 1: 2 }); // false
```

### `isEmpty(value)`

```js
GeoLeaf.Validators.isEmpty(""); // true
GeoLeaf.Validators.isEmpty([]); // true
GeoLeaf.Validators.isEmpty({}); // true
GeoLeaf.Validators.isEmpty(null); // true
GeoLeaf.Validators.isEmpty(undefined); // true
```

---

## ðŸŽ¯ IntÃ©gration dans GeoLeaf

### OÃ¹ les validateurs sont utilisÃ©s

| Module         | Validations appliquÃ©es                   |
| -------------- | ------------------------------------------ |
| **Core**       | `validateCoordinates()` pour center        |
| **POI**        | `validateCoordinates()`, `validateColor()` |
| **GeoJSON**    | `validateGeoJSON()`, `validateUrl()`       |
| **Route**      | `validateCoordinates()`, `validateUrl()`   |
| **Config**     | `validateUrl()`, type validations          |
| **BaseLayers** | `validateUrl()` pour tiles                 |

### Exemple d'utilisation interne

```js
// Dans GeoLeaf.Core.init()
function init(options) {
    const validation = GeoLeaf.Validators.validateCoordinates(
        options.center[0],
        options.center[1],
        { throwOnError: true }
    );

    if (!validation.valid) {
        throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    // Continue initialization...
}
```

---

## ðŸ§ª Tests

Le module Validators est couvert par des tests Jest complets :

```bash
# Lancer les tests Validators
npm test -- validators

# Fichiers de tests
__tests__/validators/validators.test.js
```

**Couverture** : 90%+ (120+ tests passants)

---

## ðŸ”— Voir aussi

- `GeoLeaf.Errors` - Erreurs typÃ©es utilisÃ©es par Validators
- `GeoLeaf.Security` - Validation de sÃ©curitÃ© (XSS, etc.)
- `GeoLeaf.Core` - Utilisation dans initialisation
