# GeoLeaf.Core â€“ Documentation du module Core

**Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.core.js`  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026

---

Le module **GeoLeaf.Core** constitue le noyau de la librairie **GeoLeaf**.

Il gÃ¨re :
- lâ€™initialisation de la carte **Leaflet** ;
- la conservation dâ€™une instance unique de carte (`L.Map`) ;
- la gestion et la synchronisation du **thÃ¨me UI** (clair / sombre) avec les autres modules.

Les autres modules (Baselayers, UI, POI, GeoJSON, Route, Legend, Config, etc.) sâ€™appuient **tous** sur la carte crÃ©Ã©e par `GeoLeaf.Core`.

---

## 1. RÃ´le fonctionnel du Core

GeoLeaf.Core a trois responsabilitÃ©s principales :

1. CrÃ©er et initialiser une carte Leaflet dans un conteneur DOM.
2. Exposer lâ€™instance de carte aux autres modules via `GeoLeaf.Core.getMap()`.
3. Centraliser le **thÃ¨me UI courant** (light/dark) et offrir une API simple pour le lire / le modifier.

> Important : GeoLeaf.Core ne gÃ¨re **pas** :
> - les couches de fond (basemaps) ;
> - les POI / GeoJSON / itinÃ©raires ;
> - les contrÃ´les UI avancÃ©s.
>
> Ces responsabilitÃ©s sont confiÃ©es aux autres modules GeoLeaf.

---

## 2. API publique de GeoLeaf.Core

### 2.1 `GeoLeaf.Core.init(options)`

Fonction principale dâ€™initialisation.  
Elle crÃ©e (ou rÃ©utilise) lâ€™instance de carte Leaflet et retourne la carte.

```js
const map = GeoLeaf.Core.init(options);
```

- **ParamÃ¨tres :**
  - `options` : objet de configuration du Core.

- **Retour :**
  - lâ€™instance `L.Map` de Leaflet si lâ€™initialisation rÃ©ussit ;
  - `null` en cas dâ€™erreur bloquante (par exemple `target` introuvable).

#### Exemple minimal

```js
const map = GeoLeaf.Core.init({
  target: "geoleaf-map",
  center: [-32.95, -60.65], // Rosario, AR
  zoom: 12
});
```

#### Exemple complet (avec thÃ¨me)

```js
const map = GeoLeaf.Core.init({
  target: "geoleaf-map",
  center: [-32.95, -60.65],
  zoom: 12,
  theme: "dark"
});
```

---

### 2.2 Options supportÃ©es

Les options importantes pour GeoLeaf.Core sont :

- `target` â€“ **obligatoire**
- `center` â€“ **obligatoire**
- `zoom` â€“ **obligatoire**
- `theme` â€“ **optionnel**

Les sections suivantes dÃ©taillent pour chacune :

- si lâ€™option est **obligatoire** ou **optionnelle** ;
- le **type** attendu ;
- la **valeur par dÃ©faut** Ã©ventuelle ;
- le **comportement** en cas de valeur invalide.

---

## 3. DÃ©tail des options Core

### 3.1 `target` (obligatoire)

- **Type** : `string`
- **Obligatoire** : **oui**
- **Valeur par dÃ©faut** : aucune (doit Ãªtre fournie)
- **Description** : identifiant (`id`) de lâ€™Ã©lÃ©ment DOM dans lequel la carte doit Ãªtre crÃ©Ã©e.

Exemple HTML :

```html
<div id="geoleaf-map"></div>
```

Exemple JS correspondant :

```js
GeoLeaf.Core.init({
  target: "geoleaf-map",
  center: [-32.95, -60.65],
  zoom: 12
});
```

**Validations :**

- `target` doit Ãªtre une chaÃ®ne **non vide**.
- Un Ã©lÃ©ment DOM avec cet `id` doit exister.

En cas de problÃ¨me (`target` manquant, vide ou DOM introuvable) :

1. GeoLeaf.Core logge une erreur dans la console :
   - `[GeoLeaf.Core] target introuvable ou invalide`
2. Aucune carte nâ€™est crÃ©Ã©e.
3. La fonction retourne `null`.

---

### 3.2 `center` (obligatoire)

- **Type** : tableau de deux nombres `[latitude, longitude]`
- **Obligatoire** : **oui**
- **Valeur par dÃ©faut** : aucune (doit Ãªtre fournie)
- **Description** : coordonnÃ©es du centre initial de la carte.

Exemple :

```js
center: [-32.95, -60.65] // Rosario, AR
```

**Validations :**

- `center` doit Ãªtre :
  - un tableau de longueur 2 ;
  - contenant deux valeurs numÃ©riques (`lat`, `lng`).
- Intervalles recommandÃ©s :
  - `lat` âˆˆ [-90 ; +90]
  - `lng` âˆˆ [-180 ; +180]

En cas de valeur invalide (type incorrect, taille diffÃ©rente de 2, valeurs non numÃ©riques, etc.) :

- GeoLeaf.Core logge une erreur :
  - `[GeoLeaf.Core] center invalide`
- Selon lâ€™implÃ©mentation exacte :
  - soit lâ€™initialisation est refusÃ©e et `init()` retourne `null` ;
  - soit un centre par dÃ©faut interne est utilisÃ© (ex. `[0, 0]`).

> Recommandation : toujours fournir un `center` explicite dans la configuration, mÃªme si la carte est recentrÃ©e plus tard.

---

### 3.3 `zoom` (obligatoire)

- **Type** : `number` (entier)
- **Obligatoire** : **oui**
- **Valeur par dÃ©faut** : aucune (doit Ãªtre fournie)
- **Description** : niveau de zoom initial de la carte.

Exemple :

```js
zoom: 12
```

**Intervalles recommandÃ©s :**

- en pratique, la plupart des fonds de carte acceptent un zoom entre `2` et `18` ;
- certaines tuiles montent Ã  `19` ou `20`, en fonction du fournisseur.

**Validations et comportement :**

- Si `zoom` nâ€™est pas fourni, nâ€™est pas numÃ©rique, ou est manifestement hors plage :
  - GeoLeaf.Core logge un **avertissement** :
    - `[GeoLeaf.Core] zoom invalide, utilisation dâ€™une valeur par dÃ©faut`
  - un zoom par dÃ©faut interne (ex. `3`) peut Ãªtre utilisÃ©.

---

### 3.4 `theme` (optionnel)

- **Type** : `"light"` | `"dark"`
- **Obligatoire** : **non**
- **Valeur par dÃ©faut** :
  - `"light"` si aucun thÃ¨me prÃ©cÃ©dent nâ€™est enregistrÃ© ;
  - ou le dernier thÃ¨me connu (par exemple stockÃ© par `GeoLeaf.UI`).

- **Description** : thÃ¨me UI courant pour GeoLeaf.  
  Il sâ€™applique Ã  **lâ€™interface** (header, boutons, panneaux, lÃ©gende, etc.) et **jamais** aux tuiles (fond de carte).

Exemples :

```js
theme: "light"
```

ou

```js
theme: "dark"
```

**Comportement :**

1. Si `theme` vaut `"light"` ou `"dark"` :
   - GeoLeaf.Core enregistre ce thÃ¨me comme thÃ¨me courant ;
   - si `GeoLeaf.UI` est chargÃ©, il met Ã  jour lâ€™UI (classes CSS, variables de thÃ¨me).

2. Si `theme` est **absent** :
   - GeoLeaf.Core laisse lâ€™UI dÃ©cider ;
   - `GeoLeaf.UI` peut, par exemple, relire une valeur depuis `localStorage` (prÃ©fÃ©rence utilisateur) ;
   - sinon, le thÃ¨me `"light"` est utilisÃ© par dÃ©faut.

3. Si `theme` a une valeur **inconnue** (ex. `"blue"`) :
   - GeoLeaf.Core logge un avertissement :
     - `[GeoLeaf.Core] theme inconnu, fallback sur 'light'`
   - le thÃ¨me `"light"` est appliquÃ©.

> Rappel : le choix des tuiles (Street / Topo / Satellite) est gÃ©rÃ© par `GeoLeaf.Baselayers` et **ne dÃ©pend pas** du thÃ¨me UI.

---

## 4. Autres mÃ©thodes exposÃ©es

### 4.1 `GeoLeaf.Core.getMap()`

Retourne lâ€™instance de carte Leaflet dÃ©jÃ  initialisÃ©e, ou `null` si aucune carte nâ€™existe.

```js
const map = GeoLeaf.Core.getMap();

