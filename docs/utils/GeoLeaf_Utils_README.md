# 🛠️ GeoLeaf.Utils - Utilitaires Généraux

Product Version: GeoLeaf Platform V1

**Module** : `GeoLeaf.Utils`  
**Version** : 4.0.0  
**Fichiers source** : `src/modules/utils/*.js` (12 modules)  
**Dernière mise à jour** : 14 février 2026

---

## 📋 Vue d'ensemble

Le namespace `GeoLeaf.Utils` regroupe **13 modules utilitaires** offrant des fonctions helpers pour :

- **Manipulation DOM** (création d'éléments, sécurité)
- **Formatage de données** (dates, distances, nombres)
- **Gestion d'événements** (CustomEvent, listeners)
- **Performance** (profiling, monitoring, lazy loading)
- **Requêtes HTTP** (fetch unifié avec retry/timeout)
- **Helpers Leaflet** (gestion d'instances map)

Ces utilitaires standardisent les opérations communes et évitent la duplication de code à travers les 14+ modules GeoLeaf.

---

## 🗂️ Structure des modules

```
utils/
├── dom-helpers.js              // Création/manipulation DOM déclarative
├── dom-security.js             // Sanitization et sécurité DOM
├── event-helpers.js            // Dispatch d'événements personnalisés
├── event-listener-manager.js   // Gestion du cycle de vie des listeners
├── formatters.js               // Formatage dates, nombres, distances
├── map-helpers.js              // Helpers pour instances Leaflet
├── fetch-helper.js             // Client HTTP unifié (retry/timeout)
├── lazy-loader.js              // Lazy loading modules/images
├── performance-profiler.js     // Monitoring performance avancé
├── timer-manager.js            // Gestion des timers (setTimeout/setInterval)
├── object-utils.js             // Manipulation d'objets (deepClone, merge)
└── error-logger.js             // Logging d'erreurs structuré
```

---

## 🎯 Modules principaux

### 1. **DomHelpers** - Création DOM déclarative

**Fichier** : `dom-helpers.js`  
**Namespace** : `GeoLeaf.Utils.DomHelpers`

#### API Principale

##### `createElement(tag, props, ...children)`

Crée un élément DOM de manière déclarative avec auto-gestion des event listeners.

**Paramètres** :

- `tag` (string) : Nom du tag HTML (`'div'`, `'button'`, etc.)
- `props` (Object) : Propriétés de l'élément
    - `className` : Classes CSS
    - `id` : ID de l'élément
    - `style` : Styles inline (objet)
    - `dataset` : Data attributes (objet)
    - `attributes` : Attributs HTML (objet)
    - `onClick`, `onChange`, etc. : Event handlers
    - `_eventContext` : Context pour EventListenerManager
    - `_cleanupArray` : Array pour fonctions de cleanup
- `...children` : Enfants (Node, string, number)

**Retourne** : `HTMLElement`

**Exemples** :

```javascript
// Simple div avec classe
const card = GeoLeaf.Utils.DomHelpers.createElement("div", {
    className: "card",
});

// Bouton avec event handler (auto-cleanup)
const button = GeoLeaf.Utils.DomHelpers.createElement(
    "button",
    {
        className: "btn btn-primary",
        onClick: (e) => console.log("Clicked!"),
        dataset: { action: "submit" },
        _eventContext: "MyModule.button",
    },
    "Click me"
);

// Structure complexe avec enfants
const panel = GeoLeaf.Utils.DomHelpers.createElement(
    "div",
    { className: "panel" },
    GeoLeaf.Utils.DomHelpers.createElement("h2", {}, "Title"),
    GeoLeaf.Utils.DomHelpers.createElement("p", {}, "Content"),
    GeoLeaf.Utils.DomHelpers.createElement("button", { onClick: handleClick }, "Action")
);
```

##### `appendTo(parent, ...children)`

Ajoute des enfants à un élément parent.

```javascript
GeoLeaf.Utils.DomHelpers.appendTo(
    document.getElementById("container"),
    createElement("div", {}, "Child 1"),
    createElement("div", {}, "Child 2")
);
```

##### `removeAllChildren(element)`

Supprime tous les enfants d'un élément (optimisé).

```javascript
const container = document.getElementById("list");
GeoLeaf.Utils.DomHelpers.removeAllChildren(container);
```

##### `toggleClass(element, className, force)`

Toggle une classe CSS (avec état forcé optionnel).

```javascript
// Toggle automatique
GeoLeaf.Utils.DomHelpers.toggleClass(element, "active");

// Force l'ajout
GeoLeaf.Utils.DomHelpers.toggleClass(element, "visible", true);
```

---

### 2. **Formatters** - Formatage de données

**Fichier** : `formatters.js`  
**Namespace** : `GeoLeaf.Utils.Formatters`

#### API Principale

##### `formatDistance(distanceInMeters, options)`

Formate une distance en unités lisibles (mètres/km ou feet/miles).

**Paramètres** :

- `distanceInMeters` (number) : Distance en mètres
- `options` (Object) :
    - `unit` : `'metric'` ou `'imperial'` (défaut: `'metric'`)
    - `precision` : Nombre de décimales (défaut: `2`)
    - `showUnit` : Afficher l'unité (défaut: `true`)
    - `locale` : Locale pour formatage (défaut: `'fr-FR'`)

**Exemples** :

```javascript
formatDistance(1500); // "1.50 km"
formatDistance(850); // "850 m"
formatDistance(1500, { unit: "imperial" }); // "0.93 mi"
formatDistance(1500, { precision: 1 }); // "1.5 km"
formatDistance(500, { showUnit: false }); // "500"
```

##### `formatDate(date, options)`

Formate une date selon locale et format spécifié.

```javascript
formatDate(new Date());
// "19 janvier 2026"

formatDate("2026-01-19", {
    format: "short",
});
// "19/01/2026"

formatDate(Date.now(), {
    format: "full",
});
// "dimanche 19 janvier 2026"
```

##### `formatDateTime(date, options)`

Formate date + heure.

```javascript
formatDateTime(new Date());
// "19 janvier 2026, 14:30"
```

##### `formatNumber(value, options)`

Formate un nombre avec séparateurs de milliers.

```javascript
formatNumber(1234567); // "1 234 567"
formatNumber(1234.567, {
    precision: 2,
}); // "1 234.57"
formatNumber(0.5, {
    style: "percent",
}); // "50 %"
```

##### `formatDuration(milliseconds)`

Formate une durée en texte lisible.

```javascript
formatDuration(3661000); // "1h 1m 1s"
formatDuration(125000); // "2m 5s"
formatDuration(1500); // "1.5s"
```

---

### 3. **EventHelpers** - Gestion d'événements

**Fichier** : `event-helpers.js`  
**Namespace** : `GeoLeaf.Utils.EventHelpers`

#### API Principale

##### `dispatchCustomEvent(eventName, detail, options)`

Dispatch un CustomEvent avec compatibilité cross-browser.

**Paramètres** :

- `eventName` (string) : Nom de l'événement (ex: `'geoleaf:poi:loaded'`)
- `detail` (Object) : Payload de l'événement
- `options` (Object) :
    - `bubbles` : L'événement remonte dans le DOM (défaut: `true`)
    - `cancelable` : L'événement peut être annulé (défaut: `true`)
    - `target` : Cible de l'événement (défaut: `document`)

**Exemples** :

```javascript
// Dispatch simple
GeoLeaf.Utils.EventHelpers.dispatchCustomEvent("geoleaf:data:loaded", {
    count: 42,
    source: "api",
});

// Avec options personnalisées
GeoLeaf.Utils.EventHelpers.dispatchCustomEvent(
    "geoleaf:ui:changed",
    { theme: "dark" },
    { bubbles: false, target: window }
);

// Avec vérification du succès
const success = GeoLeaf.Utils.EventHelpers.dispatchCustomEvent("my:custom:event", {
    data: "value",
});
if (!success) {
    console.warn("Event dispatch failed");
}
```

##### Écoute d'événements

```javascript
// Écouter un événement GeoLeaf
document.addEventListener("geoleaf:poi:loaded", (event) => {
    console.log("POIs loaded:", event.detail.count);
});
```

---

### 4. **EventListenerManager** - Gestion du cycle de vie

**Fichier** : `event-listener-manager.js`  
**Namespace** : `GeoLeaf.Utils.EventListenerManager`

#### API Principale

##### `add(target, eventType, handler, options, context)`

Ajoute un event listener avec tracking automatique pour cleanup.

**Paramètres** :

- `target` : Élément cible
- `eventType` : Type d'événement (`'click'`, `'change'`, etc.)
- `handler` : Fonction callback
- `options` : Options addEventListener (capture, passive, once)
- `context` : Contexte string pour grouper les listeners (ex: `'POI.markers'`)

**Retourne** : Fonction de cleanup

**Exemples** :

```javascript
// Ajout avec cleanup automatique
const cleanup = GeoLeaf.Utils.EventListenerManager.add(
    button,
    "click",
    handleClick,
    null,
    "MyModule.button"
);

// Plus tard : retirer le listener
cleanup();

// Grouper plusieurs listeners
const context = "POI.layer";
GeoLeaf.Utils.EventListenerManager.add(marker, "click", onClick, null, context);
GeoLeaf.Utils.EventListenerManager.add(marker, "mouseover", onHover, null, context);

// Retirer tous les listeners d'un contexte
GeoLeaf.Utils.EventListenerManager.removeByContext("POI.layer");
```

##### `removeByContext(context)`

Retire tous les listeners d'un contexte donné.

```javascript
// Cleanup d'un module entier
GeoLeaf.Utils.EventListenerManager.removeByContext("Route.gpx");
```

##### `removeAll()`

Retire TOUS les listeners trackés (utile pour cleanup global).

```javascript
// Avant déchargement de la carte
GeoLeaf.Utils.EventListenerManager.removeAll();
```

---

### 5. **MapHelpers** - Helpers Leaflet

**Fichier** : `map-helpers.js`  
**Namespace** : `GeoLeaf.Utils.MapHelpers`

#### API Principale

##### `ensureMap(explicitMap)`

Récupère l'instance Leaflet map depuis plusieurs sources.

**Ordre de résolution** :

1. Paramètre `explicitMap` si fourni et valide
2. `GeoLeaf.Core.getMap()` si Core est chargé
3. `null` si aucune map trouvée

**Exemples** :

```javascript
// Auto-résolution depuis GeoLeaf.Core
const map = GeoLeaf.Utils.MapHelpers.ensureMap();
if (map) {
    map.setView([48.8566, 2.3522], 13);
}

// Avec map explicite
function myFunction(options = {}) {
    const map = GeoLeaf.Utils.MapHelpers.ensureMap(options.map);
    if (!map) {
        console.warn("No map instance available");
        return;
    }
    // Utiliser la map...
}
```

##### `ensureMapStrict(explicitMap, contextInfo)`

Version stricte qui throw une erreur si aucune map n'est trouvée.

```javascript
// Pour fonctionnalités critiques nécessitant une map
function init(options = {}) {
    const map = GeoLeaf.Utils.MapHelpers.ensureMapStrict(options.map, "MyModule.init");
    // map est garanti non-null ici
    map.addLayer(myLayer);
}
```

---

### 6. **FetchHelper** - Client HTTP unifié

**Fichier** : `fetch-helper.js`  
**Namespace** : `GeoLeaf.Utils.FetchHelper`

#### API Principale

##### `fetch(url, options)`

Execute une requête HTTP avec retry, timeout et parsing automatique.

**Options étendues** :

- `timeout` : Timeout en ms (défaut: `10000`)
- `retries` : Nombre de tentatives (défaut: `2`)
- `retryDelay` : Délai entre tentatives en ms (défaut: `1000`)
- `retryDelayMultiplier` : Multiplicateur pour backoff exponentiel (défaut: `1.5`)
- `parseResponse` : Auto-parse JSON/text (défaut: `true`)
- `throwOnError` : Throw sur HTTP 4xx/5xx (défaut: `true`)
- `validateUrl` : Valider avec GeoLeaf.Security (défaut: `true`)
- `onRetry` : Callback lors d'une retry
- `onTimeout` : Callback lors d'un timeout

**Exemples** :

```javascript
// Simple GET avec auto-parse JSON
const data = await GeoLeaf.Utils.FetchHelper.fetch("/api/data.json");

// POST avec retry personnalisé
const result = await GeoLeaf.Utils.FetchHelper.fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "value" }),
    timeout: 5000,
    retries: 3,
    onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}:`, error.message);
    },
});

