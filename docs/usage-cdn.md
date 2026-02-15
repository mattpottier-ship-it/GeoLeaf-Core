# GeoLeaf – Utilisation via CDN et NPM

**Version**: 3.2.0  
**Dernière mise à jour**: 14 février 2026

---

Ce document décrit les méthodes recommandées pour charger GeoLeaf dans une application web :

- via **CDN UNPKG** ;
- via **CDN jsDelivr** ;
- via **NPM / ESM** dans un bundler moderne ;
- via un **bundle UMD local** (dist/geoleaf.min.js) ;
- avec un **exemple HTML complet** ;
- avec des **avertissements API** autour de `GeoLeaf.Core.init(...)`.

> **Note** : les URLs de CDN ci-dessous supposent que le package `geoleaf` est publié sur NPM.

---

## 1. Utilisation via UNPKG (CDN)

```html
<link rel="stylesheet" href="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf-main.min.css" />
<script src="https://unpkg.com/geoleaf@3.2.0/dist/geoleaf.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

---

## 2. Utilisation via jsDelivr (CDN)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geoleaf@3.2.0/dist/geoleaf-main.min.css" />
<script src="https://cdn.jsdelivr.net/npm/geoleaf@3.2.0/dist/geoleaf.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
```

---

## 3. Utilisation locale du bundle UMD (dist/)

```html
<link rel="stylesheet" href="/dist/geoleaf-main.min.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/dist/geoleaf.min.js"></script>
```

---

## 4. Import NPM / ESM dans un bundler moderne

```bash
npm install geoleaf leaflet
```

```js
import L from "leaflet";
import GeoLeaf from "geoleaf";

GeoLeaf.Core.init({
  mapId: "geoleaf-map",
  center: [-32.95, -60.65],
  zoom: 12,
  theme: "light",
});
```

---

## 5. Exemple HTML complet

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Exemple GeoLeaf – CDN UMD</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geoleaf@3.2.0/dist/geoleaf-main.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/geoleaf@3.2.0/dist/geoleaf.min.js"></script>

  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    #geoleaf-map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="geoleaf-map"></div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      GeoLeaf.Core.init({
        mapId: "geoleaf-map",
        center: [-32.95, -60.65],
        zoom: 12,
        theme: "light",
      });
    });
  </script>
</body>
</html>
```

---

## 6. API `GeoLeaf.Core.init(...)`

```ts
interface GeoLeafCoreInitOptions {
  mapId: string;
  center: [number, number];
  zoom: number;
  theme?: string;
  basemapId?: string;
  configUrl?: string;
  onReady?: (ctx: GeoLeafCoreContext) => void;
  onError?: (error: unknown) => void;
}

interface GeoLeafCoreContext {
  map: L.Map;
  baselayers?: unknown;
  ui?: unknown;
  config?: unknown;
}
```

---

## 7. Avertissements API

- Charger Leaflet avant GeoLeaf.
- Vérifier la présence de `window.GeoLeaf.Core.init`.
- Ne pas mélanger ESM et UMD.
- Prévoir un fallback local.
- Versionner explicitement les URLs CDN.

---

## 8. Structure recommandée

```
dist/
 ├─ geoleaf.min.js
 ├─ geoleaf.umd.js
 ├─ geoleaf.esm.js
 └─ geoleaf-main.min.css

src/
 └─ static/
      ├─ js/
      └─ css/

docs/
 └─ usage-cdn.md
```

---

## 9. Check-list intégration

- [ ] Leaflet chargé
- [ ] GeoLeaf chargé
- [ ] window.GeoLeaf défini
- [ ] Core.init disponible
- [ ] Carte visible dans le DOM
- [ ] URLs CDN versionnées