if (map) {
  map.setView([-32.95, -60.65], 12);
}
```

- **Usage recommandÃ© :**
  - dans les autres modules GeoLeaf (POI, GeoJSON, Route, Legend, etc.) ;
  - dans du code externe qui souhaite manipuler la carte sans la rÃ©initialiser.

---

### 4.2 `GeoLeaf.Core.setTheme(theme)`

Permet de changer le thÃ¨me UI aprÃ¨s lâ€™initialisation.

```js
GeoLeaf.Core.setTheme("dark");
```

- **ParamÃ¨tre :**
  - `theme` : `"light"` ou `"dark"`.

**Comportement :**

- Met Ã  jour le thÃ¨me interne du Core ;
- Si `GeoLeaf.UI` est prÃ©sent, il synchronise lâ€™UI (ajout/retrait des classes CSS appropriÃ©es, mise Ã  jour des variables de thÃ¨me, etc.).

En cas de valeur invalide :

- GeoLeaf.Core logge un avertissement ;
- le thÃ¨me courant nâ€™est pas modifiÃ©.

---

### 4.3 `GeoLeaf.Core.getTheme()`

Retourne le thÃ¨me UI connu par le Core.

```js
const currentTheme = GeoLeaf.Core.getTheme(); // "light" ou "dark"
```

- **Usage typique :**
  - synchroniser un composant externe (par exemple un widget personnalisÃ©) avec lâ€™Ã©tat visuel de GeoLeaf.

---

## 5. IntÃ©gration avec la configuration JSON externe

Dans la dÃ©mo officielle, les options de GeoLeaf.Core proviennent gÃ©nÃ©ralement dâ€™un fichier JSON externe chargÃ© via `GeoLeaf.Config`.

### 5.1 Exemple de configuration JSON

```json
{
  "map": {
    "target": "geoleaf-map",
    "center": [-32.95, -60.65],
    "zoom": 12
  },
  "ui": {
    "theme": "light"
  }
}
```

### 5.2 Exemple de branchement dans le code

> **Approche moderne (v3.2+)** : utiliser `GeoLeaf.boot()` puis l'événement `geoleaf:ready` (voir section 9).

```js
// Approche classique (toujours supportée)
GeoLeaf.Config.init({
  url: "../data/geoleaf-poi.json",
  autoEvent: true,
  onLoaded(config) {
    const mapOptions = {
      target: config.map.target,
      center: config.map.center,
      zoom: config.map.zoom,
      theme: config.ui?.theme
    };

    const map = GeoLeaf.Core.init(mapOptions);

    if (!map) {
      console.error("[GeoLeaf.Demo] Impossible d'initialiser la carte GeoLeaf.Core.");
      return;
    }

    // Initialisation des autres modules (Baselayers, POI, Route, Legend, etc.)
    // GeoLeaf.Baselayers.init({ map, ... });
    // GeoLeaf.POI.init({ map, ... });
    // ...
  }
});
```

### 5.3 Correspondance des champs JSON â†’ Core

- `config.map.target` â†’ `options.target` (**obligatoire**)
- `config.map.center` â†’ `options.center` (**obligatoire**)
- `config.map.zoom` â†’ `options.zoom` (**obligatoire**)
- `config.ui.theme` â†’ `options.theme` (**optionnel**)

---

## 6. Gestion des erreurs et comportements de fallback

GeoLeaf.Core privilÃ©gie un comportement **expliqueÌ** (logs explicites) plutÃ´t quâ€™un Ã©chec silencieux.

### 6.1 RÃ©sumÃ© des cas principaux

- **`target` manquant ou DOM introuvable**
  - Log : erreur critique (`[GeoLeaf.Core] target introuvable ou invalide`)
  - Carte : non crÃ©Ã©e
  - Retour : `null`

- **`center` invalide**
  - Log : erreur (`[GeoLeaf.Core] center invalide`)
  - Carte : soit non crÃ©Ã©e, soit centrÃ©e sur une valeur par dÃ©faut interne (selon implÃ©mentation)
  - Retour : `null` ou carte valide mais centrÃ©e par dÃ©faut

- **`zoom` invalide**
  - Log : avertissement (`[GeoLeaf.Core] zoom invalide, utilisation d'une valeur par dÃ©faut`)
  - Carte : crÃ©Ã©e, mais avec un zoom par dÃ©faut interne

