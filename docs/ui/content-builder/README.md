# ðŸ“¦ Content Builder - Documentation ComplÃ¨te

**Version**: 4.0.0  
**Date**: 18 janvier 2026  
**Module**: `GeoLeaf._ContentBuilder`

---

## ðŸ“‹ Table des MatiÃ¨res

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modules](#modules)
4. [API Reference](#api-reference)
5. [Exemples d'utilisation](#exemples-dutilisation)
6. [Migration depuis v0.9](#migration-depuis-v09)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## ðŸŽ¯ Vue d'ensemble

Le **Content Builder** est le systÃ¨me de gÃ©nÃ©ration de contenu HTML pour les POIs (Points d'IntÃ©rÃªt) dans GeoLeaf. Il gÃ¨re la crÃ©ation de:

- **Popups**: FenÃªtres contextuelles sur la carte
- **Tooltips**: Info-bulles au survol
- **Panels**: Panneaux latÃ©raux dÃ©taillÃ©s

### Architecture Modulaire (v1.0.0)

Depuis Sprint 4.5 (janvier 2026), le Content Builder utilise une **architecture modulaire en 4 fichiers**:

```
ui/content-builder/
â”œâ”€â”€ core.js (316 lignes)
â”‚   â””â”€â”€ Helpers, validators, badge resolver, formatters
â”œâ”€â”€ templates.js (351 lignes)
â”‚   â””â”€â”€ 14 template builders HTML
â”œâ”€â”€ assemblers.js (361 lignes)
â”‚   â””â”€â”€ Assembleurs popup/tooltip/panel
â””â”€â”€ content-builder.js (653 lignes)
    â””â”€â”€ 13 renderers + orchestration
```

**Avantages**:

- âœ… **ModularitÃ©**: Chaque module a une responsabilitÃ© claire
- âœ… **TestabilitÃ©**: Modules isolÃ©s testables individuellement
- âœ… **MaintenabilitÃ©**: Fichiers <400 lignes, code organisÃ©
- âœ… **Performance**: Lazy loading potentiel, cache badge resolver
- âœ… **RÃ©utilisabilitÃ©**: Templates et helpers rÃ©utilisables

---

## ðŸ—ï¸ Architecture

### Diagramme de Flux

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   USER INTERACTION                       â”‚
â”‚         (Click POI, Hover, Open Panel)                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
                          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              POI Handler (poi.popup.js)                  â”‚
â”‚  Appelle: buildPopupHTML / buildTooltipHTML / Panel      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
                          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚             CONTENT BUILDER ORCHESTRATOR                 â”‚
â”‚              (content-builder.js)                        â”‚
â”‚                                                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚  buildPopupHTML(poi, config, options)      â”‚         â”‚
â”‚  â”‚  buildTooltipHTML(poi, config, options)    â”‚         â”‚
â”‚  â”‚  buildPanelItems(poi, config, options)     â”‚         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â”‚           â”‚                                              â”‚
â”‚           â”‚ DÃ©lÃ©gation                                   â”‚
â”‚           â–¼                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚  Assemblers Module (assemblers.js)         â”‚         â”‚
â”‚  â”‚  - buildPopupHTML (171 lignes)             â”‚         â”‚
â”‚  â”‚  - buildTooltipHTML (90 lignes)            â”‚         â”‚
â”‚  â”‚  - buildPanelItems (50 lignes)             â”‚         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â”‚           â”‚                                              â”‚
â”‚           â”‚ Appelle renderItem pour chaque Ã©lÃ©ment       â”‚
â”‚           â–¼                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚  Renderers (13 types)                      â”‚         â”‚
â”‚  â”‚  - renderText, renderBadge, renderImage    â”‚         â”‚
â”‚  â”‚  - renderList, renderTable, renderTags     â”‚         â”‚
â”‚  â”‚  - renderCoordinates, renderGallery, etc.  â”‚         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â”‚           â”‚                                              â”‚
â”‚           â”‚ Utilise                                      â”‚
â”‚           â–¼                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚  Core Module (core.js)                     â”‚         â”‚
â”‚  â”‚  - Helpers: getResolveField, getEscapeHtml â”‚         â”‚
â”‚  â”‚  - Validators: validateImageUrl, etc.      â”‚         â”‚
â”‚  â”‚  - Badge Resolver: resolveBadge            â”‚         â”‚
â”‚  â”‚  - Formatters: formatNumber, formatCoords  â”‚         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â”‚           â”‚                                              â”‚
â”‚           â”‚ Utilise                                      â”‚
â”‚           â–¼                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚  Templates Module (templates.js)           â”‚         â”‚
â”‚  â”‚  - createMetricElement                     â”‚         â”‚
â”‚  â”‚  - createRatingElement                     â”‚         â”‚
â”‚  â”‚  - createListElement                       â”‚         â”‚
â”‚  â”‚  - createBadge, buildLabel, etc.           â”‚         â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
                          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  HTML CONTENT GENERATED                  â”‚
â”‚        (Popup, Tooltip, Panel items)                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Ordre de Chargement (bundle-entry.js)

```javascript
// Ordre critique (dÃ©fini dans src/bundle-entry.js)
("ui/content-builder/core.js", // 1. Helpers + validators
    "ui/content-builder/templates.js", // 2. Template builders
    "ui/content-builder/assemblers.js", // 3. Assembleurs
    "ui/content-builder.js"); // 4. Renderers + orchestration
```

âš ï¸ **Important**: Ne pas modifier l'ordre de chargement sous peine de dÃ©pendances manquantes.

---

## ðŸ“¦ Modules

### 1. core.js (316 lignes)

**ResponsabilitÃ©**: Fonctions utilitaires, validateurs, rÃ©solution badges, formatage.

**Exports**:

```javascript
GeoLeaf._ContentBuilder.Core = {
    // Helpers
    getResolveField(),      // RÃ©solution champs POI multi-paths
    getEscapeHtml(),        // Ã‰chappement HTML sÃ©curisÃ©
    getActiveProfile(),     // Profil config actif
    getLog(),               // Logger systÃ¨me

    // Validators
    validateImageUrl(poi, field, options),
    validateCoordinates(poi, field),
    validateNumber(value, options),
    validateRating(value, options),

    // Badge Resolver
    resolveBadge(poi, config, options),
    resolveBadgeTooltip(badge),

    // Formatters
    formatNumber(value, options),
    formatCoordinates(lat, lng, format),
    formatRating(value, max)
}
```

**Exemple**:

```javascript
const Core = GeoLeaf._ContentBuilder.Core;

// Validation image URL
const imageUrl = Core.validateImageUrl(poi, "attributes.photo", {
    defaultImage: "/images/default.jpg",
});

// RÃ©solution badge
const badge = Core.resolveBadge(
    poi,
    { field: "attributes.categoryId" },
    {
        context: "popup",
        resolveCategoryDisplay: true,
    }
);
// Retourne: { icon, color, label, tooltip }

// Formatage coordonnÃ©es
const formatted = Core.formatCoordinates(45.7578, 4.832);
// Retourne: "45Â°45'28.1\"N, 4Â°49'55.2\"E"
```

ðŸ“„ **Documentation complÃ¨te**: [core.js API Reference](#core-api)

---

### 2. templates.js (351 lignes)

**ResponsabilitÃ©**: GÃ©nÃ©ration structures HTML pour tous types de contenu.

**Exports**:

```javascript
GeoLeaf._ContentBuilder.Templates = {
    // CSS Classes Library (BEM)
    CSS_CLASSES: {
        METRIC: 'gl-metric',
        METRIC_VALUE: 'gl-metric__value',
        // ... 40+ classes BEM
    },

    // Template Builders (14 fonctions)
    createMetricElement(value, options),
    createRatingElement(value, options),
    createListElement(items, options),
    createTagsElement(tags, options),
    createCoordinatesElement(lat, lng, options),
    createGalleryElement(images, options),
    createBadge(badge, options),
    buildLabel(label, options),
    wrapInParagraph(content, className),
    wrapInDiv(content, className),
    wrapInLink(content, href, options),
    createTitle(text, level, icon),
    createImage(src, options),
    createTable(data, options)
}
```

**Exemple**:

```javascript
const Templates = GeoLeaf._ContentBuilder.Templates;

// CrÃ©er mÃ©trique
const metricHtml = Templates.createMetricElement(42.5, {
    prefix: "â‚¬",
    suffix: "/mÂ²",
    icon: "fa-euro",
});
// Retourne: <div class="gl-metric">â‚¬ 42.5 /mÂ²</div>

// CrÃ©er rating
const ratingHtml = Templates.createRatingElement(4.5, { max: 5 });
// Retourne: <div class="gl-rating">â˜…â˜…â˜…â˜…â˜† 4.5/5</div>

// CrÃ©er badge
const badgeHtml = Templates.createBadge({
    label: "Restaurant",
    icon: "fa-utensils",
    color: "#e74c3c",
    tooltip: "CatÃ©gorie: Restaurants",
});
```

ðŸ“„ **Documentation complÃ¨te**: [templates.js API Reference](#templates-api)

---

### 3. assemblers.js (361 lignes)

**ResponsabilitÃ©**: Assembler les renderers en structures complÃ¨tes (popup, tooltip, panel).

**Exports**:

```javascript
GeoLeaf._ContentBuilder.Assemblers = {
    buildPopupHTML(poi, config, options),      // HTML complet popup
    buildTooltipHTML(poi, config, options),    // HTML complet tooltip
    buildPanelItems(poi, config, options)      // Items panneau latÃ©ral
}
```

**Exemple**:

```javascript
const Assemblers = GeoLeaf._ContentBuilder.Assemblers;

// Build Popup
const popupHtml = Assemblers.buildPopupHTML(
    poi,
    [
        { type: "image", field: "photo", variant: "hero", order: 1 },
        { type: "badge", field: "categoryId", order: 2 },
        { type: "text", field: "name", variant: "title", order: 3 },
        { type: "longtext", field: "description", order: 4 },
    ],
    { context: "popup" }
);

// Build Tooltip
const tooltipHtml = Assemblers.buildTooltipHTML(poi, [
    { type: "text", field: "name", order: 1 },
    { type: "badge", field: "categoryId", order: 2, contentUnion: "-" },
]);
// Retourne: "Restaurant La Bonne Table - Restaurant"

// Build Panel Items
const panelItems = Assemblers.buildPanelItems(poi, [
    { type: "image", field: "photo", order: 1 },
    { type: "list", field: "services", label: "Services", accordion: true },
    { type: "table", field: "schedule", label: "Horaires" },
]);
// Retourne: [{ html, config, label, accordion, defaultOpen }, ...]
```

ðŸ“„ **Documentation complÃ¨te**: [assemblers.js API Reference](#assemblers-api)

---

### 4. content-builder.js (653 lignes)

**ResponsabilitÃ©**: Renderers individuels (13 types) + orchestration centrale.

**Exports**:

```javascript
GeoLeaf._ContentBuilder = {
    // Renderers individuels (13)
    renderText(poi, config, options),
    renderLongtext(poi, config, options),
    renderNumber(poi, config, options),
    renderMetric(poi, config, options),
    renderRating(poi, config, options),
    renderBadge(poi, config, options),
    renderImage(poi, config, options),
    renderLink(poi, config, options),
    renderList(poi, config, options),
    renderTable(poi, config, options),
    renderTags(poi, config, options),
    renderCoordinates(poi, config, options),
    renderGallery(poi, config, options),
    renderItem(poi, config, options),    // Dispatcher

    // Assembleurs (dÃ©lÃ©guÃ©s Ã  assemblers.js)
    buildPopupHTML(poi, config, options),
    buildTooltipHTML(poi, config, options),
    buildPanelItems(poi, config, options),

    // Utilitaires exposÃ©s
    getResolveField(),
    getEscapeHtml(),
    getActiveProfile()
}
```

**Types de renderers**:
| Type | Description | Exemple champ |
|------|-------------|---------------|
| `text` | Texte simple (variants: title, short, long) | `name`, `title`, `description` |
| `longtext` | Texte multiligne | `description`, `notes` |
| `number` | Valeur numÃ©rique formatÃ©e | `price`, `area`, `quantity` |
| `metric` | Nombre avec prÃ©fixe/suffixe | `â‚¬ 89.50 /nuit` |
| `rating` | Note avec Ã©toiles | `4.5/5 â˜…â˜…â˜…â˜…â˜†` |
| `badge` | Badge taxonomie | CatÃ©gorie, Sous-catÃ©gorie |
| `image` | Image (variants: default, hero) | `photo`, `thumbnail` |
| `link` | Lien hypertexte | `website`, `booking_url` |
| `list` | Liste HTML | `services[]`, `amenities[]` |
| `table` | Tableau donnÃ©es | `schedule`, `pricing` |
| `tags` | Cloud de tags | `keywords[]`, `tags[]` |
| `coordinates` | GPS (DMS format) | `latitude`, `longitude` |
| `gallery` | Galerie images | `photos[]`, `gallery[]` |

ðŸ“„ **Documentation complÃ¨te**: [content-builder.js API Reference](#content-builder-api)

---

## ðŸ“– API Reference

### Core API

#### `getResolveField()`

Retourne une fonction de rÃ©solution de champs POI avec support multi-paths.

**Signature**:

```javascript
const resolveField = Core.getResolveField();
const value = resolveField(poi, ...paths);
```

**ParamÃ¨tres**:

- `poi` (Object): Objet POI Ã  interroger
- `paths` (...String): Chemins Ã  tester (ex: 'attributes.name', 'properties.nom')

**Retourne**: PremiÃ¨re valeur non-null trouvÃ©e, ou `null`

**Exemple**:

```javascript
const resolveField = Core.getResolveField();
const name = resolveField(poi, "attributes.name", "attributes.nom", "properties.name");
// Teste dans l'ordre: poi.attributes.name â†’ poi.attributes.nom â†’ poi.properties.name
```

---

#### `validateImageUrl(poi, field, options)`

Valide et normalise une URL d'image.

**ParamÃ¨tres**:

- `poi` (Object): POI source
- `field` (String): Champ Ã  valider
- `options` (Object):
    - `defaultImage` (String): Image par dÃ©faut si invalide
    - `allowedPatterns` (Array<RegExp>): Patterns autorisÃ©s (dÃ©faut: `[/^https?:\/\//, /^data:image\//]`)

**Retourne**: URL validÃ©e (String) ou `defaultImage`

**Exemple**:

```javascript
const imageUrl = Core.validateImageUrl(poi, "attributes.photo", {
    defaultImage: "/images/placeholder.jpg",
    allowedPatterns: [/^https?:\/\//, /^\/images\//],
});
```

---

#### `resolveBadge(poi, config, options)`

RÃ©sout un badge depuis taxonomie ou styleRules.

**ParamÃ¨tres**:

- `poi` (Object): POI source
- `config` (Object): Configuration badge `{ field, type: 'badge' }`
- `options` (Object):
    - `context` (String): 'popup', 'tooltip', 'panel'
    - `resolveCategoryDisplay` (Boolean): RÃ©soudre label taxonomie

**Retourne**: Object `{ icon, color, label, tooltip }`

**Exemple**:

```javascript
const badge = Core.resolveBadge(
    poi,
    { field: "attributes.categoryId", type: "badge" },
    { context: "popup", resolveCategoryDisplay: true }
);
// Retourne:
// {
//   icon: 'fa-restaurant',
//   color: '#e74c3c',
//   label: 'Restaurants',
//   tooltip: 'CatÃ©gorie: Restaurants'
// }
```

---

#### `formatCoordinates(lat, lng, format)`

Formate des coordonnÃ©es GPS.

**ParamÃ¨tres**:

- `lat` (Number): Latitude
- `lng` (Number): Longitude
- `format` (String): 'DMS' (degrÃ©s/minutes/secondes) ou 'DD' (dÃ©cimal)

**Retourne**: String formatÃ©

**Exemple**:

```javascript
const dms = Core.formatCoordinates(45.7578, 4.832, "DMS");
// Retourne: "45Â°45'28.1\"N, 4Â°49'55.2\"E"

const decimal = Core.formatCoordinates(45.7578, 4.832, "DD");
// Retourne: "45.7578, 4.8320"
```

---

### Templates API

#### `createMetricElement(value, options)`

CrÃ©e un Ã©lÃ©ment mÃ©trique avec prÃ©fixe/suffixe.

**ParamÃ¨tres**:

- `value` (Number): Valeur numÃ©rique
- `options` (Object):
    - `prefix` (String): PrÃ©fixe (ex: 'â‚¬', '$')
    - `suffix` (String): Suffixe (ex: '/mÂ²', 'kg')
    - `icon` (String): Classe icÃ´ne FontAwesome
    - `className` (String): Classe CSS additionnelle

**Retourne**: HTML String

**Exemple**:

```javascript
const html = Templates.createMetricElement(89.5, {
    prefix: "â‚¬",
    suffix: "/nuit",
    icon: "fa-euro",
    className: "price-display",
});
// Retourne:
// <div class="gl-metric price-display">
//   <i class="fa fa-euro gl-metric__icon"></i>
//   <span class="gl-metric__prefix">â‚¬</span>
//   <span class="gl-metric__value">89.50</span>
//   <span class="gl-metric__suffix">/nuit</span>
// </div>
```

---

#### `createRatingElement(value, options)`

CrÃ©e un Ã©lÃ©ment de notation avec Ã©toiles.

**ParamÃ¨tres**:

- `value` (Number): Note (0-5)
- `options` (Object):
    - `max` (Number): Note maximale (dÃ©faut: 5)
    - `showValue` (Boolean): Afficher valeur numÃ©rique (dÃ©faut: true)
    - `className` (String): Classe CSS additionnelle

**Retourne**: HTML String

**Exemple**:

```javascript
const html = Templates.createRatingElement(4.5, { max: 5, showValue: true });
// Retourne:
// <div class="gl-rating">
//   <span class="gl-rating__stars">â˜…â˜…â˜…â˜…â˜†</span>
//   <span class="gl-rating__value">4.5/5</span>
// </div>
```

---

#### `createBadge(badge, options)`

CrÃ©e un badge visuel.

**ParamÃ¨tres**:

- `badge` (Object): `{ label, icon, color, tooltip }`
- `options` (Object):
    - `className` (String): Classe additionnelle
    - `style` (String): Style inline additionnel

**Retourne**: HTML String

**Exemple**:

```javascript
const html = Templates.createBadge(
    {
        label: "Restaurant",
        icon: "fa-utensils",
        color: "#e74c3c",
        tooltip: "CatÃ©gorie: Restaurants",
    },
    { className: "badge-large" }
);
```

---

### Assemblers API

#### `buildPopupHTML(poi, config, options)`

Construit le HTML complet d'un popup POI.

**ParamÃ¨tres**:

- `poi` (Object): DonnÃ©es POI normalisÃ©
- `config` (Array): Configuration `detailPopup` (tableau d'objets renderer)
- `options` (Object):
    - `context` (String): 'popup'
    - `resolveCategoryDisplay` (Boolean): RÃ©soudre labels taxonomie

**Retourne**: HTML String complet

**FonctionnalitÃ©s**:

- âœ… Tri des Ã©lÃ©ments par `order`
- âœ… Groupage automatique badges consÃ©cutifs
- âœ… Images hero en dehors du body
- âœ… Lien "Voir plus" automatique

**Exemple**:

```javascript
const popupConfig = [
    { type: "image", field: "photo", variant: "hero", order: 1 },
    { type: "badge", field: "categoryId", order: 2 },
    { type: "badge", field: "subCategoryId", order: 3 },
    { type: "text", field: "name", variant: "title", order: 4 },
    { type: "longtext", field: "description", order: 5 },
    { type: "rating", field: "rating", order: 6 },
];

const html = Assemblers.buildPopupHTML(poi, popupConfig, {
    context: "popup",
    resolveCategoryDisplay: true,
});
```

**Structure HTML gÃ©nÃ©rÃ©e**:

```html
<div class="gl-poi-popup">
    <img class="gl-poi-popup__hero" src="..." />
    <div class="gl-poi-popup__body">
        <div class="gl-poi-popup__badges">
            <span class="gl-badge">Restaurant</span>
            <span class="gl-badge">Italien</span>
        </div>
        <h3 class="gl-poi-popup__title">...</h3>
        <p class="gl-poi-popup__description">...</p>
        <div class="gl-rating">...</div>
        <a class="gl-poi-popup__link" data-poi-id="...">Voir plus >>></a>
    </div>
</div>
```

---

#### `buildTooltipHTML(poi, config, options)`

Construit le HTML/texte d'un tooltip POI.

**ParamÃ¨tres**:

- `poi` (Object): DonnÃ©es POI
- `config` (Array): Configuration `detailTooltip`
- `options` (Object): Options rendering

**Retourne**: String (HTML ou texte simple)

**FonctionnalitÃ©s**:

- âœ… Extraction valeurs textuelles
- âœ… RÃ©solution taxonomie pour badges
- âœ… Jointure avec `contentUnion`

**Exemple**:

```javascript
const tooltipConfig = [
    { type: "text", field: "name", order: 1 },
    { type: "badge", field: "categoryId", order: 2, contentUnion: "-" },
    { type: "number", field: "price", order: 3, contentUnion: "â€¢" },
];

const text = Assemblers.buildTooltipHTML(poi, tooltipConfig);
// Retourne: "Restaurant La Bonne Table - Restaurants â€¢ 45â‚¬"
```

---

#### `buildPanelItems(poi, config, options)`

Construit les items pour un panneau latÃ©ral POI.

**ParamÃ¨tres**:

- `poi` (Object): DonnÃ©es POI
- `config` (Array): Configuration `detailLayout`
- `options` (Object): Options rendering

**Retourne**: Array `[{ html, config, label, accordion, defaultOpen }, ...]`

**Exemple**:

```javascript
const panelConfig = [
    { type: "image", field: "photo", order: 1 },
    { type: "list", field: "services", label: "Services disponibles", accordion: true, order: 2 },
    {
        type: "table",
        field: "schedule",
        label: "Horaires d'ouverture",
        accordion: true,
        defaultOpen: true,
        order: 3,
    },
    { type: "coordinates", field: "coordinates", label: "CoordonnÃ©es GPS", order: 4 },
];

const items = Assemblers.buildPanelItems(poi, panelConfig, { context: "panel" });
// Retourne:
// [
//   { html: '<img...>', config: {...}, label: '', accordion: false, defaultOpen: true },
//   { html: '<ul>...</ul>', config: {...}, label: 'Services disponibles', accordion: true, defaultOpen: true },
//   { html: '<table>...</table>', config: {...}, label: 'Horaires...', accordion: true, defaultOpen: true },
//   { html: '<div>45.7578...</div>', config: {...}, label: 'CoordonnÃ©es GPS', accordion: false, defaultOpen: true }
// ]
```

---

### Content Builder API

#### `renderItem(poi, config, options)`

Dispatcher principal - route vers le renderer appropriÃ©.

**ParamÃ¨tres**:

- `poi` (Object): POI source
- `config` (Object): Configuration renderer `{ type, field, ...options }`
- `options` (Object): Options contextuelles

**Retourne**: HTML String

**Exemple**:

```javascript
const html = GeoLeaf._ContentBuilder.renderItem(
    poi,
    {
        type: "metric",
        field: "price",
        prefix: "â‚¬",
        suffix: "/nuit",
    },
    { context: "popup" }
);
```

---

## ðŸ’¡ Exemples d'utilisation

### Exemple 1: Popup Restaurant

```javascript
const poi = {
    id: "rest-001",
    attributes: {
        name: "La Bonne Table",
        categoryId: "restaurants",
        subCategoryId: "italian",
        description: "Restaurant italien authentique au cÅ“ur de la ville",
        photo: "https://example.com/photos/rest-001.jpg",
        rating: 4.5,
        price: 45,
        services: ["wifi", "terrasse", "parking"],
        schedule: {
            lundi: "12h-14h, 19h-22h",
            mardi: "12h-14h, 19h-22h",
        },
    },
};

const popupConfig = [
    { type: "image", field: "attributes.photo", variant: "hero", order: 1 },
    { type: "badge", field: "attributes.categoryId", order: 2 },
    { type: "badge", field: "attributes.subCategoryId", order: 3 },
    { type: "text", field: "attributes.name", variant: "title", icon: "fa-utensils", order: 4 },
    { type: "longtext", field: "attributes.description", order: 5 },
    { type: "rating", field: "attributes.rating", order: 6 },
    { type: "metric", field: "attributes.price", prefix: "â‚¬", suffix: "/pers", order: 7 },
    { type: "tags", field: "attributes.services", order: 8 },
];

const html = GeoLeaf._ContentBuilder.buildPopupHTML(poi, popupConfig, {
    context: "popup",
    resolveCategoryDisplay: true,
});
```

---

### Exemple 2: Tooltip Simple

```javascript
const tooltipConfig = [
    { type: "text", field: "attributes.name", order: 1 },
    { type: "badge", field: "attributes.categoryId", order: 2, contentUnion: "â€¢" },
    { type: "rating", field: "attributes.rating", order: 3, contentUnion: "-" },
];

const tooltipText = GeoLeaf._ContentBuilder.buildTooltipHTML(poi, tooltipConfig);
// Retourne: "La Bonne Table â€¢ Restaurants - â˜…â˜…â˜…â˜…â˜† 4.5/5"
```

---

### Exemple 3: Panel DÃ©taillÃ©

```javascript
const panelConfig = [
    { type: "image", field: "attributes.photo", order: 1 },
    { type: "text", field: "attributes.name", variant: "title", order: 2 },
    { type: "rating", field: "attributes.rating", order: 3 },
    { type: "longtext", field: "attributes.description", order: 4 },
    { type: "list", field: "attributes.services", label: "Services", accordion: true, order: 5 },
    {
        type: "table",
        field: "attributes.schedule",
        label: "Horaires",
        accordion: true,
        defaultOpen: true,
        order: 6,
    },
    { type: "coordinates", label: "Localisation", order: 7 },
];

const items = GeoLeaf._ContentBuilder.buildPanelItems(poi, panelConfig, {
    context: "panel",
});

// Construire le panneau
items.forEach((item) => {
    if (item.accordion) {
        // CrÃ©er section accordÃ©on
    } else {
        // Afficher directement
    }
});
```

---

### Exemple 4: Utilisation Directe des Modules

```javascript
// Utiliser Core pour validation
const Core = GeoLeaf._ContentBuilder.Core;
const imageUrl = Core.validateImageUrl(poi, "attributes.photo", {
    defaultImage: "/images/placeholder.jpg",
});

// Utiliser Templates pour gÃ©nÃ©ration HTML
const Templates = GeoLeaf._ContentBuilder.Templates;
const metricHtml = Templates.createMetricElement(poi.attributes.price, {
    prefix: "â‚¬",
    suffix: "/pers",
    icon: "fa-euro",
});

// Utiliser renderer directement
const ratingHtml = GeoLeaf._ContentBuilder.renderRating(
    poi,
    {
        type: "rating",
        field: "attributes.rating",
        showValue: true,
    },
    { context: "popup" }
);
```

---

## ðŸ”„ Migration depuis v0.9

### Changements Majeurs

**v0.9** (Architecture monolithique):

- 1 fichier: `content-builder.js` (899 lignes)
- Code dupliquÃ© (helpers, validators)
- Pas de sÃ©paration templates/renderers

**v1.0** (Architecture modulaire):

- 4 fichiers: core, templates, assemblers, content-builder
- Helpers centralisÃ©s
- Templates rÃ©utilisables
- -246 lignes (-27.4%)

### Guide de Migration

#### 1. Imports (si utilisation directe)

**Avant (v0.9)**:

```javascript
// Tout dans GeoLeaf._ContentBuilder
const builder = GeoLeaf._ContentBuilder;
builder.buildPopupHTML(poi, config);
```

**AprÃ¨s (v1.0)**:

```javascript
// AccÃ¨s modules spÃ©cialisÃ©s
const Core = GeoLeaf._ContentBuilder.Core;
const Templates = GeoLeaf._ContentBuilder.Templates;
const Assemblers = GeoLeaf._ContentBuilder.Assemblers;

// OU via orchestrateur (recommandÃ©)
GeoLeaf._ContentBuilder.buildPopupHTML(poi, config);
```

#### 2. Helpers

**Avant**:

```javascript
// Helpers inline dans content-builder.js
function escapeHtml(str) {
    /* ... */
}
function resolveField(poi, path) {
    /* ... */
}
```

**AprÃ¨s**:

```javascript
// Via Core module
const Core = GeoLeaf._ContentBuilder.Core;
const escapeHtml = Core.getEscapeHtml();
const resolveField = Core.getResolveField();
```

#### 3. Templates

**Avant**:

```javascript
// Templates inline dans renderers
function renderMetric() {
    return '<div class="metric">...</div>';
}
```

**AprÃ¨s**:

```javascript
// Via Templates module
const Templates = GeoLeaf._ContentBuilder.Templates;
const html = Templates.createMetricElement(value, options);
```

#### 4. Badge Resolution

**Avant (v0.9)**:

```javascript
// 61 lignes de logique inline dans renderBadge
function renderBadge(poi, config) {
    // Taxonomie resolution...
    // StyleRules resolution...
    // Template generation...
}
```

**AprÃ¨s (v1.0)**:

```javascript
// Core.resolveBadge + Templates.createBadge
const Core = GeoLeaf._ContentBuilder.Core;
const Templates = GeoLeaf._ContentBuilder.Templates;

const badge = Core.resolveBadge(poi, config, options);
const html = Templates.createBadge(badge);
```

### RÃ©trocompatibilitÃ©

âœ… **100% rÃ©trocompatible** : Toutes les APIs publiques sont maintenues.

Les appels suivants fonctionnent identiquement en v0.9 et v1.0:

```javascript
GeoLeaf._ContentBuilder.buildPopupHTML(poi, config);
GeoLeaf._ContentBuilder.buildTooltipHTML(poi, config);
GeoLeaf._ContentBuilder.buildPanelItems(poi, config);
GeoLeaf._ContentBuilder.renderItem(poi, config);
```

âš ï¸ **Fallbacks dÃ©fensifs**: Si modules Core/Templates/Assemblers non chargÃ©s, le code utilise des fallbacks inline.

---

## âœ… Best Practices

### 1. Utiliser les APIs Publiques

âœ… **RECOMMANDÃ‰**:

```javascript
// Via orchestrateur
GeoLeaf._ContentBuilder.buildPopupHTML(poi, config);

// Via modules spÃ©cialisÃ©s
const Core = GeoLeaf._ContentBuilder.Core;
Core.validateImageUrl(poi, "photo");
```

âŒ **Ã€ Ã‰VITER**:

```javascript
// AccÃ¨s direct aux fonctions internes
GeoLeaf._ContentBuilder._internalHelper(); // Peut changer
```

### 2. Valider les DonnÃ©es

âœ… **RECOMMANDÃ‰**:

```javascript
const Core = GeoLeaf._ContentBuilder.Core;

// Valider image URL
const imageUrl = Core.validateImageUrl(poi, "photo", {
    defaultImage: "/images/default.jpg",
});

// Valider coordonnÃ©es
const coords = Core.validateCoordinates(poi, "coordinates");
```

### 3. RÃ©utiliser les Templates

âœ… **RECOMMANDÃ‰**:

```javascript
const Templates = GeoLeaf._ContentBuilder.Templates;

// RÃ©utiliser templates existants
const metricHtml = Templates.createMetricElement(42, { prefix: "â‚¬" });
const ratingHtml = Templates.createRatingElement(4.5);
```

âŒ **Ã€ Ã‰VITER**:

```javascript
// RecrÃ©er HTML manuellement
const html = '<div class="metric">â‚¬ 42</div>'; // Pas de BEM, pas de classes CSS
```

### 4. Trier les Configs par Order

âœ… **RECOMMANDÃ‰**:

```javascript
const config = [
    { type: "image", field: "photo", variant: "hero", order: 1 },
    { type: "badge", field: "category", order: 2 },
    { type: "text", field: "name", variant: "title", order: 3 },
];
// Assemblers.buildPopupHTML trie automatiquement par order
```

### 5. Grouper les Badges

âœ… **RECOMMANDÃ‰**:

```javascript
// Mettre badges consÃ©cutifs pour auto-groupage
const config = [
    { type: "badge", field: "categoryId", order: 2 },
    { type: "badge", field: "subCategoryId", order: 3 },
    // Autres Ã©lÃ©ments aprÃ¨s
];
// buildPopupHTML groupe automatiquement dans <div class="gl-poi-popup__badges">
```

### 6. Utiliser ContentUnion pour Tooltips

âœ… **RECOMMANDÃ‰**:

```javascript
const tooltipConfig = [
    { type: "text", field: "name", order: 1 },
    { type: "badge", field: "category", order: 2, contentUnion: "â€¢" },
    { type: "rating", field: "rating", order: 3, contentUnion: "-" },
];
// buildTooltipHTML joint avec contentUnion: "Name â€¢ Category - â˜…â˜…â˜…â˜…â˜†"
```

---

## ðŸ› Troubleshooting

### ProblÃ¨me: Modules non chargÃ©s

**SymptÃ´me**: `Cannot read property 'Core' of undefined`

**Solution**:

```javascript
// VÃ©rifier ordre de chargement dans bundle-entry.js
("ui/content-builder/core.js", // 1. AVANT
    "ui/content-builder/templates.js", // 2. AVANT
    "ui/content-builder/assemblers.js", // 3. AVANT
    "ui/content-builder.js"); // 4. APRÃˆS
```

---

### ProblÃ¨me: Badge non rÃ©solu

**SymptÃ´me**: Badge affiche ID au lieu du label

**Solution**:

```javascript
// Activer resolveCategoryDisplay
const html = Assemblers.buildPopupHTML(poi, config, {
    context: "popup",
    resolveCategoryDisplay: true, // â† Important
});
```

---

### ProblÃ¨me: Image non affichÃ©e

**SymptÃ´me**: Image cassÃ©e ou placeholder

**Solution**:

```javascript
// Utiliser validateImageUrl avec defaultImage
const Core = GeoLeaf._ContentBuilder.Core;
const imageUrl = Core.validateImageUrl(poi, "attributes.photo", {
    defaultImage: "/images/placeholder.jpg",
    allowedPatterns: [/^https?:\/\//, /^\/images\//],
});
```

---

### ProblÃ¨me: Popup vide

**SymptÃ´me**: Popup affiche uniquement "Voir plus"

**Causes possibles**:

1. Config vide ou invalide
2. Champs POI inexistants
3. Order non dÃ©fini

**Solution**:

```javascript
// VÃ©rifier config
console.log("Config:", config);
console.log("POI:", poi);

// Valider order
config.forEach((item) => {
    if (typeof item.order !== "number") {
        console.warn("Item sans order:", item);
    }
});
```

---

### ProblÃ¨me: Performance dÃ©gradÃ©e

**SymptÃ´me**: Popups lents Ã  gÃ©nÃ©rer

**Solutions**:

1. **Cache badge resolver**: Core.resolveBadge utilise un cache interne
2. **Limiter Ã©lÃ©ments**: Ne mettre que l'essentiel dans detailPopup
3. **Lazy loading images**: Utiliser `loading="lazy"` sur images

---

## ðŸ“š Ressources

### Documentation ComplÃ©mentaire

- [SPRINT_4_5_COMPLETION_REPORT.md](../../../SPRINT_4_5_COMPLETION_REPORT.md) - Rapport Sprint 4.5
- [CONTENT_BUILDER_MODULES_ARCHITECTURE.md](../../../CONTENT_BUILDER_MODULES_ARCHITECTURE.md) - Architecture dÃ©taillÃ©e
- [Developer Guide](../../DEVELOPER_GUIDE.md) - Guide dÃ©veloppeur GeoLeaf
- [Architecture](../../ARCHITECTURE_GUIDE.md) - Architecture globale

### Fichiers Source

- [core.js](../../../src/modules/ui/content-builder/core.js) - Module Core (316 lignes)
- [templates.js](../../../src/modules/ui/content-builder/templates.js) - Module Templates (351 lignes)
- [assemblers.js](../../../src/modules/ui/content-builder/assemblers.js) - Module Assemblers (361 lignes)
- [content-builder.js](../../../src/modules/ui/content-builder.js) - Orchestrateur (653 lignes)

### Tests

- Smoke test: `npm test`
- Tests manuels: Fichiers `test-*.html` dans `/tests/`

---

## ðŸ“ Changelog

### v1.0.0 (18 janvier 2026) - Sprint 4.5

**âœ¨ Features:**

- âœ… Architecture modulaire 4 fichiers (core, templates, assemblers, orchestrator)
- âœ… Core module: helpers, validators, badge resolver, formatters
- âœ… Templates module: 14 template builders + CSS_CLASSES library
- âœ… Assemblers module: buildPopupHTML, buildTooltipHTML, buildPanelItems
- âœ… Fallbacks dÃ©fensifs pour rÃ©trocompatibilitÃ© 100%

**ðŸ“‰ Refactoring:**

- âœ… RÃ©duction -246 lignes (-27.4% depuis 899)
- âœ… Ã‰limination duplication helpers (37 lignes Ã©conomisÃ©es)
- âœ… renderBadge: 61â†’21 lignes (badge resolver externalisÃ©)
- âœ… renderImage: 24â†’16 lignes (validateImageUrl externalisÃ©)

**ðŸ“š Documentation:**

- âœ… SPRINT_4_5_COMPLETION_REPORT.md
- âœ… CONTENT_BUILDER_MODULES_ARCHITECTURE.md
- âœ… README.md (ce document)
- âœ… JSDoc inline dans tous modules

**ðŸ·ï¸ Tags Git:**

- `sprint-4.5-start` (2706f51)
- `sprint-4.5-complete` (456ddc0)

---

### v0.9.0 (Avant Sprint 4.5)

**Ã‰tat initial:**

- 1 fichier monolithique: content-builder.js (899 lignes)
- Code dupliquÃ© (69 lignes helpers)
- Templates inline
- Badge resolution 61 lignes inline

---

**Version**: 4.0.0  
**DerniÃ¨re mise Ã  jour**: 18 janvier 2026  
**Auteur**: GitHub Copilot + Audit 2026 Team  
**Licence**: MIT (identique au projet GeoLeaf)

**Status**: âœ… **DOCUMENTATION COMPLÃˆTE**
