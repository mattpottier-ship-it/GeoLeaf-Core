# Architecture performance (GeoLeaf)

Court document sur les choix techniques liés à la **performance** dans GeoLeaf (Worker GeoJSON, lazy loading, requestIdleCallback, bonnes pratiques). Voir aussi [PERFORMANCE_METRICS.md](../PERFORMANCE_METRICS.md) pour les métriques runtime et [ROADMAP_SUITE_AUDIT.md](../ROADMAP_SUITE_AUDIT.md) (étapes 3, 6).

---

## 1. Worker GeoJSON

Le chargement des couches GeoJSON peut faire du **fetch + parse** dans un **Web Worker** pour ne pas bloquer le thread principal. Si le Worker est indisponible ou si les données viennent du cache, le parse peut toutefois s’effectuer sur le main thread (gros fichiers = risque de freeze).

- **Fichiers concernés** : `src/modules/geojson/` (loader, worker).
- **Bonnes pratiques** : pour les très gros GeoJSON, privilégier la découpe en plusieurs couches, le lazy loading par vue, ou les vector tiles si le profil le permet.

---

## 2. Lazy loading (code splitting)

- **Modules secondaires** : POI, Route, Legend, LayerManager, Labels, Themes, Table sont chargés en **chunks ESM** (import dynamique) en mode bundle ESM. En UMD, tout est inliné dans un seul fichier (`inlineDynamicImports: true`).
- **Préchargement** : `_loadAllSecondaryModules()` est déclenché tôt pour chevaucher le téléchargement des chunks avec l’init UI/Storage, puis `await` avant d’utiliser les modules.
- **Lazy UI** : `lazyLoadImage` (IntersectionObserver), `lazyExecute` (report d’exécution via `requestIdleCallback` ou `setTimeout`) dans les helpers DOM.

---

## 3. requestIdleCallback

Utilisé pour **répartir le travail** et garder l’UI réactive :

- **GeoJSON** : après parse (Worker ou main), l’ajout des features au calque Leaflet est fait par **chunks** (ex. 200 features par batch) via `requestIdleCallback` (fallback `setTimeout`) pour ne pas bloquer le main thread. Voir `geojson/loader/single-layer.ts` (`_addFeaturesChunked`).
- **Profil / couches** : planification de tâches lourdes (ex. chargement de couches) avec `requestIdleCallback` (timeout 3000 ms) ou `setTimeout` en fallback. Voir `geojson/loader/profile.ts`.
- **Helpers** : `lazyExecute(callback, timeout)` utilise `requestIdleCallback` si disponible.

---

## 4. Bonnes pratiques

| Sujet                 | Recommandation                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taille GeoJSON**    | Éviter un seul fichier énorme ; découper en couches ou par zone/vue si possible. En cas de gros fichier, le Worker + chunked addData limitent le freeze.                |
| **Nombre de couches** | Limiter le nombre de couches actives simultanées si les données sont lourdes ; utiliser la visibilité par thème et le lazy loading des couches.                         |
| **Bundle lite**       | Objectif &lt;130 KB gzip pour `geoleaf-lite.umd.js` ; vérifier avec `npm run benchmark` et `dist/stats.html`. Voir [PERFORMANCE_METRICS.md](../PERFORMANCE_METRICS.md). |
| **Métriques runtime** | Utiliser `GeoLeaf.getPerformanceMetrics()` ou `GeoLeaf.boot({ onPerformanceMetrics })` pour suivre le temps jusqu’à première couche et interactivité.                   |

---

## Voir aussi

- [ARCHITECTURE_GUIDE.md](../ARCHITECTURE_GUIDE.md) — Architecture modulaire et boot
- [GEOJSON_LAYERS_GUIDE.md](../geojson/GEOJSON_LAYERS_GUIDE.md) — Couches GeoJSON
- [PERFORMANCE_METRICS.md](../PERFORMANCE_METRICS.md) — Métriques runtime et cible bundle lite