- **`theme` inconnu**
  - Log : avertissement (`[GeoLeaf.Core] theme inconnu, fallback sur 'light'`)
  - ThÃ¨me : `"light"` ou dernier thÃ¨me valide appliquÃ©

### 6.2 Bonne pratique

AprÃ¨s appel Ã  `GeoLeaf.Core.init()` :

```js
const map = GeoLeaf.Core.init(options);

if (!map) {
  console.error("[GeoLeaf.App] Carte non initialisÃ©e, vÃ©rifie la configuration Core.");
  // Ã‰ventuellement afficher un message d'erreur dans l'UI.
}
```

---

## 7. Bonnes pratiques dâ€™utilisation

1. **Toujours fournir les options obligatoires** :
   - `target`
   - `center`
   - `zoom`

2. **Laisser `theme` optionnel** si lâ€™utilisateur peut le gÃ©rer via lâ€™UI :
   - par exemple via un bouton toggle light/dark ;
   - `GeoLeaf.UI` se chargera dâ€™enregistrer le thÃ¨me et de le relire.

3. **Ne pas crÃ©er la carte directement avec Leaflet** :
   - toujours passer par `GeoLeaf.Core.init()` ;
   - toujours rÃ©cupÃ©rer la carte avec `GeoLeaf.Core.getMap()`.

