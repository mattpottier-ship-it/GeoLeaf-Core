# INSTRUCTIONS DE TEST - Vérification des Popups

## Étape 1: Préparer l'Environnement

1. Assurez-vous que le projet GeoLeaf est chargé
2. Ouvrir la démo: `demo/index.html`
3. Ouvrir les Developer Tools (F12 → Console)

## Étape 2: Charger la Démo

La démo charge automatiquement:
- Le profil tourisme par défaut
- Les couches POI (tourism_poi_all)
- Les itinéraires (tourism_itineraries)
- Les logs de debug

## Étape 3: Tester les POIs

### Test Popup POI

1. **Zoomer** sur la carte pour voir les marqueurs POIs
2. **Cliquer** sur un marqueur POI
3. **Vérifier** que le popup s'affiche avec:
   - ✓ Image héro (photo du POI)
   - ✓ Titre (nom du POI)
   - ✓ Description
   - ✓ Badge catégorie
   - ✓ Note/Rating (si disponible)
   - ✓ Lien "Voir plus >>>"

4. **Console logs** attendus:
   ```
   [POI Popup DEBUG] POI structure: {...}
   [POI Popup DEBUG] Config detailPopup found in _layerConfig: 5 items
   [Assemblers DEBUG] buildPopupHTML called with: {...}
   [Assemblers DEBUG] Item 0: type=image, field=attributes.photo, rendered=YES
   [Assemblers DEBUG] Item 1: type=text, field=title, rendered=YES
   ```

### Test Tooltip POI

1. **Passer le curseur** sur un marqueur POI sans cliquer
2. **Vérifier** que le tooltip s'affiche avec le titre du POI
3. **Cliquer** sur le POI pour confirmer que le popup remplace le tooltip

## Étape 4: Tester les Itinéraires

### Test Popup Itinéraire

1. **Zoomer** pour voir les lignes itinéraires
2. **Cliquer** sur une ligne d'itinéraire
3. **Vérifier** que le popup s'affiche avec:
   - ✓ Titre de l'itinéraire
   - ✓ Description
   - ✓ Photo (si disponible)
   - ✓ Lien "Voir plus >>>"

4. **Console logs** attendus:
   ```
   [Route Popup Builder] Popup opened for route: itinerary_...
   [Assemblers DEBUG] buildPopupHTML called with: {...}
   ```

### Test Panel Latéral Itinéraire

1. Dans un popup d'itinéraire, **cliquer** sur "Voir plus >>>"
2. **Vérifier** que le panel latéral s'ouvre avec:
   - ✓ Titre de l'itinéraire
   - ✓ Description complète
   - ✓ Galerie photos
   - ✓ Informations (distance, durée, difficulté)
   - ✓ Tags

## Étape 5: Diagnostic - En Cas de Problème

### Si le popup est vide

**Dans la console**, chercher:
```javascript
// Vérifier que la config est trouvée
console.log(GeoLeaf.POI.getAllPois()[0]._layerConfig.popup);
// Doit afficher: { enabled: true, detailPopup: [...] }
```

### Si les champs ne s'affichent pas

1. **Activer debug maximal** dans la console:
```javascript
window.__GEOLEAF_DEBUG_POPUP__ = true;
window.__GEOLEAF_DEBUG_PROFILE_LOGGED__ = false; // Reset
```

2. **Cliquer** à nouveau sur un POI

3. **Regarder les logs**:
   - `Item X: type=..., field=..., rendered=YES/EMPTY`
   - Si `rendered=EMPTY`, le champ n'a pas pu être résolu

### Si la config n'est pas trouvée

Exécuter dans la console:
```javascript
// Vérifier la structure du POI
const poi = GeoLeaf.POI.getAllPois()[0];
console.log('POI structure:', {
    id: poi.id,
    title: poi.title,
    hasLayerConfig: !!poi._layerConfig,
    hasPopupConfig: !!poi._layerConfig?.popup,
    hasDetailPopup: !!poi._layerConfig?.popup?.detailPopup,
    configLength: poi._layerConfig?.popup?.detailPopup?.length
});

// Vérifier le profil actif
const profile = GeoLeaf.Config.getActiveProfile();
console.log('Profile popup config:', !!profile.popup);
```

## Étape 6: Valider la Conversion Format

Exécuter le test de validation dans la console:
```bash
# Charger le script de test
var script = document.createElement('script');
script.src = 'popup-test.js';
document.body.appendChild(script);
```

Expected output:
```
[POPUP TEST] ✅ SUCCÈS: La conversion fonctionne correctement!
[POPUP TEST] Items de config: image (attributes.photo), text (title), text (description), badge (attributes.categoryId), rating (attributes.reviews.rating)
```

## Étape 7: Désactiver le Debug (Optionnel)

Pour réduire la verbosité de la console:
1. Commenter la ligne dans `demo/index.html`:
   ```html
   <!-- <script src="popup-debug.js"></script> -->
   ```

2. Ou exécuter dans la console:
   ```javascript
   window.__GEOLEAF_DEBUG_POPUP__ = false;
   ```

## Checklist de Validation

- [ ] POI popup affiche image, titre, description
- [ ] POI tooltip affiche titre au survol
- [ ] POI popup "Voir plus" ouvre le panel latéral
- [ ] Itinéraire popup affiche titre, description
- [ ] Itinéraire "Voir plus" ouvre le panel avec tous les détails
- [ ] Logs de debug apparaissent dans la console
- [ ] Aucune erreur JavaScript dans la console
- [ ] La conversion format ancien→nouveau apparaît dans les logs

## Notes

- La correction s'applique **automatiquement** à tous les profils (tourism, etc.)
- Les logs de debug n'ont aucun impact sur la performance en production
- La conversion format est **rétro-compatible** avec les anciens fichiers JSON
- Les données s'affichent correctement une fois la conversion appliquée

## Contacts pour Support

Si les popups restent vides:
1. Vérifier que les données POI existent dans le fichier source (ex: data/tourism_poi_all.json)
2. Vérifier que la configuration de couche a bien `popup.fields` rempli
3. Consulter la console pour les logs de diagnostic
4. Vérifier que `layer-config-manager.js` effectue bien la conversion

