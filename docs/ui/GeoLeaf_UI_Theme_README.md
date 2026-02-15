# GeoLeaf.UI.Theme â€“ Documentation

Module de gestion des thÃ¨mes (light, dark, auto).

**Version**: 3.2.0  
**Fichier**: `src/static/js/ui/theme.js` (250 lignes)  
**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025

---

## API publique

### `applyTheme(theme)`

Applique un thÃ¨me Ã  la carte et Ã  l'interface.

**ParamÃ¨tres**:
| ParamÃ¨tre | Type | Valeurs | Description |
|-----------|------|---------|-------------|
| `theme` | string | `'light'`, `'dark'`, `'auto'` | ThÃ¨me Ã  appliquer |

**Comportement**:
- Ajoute classe CSS correspondante au body
- Met Ã  jour les couches baselayers Leaflet
- Persiste le choix dans localStorage
- Ã‰met Ã©vÃ©nement `themeChanged`

**Exemple**:
```javascript
GeoLeaf.UI.Theme.applyTheme('dark');
```

### `getCurrentTheme()`

Retourne le thÃ¨me actuellement actif.

**Retour**: `string` - `'light'`, `'dark'` ou `'auto'`

### `detectSystemTheme()`

DÃ©tecte la prÃ©fÃ©rence systÃ¨me de l'utilisateur.

**Retour**: `string` - `'light'` ou `'dark'`

**Exemple**:
```javascript
const systemPreference = GeoLeaf.UI.Theme.detectSystemTheme();
if (systemPreference === 'dark') {
    GeoLeaf.UI.Theme.applyTheme('dark');
}
```

---

## Persistance

Le thÃ¨me choisi est sauvegardÃ© dans `localStorage` :
```javascript
localStorage.getItem('geoleaf-theme') // 'light', 'dark', 'auto'
```

---

## RÃ©fÃ©rences

- **Code source**: `src/static/js/ui/theme.js`
- **Phase 4 Refactoring**: `SPRINT4_SUMMARY.md`

---

**DerniÃ¨re mise Ã  jour**: DÃ©cembre 2, 2025  
**Auteur**: Ã‰quipe GeoLeaf  
**Version GeoLeaf**: 2.1.0