4. **Centraliser la configuration** :
   - idÃ©alement, toutes les options Core viennent dâ€™un seul fichier de configuration (JSON ou JS) ;
   - cela Ã©vite les divergences entre modules et dÃ©mos.

5. **Surveiller les logs console `[GeoLeaf.Core]` en dÃ©veloppement** :
   - ils indiquent prÃ©cisÃ©ment quelle option est manquante ou invalide ;
   - ils aident Ã  diagnostiquer pourquoi la carte nâ€™est pas initialisÃ©e.

---

## 8. RÃ©sumÃ© rapide des options Core

| Option  | Type                | Obligatoire | Valeur par dÃ©faut | RÃ´le principal                                 |
|--------|---------------------|-------------|-------------------|-----------------------------------------------|
| target | `string`            | oui         | aucune            | ID du conteneur DOM de la carte              |
| center | `[number, number]`  | oui         | aucune            | Centre initial de la carte (lat, lng)        |
| zoom   | `number`            | oui         | aucune            | Zoom initial de la carte                     |
| theme  | `"light" \| "dark"` | non         | `"light"` ou dernier thÃ¨me connu | ThÃ¨me UI (light/dark), uniquement pour lâ€™interface |

Ce tableau rÃ©sume ce qui est **obligatoire**, **optionnel** et la fonction de chaque option dans GeoLeaf.Core.
---

## 9. Boot System (`src/app/`)

Depuis la v3.2.0, l'initialisation de GeoLeaf est orchestrée par le **boot system** situé dans `src/app/`. Ce système gère le chargement séquentiel : core → plugins → démarrage.

### 9.1 Fichiers du boot system

| Fichier | Rôle |
|---------|------|
| `src/app/helpers.js` | Fonctions utilitaires partagées (DOM, events, validation) |
| `src/app/init.js` | Initialisation des modules core + détection de l'environnement |
| `src/app/boot.js` | Point d'entrée principal — orchestre le chargement et émet `geoleaf:ready` |

### 9.2 Flux de démarrage

```
1. <script src="geoleaf.umd.js">     → Charge le bundle core (Rollup)
2. <script src="geoleaf-*.plugin.js"> → Enrichit GeoLeaf.* (Storage, AddPOI…)
3. GeoLeaf.boot()                     → Vérifie cohérence, initialise, émet geoleaf:ready
```

### 9.3 `GeoLeaf.boot()`

Point d'entrée recommandé pour démarrer GeoLeaf :

```js
// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', () => {
  GeoLeaf.boot();
});

// Écouter l'événement de fin d'initialisation
document.addEventListener('geoleaf:ready', () => {
  console.log('GeoLeaf prêt, tous les modules chargés');
  // Charger la configuration et initialiser la carte
  GeoLeaf.loadConfig({ url: 'geoleaf.config.json' });
});
```

### 9.4 Guard system (`checkPlugins`)

Le boot system vérifie la cohérence des plugins chargés via un guard system :

- Vérifie que les namespaces requis existent avant l'initialisation
- Logue un avertissement si un plugin attendu est absent
- Permet une dégradation gracieuse (l'app fonctionne sans plugins)

### 9.5 Plugins disponibles

| Plugin | Fichier | Namespace enrichi |
|--------|---------|-------------------|
| Storage | `geoleaf-storage.plugin.js` | `GeoLeaf.Storage`, `GeoLeaf._StorageDB`, `GeoLeaf._CacheManager`, etc. |
| AddPOI | `geoleaf-addpoi.plugin.js` | `GeoLeaf.AddPOI`, `GeoLeaf._POIForm`, etc. |

Voir [Architecture Plugin](../plugins/GeoLeaf_Plugins_README.md) pour la documentation complète.

---

## 10. Voir aussi

- **Architecture Plugin** : [docs/plugins/GeoLeaf_Plugins_README.md](../plugins/GeoLeaf_Plugins_README.md)
- **Init Flow** : [docs/architecture/INITIALIZATION_FLOW.md](../architecture/INITIALIZATION_FLOW.md)
- **Architecture** : [docs/ARCHITECTURE_GUIDE.md](../ARCHITECTURE_GUIDE.md)
- **Guide développeur** : [docs/DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)
