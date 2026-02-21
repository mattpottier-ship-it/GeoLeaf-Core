# GeoLeaf.UI.Controls â€“ Documentation

Product Version: GeoLeaf Platform V1  
Module de contrÃ´les Leaflet personnalisÃ©s.

**Version**: 4.0.0  
**Fichier**: `src/modules/ui/controls.js` (165 lignes)  
**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025

---

## Vue d'ensemble

Le module Controls gÃ¨re les contrÃ´les personnalisÃ©s Leaflet ajoutÃ©s Ã  la carte.

---

## ContrÃ´les disponibles

### Fullscreen Control

Active/dÃ©sactive le mode plein Ã©cran de la carte.

**Configuration**:

```json
{
    "ui": {
        "fullscreen": {
            "enabled": true,
            "position": "topleft"
        }
    }
}
```

**API navigateur utilisÃ©e**: `element.requestFullscreen()` / `document.exitFullscreen()`

---

## IntÃ©gration

Les contrÃ´les sont automatiquement ajoutÃ©s lors de `GeoLeaf.Core.init()` si activÃ©s dans la configuration.

---

## RÃ©fÃ©rences

- **Code source**: `src/modules/ui/controls.js`
- **Phase 4 Refactoring**: `SPRINT4_SUMMARY.md`

---

**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025  
**Auteur**: Ã‰quipe GeoLeaf  
**Version GeoLeaf**: 2.1.0
