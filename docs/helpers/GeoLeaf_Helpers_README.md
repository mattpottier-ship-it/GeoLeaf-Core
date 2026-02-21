# GeoLeaf.Helpers â€“ Documentation du module Helpers

**Product Version:** GeoLeaf Platform V1  

**Version**: 3.2.0  
**Fichier**: `src/static/js/geoleaf.helpers.js` (613 lignes)  
**DerniÃ¨re mise Ã  jour**: 19 janvier 2026  
**DerniÃ¨re vÃ©rification**: 19 janvier 2026

---

## ðŸ“Œ Vue d'ensemble

Le module **GeoLeaf.Helpers** fournit des utilitaires d'optimisation de performance et de manipulation DOM pour amÃ©liorer les performances et la maintenabilitÃ© de GeoLeaf.

### CatÃ©gories d'utilitaires

- ðŸŽ¨ **DOM Helpers** - Manipulation sÃ©curisÃ©e du DOM
- âš¡ **Performance** - Debounce, throttle, lazy loading
- ðŸ”„ **Events** - Gestion d'Ã©vÃ©nements avec cleanup
- ðŸ› ï¸ **Utilities** - Deep clone, retry, wait

---

## ðŸŽ¨ DOM Helpers

### `getElementById(id)`

RÃ©cupÃ¨re un Ã©lÃ©ment par ID de maniÃ¨re sÃ©curisÃ©e.

```js
const element = GeoLeaf.Helpers.getElementById('my-map');
// Returns: HTMLElement ou null
```

---

### `querySelector(selector, parent?)`

Query selector sÃ©curisÃ© avec gestion d'erreurs.

```js
const element = GeoLeaf.Helpers.querySelector('.gl-map-container');
const child = GeoLeaf.Helpers.querySelector('.item', parentElement);
// Returns: HTMLElement ou null
```

---

### `querySelectorAll(selector, parent?)`

Query all avec conversion automatique en Array.

```js
const elements = GeoLeaf.Helpers.querySelectorAll('.poi-marker');
// Returns: Array<HTMLElement> (toujours un array, jamais null)
```

---

### `createElement(tag, options)`

CrÃ©e un Ã©lÃ©ment avec attributs, styles et contenu en une seule fois.

```js
const button = GeoLeaf.Helpers.createElement('button', {
  className: 'gl-btn gl-primary',
  id: 'my-button',
  textContent: 'Cliquez-moi',
  attributes: {
    'aria-label': 'Mon bouton',
    'data-action': 'submit'
  },
  styles: {
    backgroundColor: '#007bff',
    color: 'white'
  },
  dataset: {
    poiId: 'poi-123',
    category: 'restaurant'
  }
});
```

**Options supportÃ©es** :
- `className` : Classes CSS
- `id` : ID de l'Ã©lÃ©ment
- `textContent` : Texte brut
- `innerHTML` : HTML (utiliser avec prÃ©caution)
- `attributes` : Attributs HTML (aria-*, data-*, etc.)
- `styles` : Styles inline
- `dataset` : Data attributes
- `children` : Array d'Ã©lÃ©ments enfants

---

### `addClass(element, ...classes)`

Ajoute une ou plusieurs classes CSS.

```js
GeoLeaf.Helpers.addClass(element, 'active');
GeoLeaf.Helpers.addClass(element, 'primary', 'highlighted');
```

---

### `removeClass(element, ...classes)`

Supprime une ou plusieurs classes CSS.

```js
GeoLeaf.Helpers.removeClass(element, 'active');
GeoLeaf.Helpers.removeClass(element, 'loading', 'disabled');
```

---

### `toggleClass(element, className)`

Bascule une classe CSS.

```js
GeoLeaf.Helpers.toggleClass(element, 'active');
// Returns: true si ajoutÃ©e, false si supprimÃ©e
```

---

## âš¡ Performance Helpers

### `debounce(func, delay, options?)`

Retarde l'exÃ©cution d'une fonction jusqu'Ã  ce que `delay` ms se soient Ã©coulÃ©es sans nouveaux appels.

**IdÃ©al pour** : Recherche en temps rÃ©el, resize window, scroll

```js
// Recherche POI avec debounce
const searchPOI = GeoLeaf.Helpers.debounce((query) => {
  console.log('Recherche:', query);
  // ExÃ©cutÃ© seulement 300ms aprÃ¨s la fin de la frappe
}, 300);

input.addEventListener('input', (e) => searchPOI(e.target.value));
```

**Options** :
```js
GeoLeaf.Helpers.debounce(func, 300, {
  leading: true,   // ExÃ©cuter au premier appel
  trailing: true,  // ExÃ©cuter aprÃ¨s le dÃ©lai
  maxWait: 1000    // Forcer l'exÃ©cution aprÃ¨s maxWait ms
});
```

---

### `throttle(func, limit, options?)`

Limite le taux d'exÃ©cution d'une fonction Ã  maximum une fois par `limit` ms.

**IdÃ©al pour** : Scroll events, mousemove, resize

```js
// Mise Ã  jour position sur scroll
const updatePosition = GeoLeaf.Helpers.throttle(() => {
  console.log('Position:', window.scrollY);
  // ExÃ©cutÃ© max 1 fois toutes les 100ms
}, 100);

window.addEventListener('scroll', updatePosition);
```

**Options** :
```js
GeoLeaf.Helpers.throttle(func, 100, {
  leading: true,   // ExÃ©cuter au premier appel
  trailing: true   // ExÃ©cuter Ã  la fin si des appels sont en attente
});
```

---

