# GeoLeaf.UI.PanelBuilder â€“ Documentation

Product Version: GeoLeaf Platform V1  
Module de construction de panneaux de dÃ©tails POI avec layouts configurables.

**Version**: 4.0.0  
**Fichier**: `src/modules/ui/panel-builder.js` (485 lignes)  
**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025

---

## Vue d'ensemble

Le **PanelBuilder** a Ã©tÃ© extrait de `geoleaf.ui.js` durant la **Phase 4** pour dÃ©coupler la logique de construction de panneaux UI. Il permet de gÃ©nÃ©rer dynamiquement du HTML pour les panneaux latÃ©raux POI selon des **layouts configurables** dÃ©finis dans les profils.

---

## API publique

### `buildPoiSidePanel(poiData, customLayout)`

Construit le HTML complet d'un panneau latÃ©ral POI.

**ParamÃ¨tres**:
| ParamÃ¨tre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `poiData` | object | âœ… Oui | DonnÃ©es du POI |
| `customLayout` | array | Non | Layout personnalisÃ© (dÃ©faut: depuis profil) |

**Retour**: `string` - HTML du panneau

**Exemple**:

```javascript
const poi = GeoLeaf.POI.getPoiById("restaurant-123");
const panelHTML = GeoLeaf.UI.PanelBuilder.buildPoiSidePanel(poi);
document.getElementById("sidepanel").innerHTML = panelHTML;
```

---

## Format Layout

### Types de champs supportÃ©s

| Type        | Description                | Attributs                          |
| ----------- | -------------------------- | ---------------------------------- |
| `title`     | Titre principal (H2)       | `field`, `prefix`                  |
| `subtitle`  | Sous-titre (H3)            | `field`                            |
| `text`      | Texte simple               | `field`, `label`, `icon`           |
| `paragraph` | Paragraphe long            | `field`                            |
| `rating`    | Ã‰toiles (â˜…â˜…â˜…â˜…â˜†) | `field`, `maxStars`                |
| `image`     | Image                      | `field`, `fullWidth`, `alt`        |
| `gallery`   | Galerie d'images           | `field`, `columns`                 |
| `link`      | Lien hypertexte            | `field`, `label`, `icon`           |
| `phone`     | Lien tÃ©lÃ©phone         | `field`, `icon`                    |
| `email`     | Lien email                 | `field`, `icon`                    |
| `address`   | Adresse formatÃ©e         | `field`                            |
| `badge`     | Badge colorÃ©             | `field`, `color`                   |
| `tags`      | Liste de tags              | `field`                            |
| `section`   | Section groupÃ©e          | `title`, `fields[]`                |
| `accordion` | Section repliable          | `title`, `fields[]`, `defaultOpen` |
| `divider`   | SÃ©parateur               | -                                  |
| `html`      | HTML brut                  | `content`                          |

### Structure Layout

```json
[
    { "field": "attributes.mainImage", "type": "image", "fullWidth": true },
    { "field": "label", "type": "title" },
    { "field": "attributes.rating", "type": "rating", "maxStars": 5 },
    {
        "type": "section",
        "title": "Contact",
        "fields": [
            { "field": "attributes.phone", "type": "phone", "icon": "phone" },
            { "field": "attributes.email", "type": "email", "icon": "envelope" }
        ]
    },
    { "field": "attributes.gallery", "type": "gallery", "columns": 3 }
]
```

---

## RÃ©solution de champs

### `resolveField(poi, fieldPath)`

RÃ©sout un chemin avec notation point (ex: `"attributes.shortDescription"`).

**Exemple**:

```javascript
const value = GeoLeaf.UI.PanelBuilder.resolveField(poi, "attributes.rating");
// Ã‰quivalent Ã : poi.attributes?.rating
```

---

## RÃ©fÃ©rences

- **Code source**: `src/modules/ui/panel-builder.js`
- **Phase 4 Refactoring**: `SPRINT4_SUMMARY.md`
- **Module POI**: `docs/poi/GeoLeaf_POI_README.md`

---

**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025  
**Auteur**: Ã‰quipe GeoLeaf  
**Version GeoLeaf**: 2.1.0
