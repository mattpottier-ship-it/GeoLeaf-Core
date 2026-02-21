# GeoLeaf.Log â€“ Documentation du module Logging

Product Version: GeoLeaf Platform V1 **Version**: 4.0.0  
**Fichier**: `src/modules/geoleaf.log.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---

Le module **GeoLeaf.Log** fournit le systÃ¨me de journalisation centralisÃ© utilisÃ© par tous les modules GeoLeaf.  
Il assure une gestion cohÃ©rente, filtrÃ©e et configurable des messages de log :

- debug
- info
- warn
- error

Il permet Ã©galement de contrÃ´ler la verbositÃ© via la configuration JSON externe (`logging.level`).

---

## 1. RÃ´le fonctionnel de GeoLeaf.Log

1. Centraliser tous les logs de la librairie GeoLeaf.
2. Normaliser lâ€™affichage des messages avec un prÃ©fixe par module.
3. Permettre le filtrage des logs selon un **niveau de verbositÃ©** :  
   `"debug"`, `"info"`, `"warn"`, `"error"`.
4. Offrir un point dâ€™entrÃ©e unique pour tracer le fonctionnement interne de :
    - Core
    - Baselayers
    - UI
    - POI
    - GeoJSON
    - Route
    - Config
    - API
    - Legend
5. Sâ€™intÃ©grer parfaitement avec la configuration JSON externe pour activer/dÃ©sactiver automatiquement les niveaux de logs.

---

## 2. API publique du module Logging

Le module expose quatre niveaux de log + une mÃ©thode pour dÃ©finir le niveau global :

- `GeoLeaf.Log.debug(...args)`
- `GeoLeaf.Log.info(...args)`
- `GeoLeaf.Log.warn(...args)`
- `GeoLeaf.Log.error(...args)`
- `GeoLeaf.Log.setLevel(level)`
- `GeoLeaf.Log.getLevel()`

---

## 3. `GeoLeaf.Log.debug(...args)`

Affiche un message dÃ©taillÃ© pour le dÃ©veloppement.

```js
GeoLeaf.Log.debug("[GeoLeaf.POI] Chargement des POIâ€¦");
```

### Usage

- suivi des valeurs intermÃ©diaires
- contrÃ´le des flux internes
- debug poussÃ©

### Filtrage

AffichÃ© uniquement si `logging.level = "debug"`.

---

## 4. `GeoLeaf.Log.info(...args)`

Message dâ€™information standard.

```js
GeoLeaf.Log.info("[GeoLeaf.Core] Carte initialisÃ©e.");
```

### Usage

- initialisation rÃ©ussie
- chargement dâ€™une configuration
- changements non critiques

### Filtrage

AffichÃ© si :

- `"debug"`
- `"info"`

---

## 5. `GeoLeaf.Log.warn(...args)`

Message dâ€™avertissement non bloquant.

```js
GeoLeaf.Log.warn("[GeoLeaf.Config] ClÃ© 'basemap.id' manquante, fallback sur 'street'.");
```

### Usage

- configuration partielle
- donnÃ©es manquantes mais non critiques
- fallback automatique

### Filtrage

AffichÃ© si :

- `"debug"`
- `"info"`
- `"warn"`

---

## 6. `GeoLeaf.Log.error(...args)`

Message dâ€™erreur critique.

```js
GeoLeaf.Log.error("[GeoLeaf.Route] Impossible de charger le fichier GPX.");
```

### Usage

- erreurs bloquantes
- modules non initialisÃ©s
- problÃ¨mes graves

### Filtrage

Toujours affichÃ©, mÃªme si `logging.level = "error"`.

---

## 7. `GeoLeaf.Log.setLevel(level)`

Modifie dynamiquement le niveau global de logs.

```js
GeoLeaf.Log.setLevel("debug");
```

### Valeurs possibles

- `"debug"`
- `"info"`
- `"warn"`
- `"error"`

Cette fonction est appelÃ©e automatiquement par `GeoLeaf.Config` si le fichier JSON contient :

```json
{
    "logging": { "level": "debug" }
}
```

---

## 8. `GeoLeaf.Log.getLevel()`

Retourne le niveau actuellement actif.

```js
const level = GeoLeaf.Log.getLevel(); // "debug"
```

---

## 9. IntÃ©gration avec la configuration JSON

### Exemple :

```json
{
    "map": {
        "target": "geoleaf-map",
        "center": [-32.95, -60.65],
        "zoom": 12
    },
    "logging": {
        "level": "warn"
    }
}
```

### Fonctionnement

1. `GeoLeaf.Config.load()` charge le JSON.
2. Le module dÃ©tecte la clÃ© `logging.level`.
3. `GeoLeaf.Log.setLevel("warn")` est appelÃ© automatiquement.
4. Tous les logs ci-dessous le niveau sont filtrÃ©s.

---

## 10. SÃ©quence typique dâ€™utilisation

### A. Directement depuis le code

```js
GeoLeaf.Log.setLevel("debug");

GeoLeaf.Log.debug("DÃ©tails internesâ€¦");
GeoLeaf.Log.info("Initialisation OK.");
GeoLeaf.Log.warn("DonnÃ©e manquante, fallback.");
GeoLeaf.Log.error("Erreur critique.");
```

### B. Via configuration JSON

```js
GeoLeaf.loadConfig("./data/config.json", {
    autoInit: true,
});
```

Dans ce cas :

- aucun `GeoLeaf.Log.setLevel()` nâ€™a besoin dâ€™Ãªtre Ã©crit dans le code extÃ©rieur.

---

## 11. RÃ©sumÃ© rapide de lâ€™API Logging

| MÃ©thode         | RÃ´le                                   |
| ----------------- | --------------------------------------- |
| `debug()`         | Messages dÃ©taillÃ©s (dev uniquement) |
| `info()`          | Messages standards                      |
| `warn()`          | Avertissements                          |
| `error()`         | Erreurs critiques                       |
| `setLevel(level)` | Change le niveau actif                  |
| `getLevel()`      | Retourne le niveau actif                |

---

## 12. Bonnes pratiques

### En dÃ©veloppement

- Toujours utiliser `"debug"` pour tout voir.
- Ajouter des logs dÃ©taillÃ©s dans les zones en cours de dÃ©bogage.

### En staging

- Passer Ã  `"info"` ou `"warn"`.

### En production

- Utiliser `"warn"` ou `"error"` uniquement.
- Garder les logs applicatifs cÃ´tÃ© serveur si nÃ©cessaire.

### Style de logs recommandÃ©

Toujours prÃ©fixer les logs avec le module appelant :

```
[GeoLeaf.Core]
[GeoLeaf.Config]
[GeoLeaf.POI]
[GeoLeaf.GeoJSON]
â€¦
```

Cela rend le debug **immÃ©diat et structurÃ©**.