### `lazyLoadImage(img, options?)`

Charge une image uniquement quand elle devient visible (Intersection Observer).

```js
const img = document.querySelector('.poi-image');
GeoLeaf.Helpers.lazyLoadImage(img, {
  threshold: 0.1,      // Charger Ã  10% de visibilitÃ©
  rootMargin: '50px',  // PrÃ©charger 50px avant visibilitÃ©
  placeholder: '/img/loading.gif'
});
```

---

### `lazyExecute(callback, options?)`

ExÃ©cute une fonction uniquement quand l'Ã©lÃ©ment devient visible.

```js
GeoLeaf.Helpers.lazyExecute(() => {
  console.log('Ã‰lÃ©ment visible !');
  // Charger des donnÃ©es lourdes
}, {
  target: document.querySelector('.heavy-component'),
  threshold: 0.5
});
```

---

### `requestFrame(callback)`

ExÃ©cute un callback au prochain frame d'animation (optimisÃ© pour 60fps).

```js
GeoLeaf.Helpers.requestFrame(() => {
  // Animation ou modification DOM optimisÃ©e
  element.style.transform = `translateX(${x}px)`;
});
```

---

## ðŸ”„ Event Helpers

### `addEventListener(element, event, handler, options?)`

Ajoute un event listener avec cleanup automatique.

```js
const cleanup = GeoLeaf.Helpers.addEventListener(
  button,
  'click',
  (e) => console.log('Click !'),
  { once: true }
);

// Nettoyer manuellement si besoin
cleanup();
```

---

### `delegateEvent(parent, selector, event, handler)`

DÃ©lÃ©gation d'Ã©vÃ©nements pour Ã©lÃ©ments dynamiques.

```js
// Ã‰couter tous les boutons POI, mÃªme ceux ajoutÃ©s dynamiquement
GeoLeaf.Helpers.delegateEvent(
  document.body,
  '.poi-marker',
  'click',
  (e) => {
    console.log('POI cliquÃ©:', e.target.dataset.poiId);
  }
);
```

---

## ðŸ› ï¸ Utility Helpers

### `deepClone(obj)`

Clone profond d'un objet (supporte arrays, objects, dates).

```js
const original = { name: 'POI', coords: [45.5, -73.6], tags: ['a', 'b'] };
const clone = GeoLeaf.Helpers.deepClone(original);

clone.tags.push('c');
console.log(original.tags); // ['a', 'b'] - Original non modifiÃ©
console.log(clone.tags);    // ['a', 'b', 'c']
```

---

### `wait(ms)`

Promise de dÃ©lai (async/await friendly).

```js
async function loadData() {
  console.log('Chargement...');
  await GeoLeaf.Helpers.wait(2000);
  console.log('DonnÃ©es chargÃ©es aprÃ¨s 2s');
}
```

---

### `retryWithBackoff(fn, options?)`

RÃ©essaye une fonction avec dÃ©lai exponentiel en cas d'Ã©chec.

```js
const data = await GeoLeaf.Helpers.retryWithBackoff(
  async () => {
    const response = await fetch('/api/poi');
    if (!response.ok) throw new Error('Erreur rÃ©seau');
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
);

// Tentatives :
// 1. Ã‰chec â†’ attendre 1000ms
// 2. Ã‰chec â†’ attendre 2000ms (1000 * 2)
// 3. Ã‰chec â†’ attendre 4000ms (2000 * 2)
// 4. SuccÃ¨s ou erreur finale
```

---

## ðŸ’¡ Exemples d'utilisation

### Optimisation de recherche

```js
// Sans debounce : 1 requÃªte par lettre tapÃ©e = 10 requÃªtes pour "restaurant"
// Avec debounce : 1 requÃªte aprÃ¨s 300ms = Ã©conomie de 9 requÃªtes !

const searchInput = document.querySelector('#search');
const debouncedSearch = GeoLeaf.Helpers.debounce((query) => {
  GeoLeaf.Filters.applyFilters({ searchText: query });
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

---

### Lazy loading de POI

```js
// Charger les POI uniquement quand la carte est visible
GeoLeaf.Helpers.lazyExecute(() => {
  GeoLeaf.POI.loadAndDisplay();
}, {
  target: document.querySelector('#geoleaf-map'),
  threshold: 0.1
});
```

---

### Event delegation pour markers dynamiques

```js
// Un seul event listener pour tous les markers (mÃªme futurs)
GeoLeaf.Helpers.delegateEvent(
  document.body,
  '.leaflet-marker-icon',
  'click',
  (e) => {
    const poiId = e.target.dataset.poiId;
    GeoLeaf.UI.showPoiDetails(poiId);
  }
);
```

---

## ðŸ“Š Impact performance

| Technique | Gain | Cas d'usage |
|-----------|------|-------------|
| **Debounce** | -80% requÃªtes | Recherche, resize |
| **Throttle** | -90% exÃ©cutions | Scroll, mousemove |
| **Lazy loading** | +50% vitesse initiale | Images, donnÃ©es |
| **requestFrame** | 60 FPS stable | Animations |
| **Event delegation** | -90% listeners | Listes dynamiques |

---

## ðŸ§ª Tests

```bash
npm test -- helpers

# Fichiers de tests
__tests__/helpers/helpers.test.js
```

**Couverture** : 85%+ (90+ tests passants)

---

## ðŸ”— Voir aussi

- `GeoLeaf.Utils` - Utilitaires gÃ©nÃ©raux
- `GeoLeaf.Filters` - Utilise debounce pour recherche
- Performance Best Practices - MDN Web Docs
