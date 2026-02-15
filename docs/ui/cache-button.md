# GeoLeaf UI - Cache Button

**Date de création**: Décembre 2025  
**Dernière vérification**: 19 janvier 2026

---

## Description

Module de bouton Leaflet qui affiche la gestion du cache hors ligne dans un modal élégant.

## Fonctionnalités

- **Bouton Leaflet** : Positionné en `topleft`, entre le bouton plein écran et le bouton de géolocalisation
- **Icône** : Flèches circulaires de rafraîchissement (icône standard de cache/sync)
- **Modal** : Affiche le contenu du cache control dans une fenêtre modale centrée
- **Design** : Header avec gradient violet, fermeture avec `Escape` ou clic sur l'overlay

## Configuration

### geoleaf.config.json

```json
{
  "ui": {
    "showCacheButton": true  // Par défaut true
  }
}
```

## Utilisation

### Initialisation automatique

Le bouton est automatiquement initialisé dans `demo.js` si activé dans la configuration :

```javascript
GeoLeaf.UI.CacheButton.init(map, cfg);
```

### Ouverture programmatique

```javascript
// Ouvrir le modal
GeoLeaf.UI.CacheButton.openModal();

// Fermer le modal
GeoLeaf.UI.CacheButton.closeModal();
```

## Structure du modal

```html
<div id="gl-cache-modal" class="gl-cache-modal">
    <div class="gl-cache-modal__overlay"></div>
    <div class="gl-cache-modal__content">
        <div class="gl-cache-modal__header">
            <h2 class="gl-cache-modal__title">💾 Gestion du Cache Hors Ligne</h2>
            <button class="gl-cache-modal__close">✕</button>
        </div>
        <div id="gl-cache-modal-body" class="gl-cache-modal__body">
            <!-- Contenu du cache control injecté ici -->
        </div>
    </div>
</div>
```

## Styles

### Bouton Leaflet

```css
.leaflet-control-cache-button {
    margin-top: 0 !important;
}

.leaflet-control-cache-button a {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### Modal

- **Overlay** : Fond noir avec transparence et blur
- **Contenu** : Carte blanche arrondie, max-width 800px
- **Header** : Gradient violet (667eea → 764ba2)
- **Animation** : Fade-in avec scale

## Positionnement du bouton

Le bouton est positionné dans la barre Leaflet `topleft`, entre :
- **Au-dessus** : Bouton plein écran
- **En-dessous** : Bouton de géolocalisation

L'ordre est contrôlé par l'ordre d'ajout des contrôles dans `demo.js`.

## Événements

### Fermeture du modal

- Clic sur le bouton `✕`
- Clic sur l'overlay (zone grise)
- Touche `Escape`

### Initialisation du contenu

Le cache control est initialisé au premier clic sur le bouton. Les clics suivants réutilisent le contenu déjà créé et mettent à jour le statut.

## Architecture

```
src/static/js/ui/cache-button.js          # Module JavaScript
src/static/css/cache-modal.css            # Styles du modal
```

### Dépendances

- Leaflet.js (L.Control)
- GeoLeaf.Storage.CacheControl (pour le contenu)
- GeoLeaf.Log (optionnel, pour les logs)

## API

### GeoLeaf.UI.CacheButton

#### Methods

- **`init(map, cfg)`** : Initialise et ajoute le bouton à la carte
  - `map` : Instance Leaflet map
  - `cfg` : Configuration GeoLeaf
  - Returns : `L.Control` ou `null`

- **`openModal()`** : Ouvre le modal de cache
  - Crée le modal s'il n'existe pas
  - Initialise le cache control au premier appel
  - Affiche le modal avec animation

- **`closeModal()`** : Ferme le modal
  - Masque le modal (ne le détruit pas)
  - Le contenu est préservé pour les ouvertures suivantes

## Exemples

### Désactiver le bouton

```json
{
  "ui": {
    "showCacheButton": false
  }
}
```

### Ouvrir le modal via console

```javascript
// Dans la console du navigateur
GeoLeaf.UI.CacheButton.openModal();
```

### Vérifier si le module est chargé

```javascript
if (GeoLeaf.UI && GeoLeaf.UI.CacheButton) {
    console.log("Cache Button module disponible");
}
```

## Notes techniques

### Réutilisation du cache control

Le cache control est créé **une seule fois** lors du premier clic. Les clics suivants affichent simplement le modal avec le contenu déjà initialisé.

### Isolation du header

Le header du cache control (titre + bouton collapse) est masqué car le modal a son propre header. Seul le body du cache control est affiché.

### Structure DOM

Le modal est ajouté à `document.body` au premier appel de `openModal()`. Il persiste ensuite et est simplement affiché/masqué via `display: flex` / `display: none`.

## Responsive

- Mobile : Modal prend 95% de la largeur et hauteur
- Desktop : Modal prend 90% max, largeur max 800px
- Padding réduit sur mobile (16px vs 24px)

## Accessibilité

- Attributs ARIA sur le bouton
- Fermeture au clavier (`Escape`)
- Focus trap dans le modal (recommandé)
- Contraste des couleurs respecté