// HEAD request pour vérifier l'existence
const response = await GeoLeaf.Utils.FetchHelper.fetch("/resource.json", {
    method: "HEAD",
    parseResponse: false,
    throwOnError: false,
});
console.log("Resource exists:", response.ok);

// Gestion d'erreur
try {
    const data = await GeoLeaf.Utils.FetchHelper.fetch("/api/data");
} catch (error) {
    console.error("Fetch failed:", error.message);
    console.error("Attempts:", error.attempts);
    console.error("Last error:", error.lastError);
}
```

---

### 7. **PerformanceProfiler** - Monitoring avancé

**Fichier** : `performance-profiler.js`  
**Namespace** : `GeoLeaf.Utils.PerformanceProfiler`

#### Fonctionnalités

- **Monitoring temps réel** : FPS, mémoire, temps de rendu
- **Détection de fuites mémoire** : Analyse croissance mémoire
- **Intégration Chrome DevTools** : Performance marks/measures
- **Baseline** : Établissement de performances de référence
- **Détection de régression** : Alertes si performances dégradées

#### API Principale

##### `new PerformanceProfiler(config)`

Instancie le profiler avec configuration.

```javascript
const profiler = new GeoLeaf.Utils.PerformanceProfiler({
    monitoring: {
        enabled: true,
        interval: 1000,
    },
    memory: {
        enabled: true,
        threshold: 50 * 1024 * 1024, // 50MB
    },
});
```

##### `mark(name, metadata)`

Crée un performance mark.

```javascript
profiler.mark("poi-load-start");
// ... opération ...
profiler.mark("poi-load-end");
```

##### `measure(name, startMark, endMark)`

Mesure le temps entre deux marks.

```javascript
profiler.measure("poi-load-duration", "poi-load-start", "poi-load-end");
```

##### `getReport()`

Génère un rapport de performance complet.

```javascript
const report = profiler.getReport();
console.table(report.marks);
console.table(report.measures);
console.log("Memory peak:", report.memory.peak);
```

---

### 8. **LazyLoader** - Chargement différé

**Fichier** : `lazy-loader.js`  
**Namespace** : `GeoLeaf.Utils.LazyLoader`

#### Fonctionnalités

- **Module lazy loading** : Chargement de modules à la demande
- **Image lazy loading** : IntersectionObserver pour images
- **Code splitting** : Dynamic imports
- **Cache** : Évite rechargements multiples
- **Fallbacks** : Gestion d'erreurs gracieuse

#### API Principale

##### `loadModule(moduleName, modulePath, options)`

Charge un module dynamiquement.

```javascript
const loader = new GeoLeaf.Utils.LazyLoader();

// Charger un module à la demande
const RouteModule = await loader.loadModule("Route", "/assets/js/geoleaf-route.js", {
    timeout: 10000,
});

// Module est maintenant en cache
const RouteModule2 = await loader.loadModule("Route"); // Instantané
```

##### `observeImages(container)`

Active le lazy loading pour images dans un conteneur.

```javascript
// HTML: <img data-src="image.jpg" class="lazy" alt="...">

loader.observeImages(document.querySelector(".gallery"));
// Les images se chargeront au scroll
```

---

### 9. **TimerManager** - Gestion des timers

**Fichier** : `timer-manager.js`  
**Namespace** : `GeoLeaf.Utils.TimerManager`

#### API Principale

##### `setTimeout(callback, delay, context)`

setTimeout avec tracking pour cleanup.

```javascript
const timerId = GeoLeaf.Utils.TimerManager.setTimeout(
    () => console.log("Delayed action"),
    1000,
    "MyModule"
);

// Annuler le timer
GeoLeaf.Utils.TimerManager.clearTimeout(timerId);
```

##### `clearByContext(context)`

Annule tous les timers d'un contexte.

```javascript
// Créer plusieurs timers
GeoLeaf.Utils.TimerManager.setTimeout(action1, 1000, "POI");
GeoLeaf.Utils.TimerManager.setInterval(action2, 500, "POI");

// Tout annuler d'un coup
GeoLeaf.Utils.TimerManager.clearByContext("POI");
```

---

## 📦 Intégration dans les modules GeoLeaf

Les utils sont utilisés à travers tout GeoLeaf :

### Exemple : Module POI

```javascript
// poi/poi-renderer.js
(function (global) {
    const { DomHelpers, Formatters, EventHelpers } = global.GeoLeaf.Utils;

    function renderPOIPopup(poi) {
        return DomHelpers.createElement(
            "div",
            { className: "poi-popup" },
            DomHelpers.createElement("h3", {}, poi.name),
            DomHelpers.createElement("p", {}, Formatters.formatDistance(poi.distance)),
            DomHelpers.createElement(
                "button",
                {
                    onClick: () => handleClick(poi),
                    _eventContext: "POI.popup",
                },
                "Voir détails"
            )
        );
    }

    function handleClick(poi) {
        EventHelpers.dispatchCustomEvent("geoleaf:poi:selected", {
            id: poi.id,
            name: poi.name,
        });
    }
})(window);
```

### Exemple : Module Route avec cleanup

```javascript
// route/route-manager.js
(function (global) {
    const { MapHelpers, EventListenerManager } = global.GeoLeaf.Utils;

    const Route = {
        _cleanups: [],

        init(options = {}) {
            const map = MapHelpers.ensureMapStrict(options.map, "Route.init");

            const cleanup1 = EventListenerManager.add(
                map,
                "zoomend",
                this.handleZoom,
                null,
                "Route.map"
            );
            this._cleanups.push(cleanup1);
        },

        destroy() {
            // Cleanup automatique de tous les listeners
            this._cleanups.forEach((fn) => fn());
            this._cleanups = [];
            EventListenerManager.removeByContext("Route.map");
        },
    };
})(window);
```

---

## 🎨 Configuration

Les utils peuvent être configurés globalement :

```javascript
// Configuration des formatters
GeoLeaf.Utils.Formatters.setConfig({
    locale: "en-US",
    distanceUnits: "imperial",
});

// Configuration du FetchHelper
GeoLeaf.Utils.FetchHelper.setDefaults({
    timeout: 15000,
    retries: 3,
    retryDelay: 2000,
});

// Configuration du LazyLoader
const loader = new GeoLeaf.Utils.LazyLoader({
    images: {
        rootMargin: "100px",
        threshold: 0.2,
    },
});
```

---

## 🔧 Architecture interne

### Pattern de namespace

Tous les utils suivent le pattern :

```javascript
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    GeoLeaf.Utils = GeoLeaf.Utils || {};

    GeoLeaf.Utils.ModuleName = {
        // API publique...
    };
})(window);
```

### Dépendances entre utils

```
DomHelpers
  └─→ EventListenerManager (pour auto-cleanup)
  └─→ DomSecurity (pour sanitization)

EventHelpers
  └─→ Log (pour logging optionnel)

FetchHelper
  └─→ Security.validateUrl (validation optionnelle)
  └─→ Log (pour logging optionnel)

MapHelpers
  └─→ Core.getMap (résolution map)
```

### Compatibilité navigateurs

- **Modernes** : Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **IE11** : Support limité (fallbacks pour CustomEvent, Fetch, IntersectionObserver)

---

## ⚠️ Limitations

1. **Performance Profiler** : Chrome DevTools API non disponible sur tous navigateurs
2. **Lazy Loader** : IntersectionObserver requiert polyfill pour IE11
3. **FetchHelper** : Fetch API requiert polyfill pour navigateurs anciens
4. **EventListenerManager** : WeakMap utilisée (pas IE10)

---

## 🔗 Modules liés

- **[GeoLeaf.Core](../core/GeoLeaf_core_README.md)** : Initialisation carte, getMap()
- **[GeoLeaf.Log](../log/GeoLeaf_Logging_README.md)** : Logging utilisé par les utils
- **[GeoLeaf.Security](../security/GeoLeaf_Security_README.md)** : Validation/sanitization
- **[GeoLeaf.POI](../poi/GeoLeaf_POI_README.md)** : Utilise formatters, dom-helpers
- **[GeoLeaf.UI](../ui/GeoLeaf_UI_README.md)** : Utilise dom-helpers, event-helpers

---

## 🚀 Améliorations futures

### Phase 1 (Court terme)

- [ ] Ajouter `GeoLeaf.Utils.StorageHelpers` (localStorage/sessionStorage unifié)
- [ ] Ajouter `GeoLeaf.Utils.GeometryHelpers` (calculs géographiques)
- [ ] Tests unitaires pour chaque module utils

### Phase 2 (Moyen terme)

- [ ] TypeScript definitions pour tous les utils
- [ ] Polyfills automatiques pour IE11
- [ ] Bundle séparé utils-only pour réutilisation hors GeoLeaf

### Phase 3 (Long terme)

- [ ] WebWorker support pour performance-intensive utils
- [ ] Service Worker helpers pour offline
- [ ] Internationalization (i18n) pour formatters

---

**Version** : 4.0.0  
**Dernière mise à jour** : 19 janvier 2026  
**Sprint 2** : Documentation complète des 13 modules utilitaires ✅
