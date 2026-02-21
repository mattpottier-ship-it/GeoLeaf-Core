# GeoLeaf.UI.Notifications – Système de Notifications Toast

Product Version: GeoLeaf Platform V1  
**Dernière mise à jour :** 23 janvier 2026  
**Version :** 4.4.1  
**Module :** `ui/notifications.js`

Le module **GeoLeaf.UI.Notifications** gère l'affichage de notifications toast non-intrusives avec système de **queue prioritaire** et intégration **Telemetry**.

---

## 📦 Architecture

### Caractéristiques principales

- ✅ **Queue prioritaire** : errors > warnings > info/success
- ✅ **Compteurs séparés** : 3 toasts temporaires + 2 persistants
- ✅ **Animations fluides** : Réorganisation automatique lors de priorités
- ✅ **Intégration Telemetry** : Métriques trackées automatiquement
- ✅ **Buffer de démarrage** : Métriques buffered pendant 30s
- ✅ **Accessibilité** : `aria-live="assertive"` pour errors
- ✅ **Support options avancées** : `persistent`, `action`, `icon`

### Gestion de la queue

**Limite** : 15 notifications max en attente
**Éviction** : Les moins prioritaires sont droppées

**Priorités** :
- `ERROR` = 3 (haute)
- `WARNING` = 2 (moyenne)  
- `SUCCESS` / `INFO` = 1 (basse)

---

## 📚 API Publique

### API Raccourcis (Recommandé)

```javascript
// Notification de succès
GeoLeaf.UI.Notifications.success("Sauvegarde réussie", 3000);
GeoLeaf.UI.Notifications.success("Profil téléchargé", { duration: 4000 });

// Notification d'erreur  
GeoLeaf.UI.Notifications.error("Erreur réseau", 5000);
GeoLeaf.UI.Notifications.error("Échec connexion", { duration: 5000, persistent: true });

// Notification d'avertissement
GeoLeaf.UI.Notifications.warning("Connexion instable", 4000);

// Notification d'information
GeoLeaf.UI.Notifications.info("Synchronisation en cours", 3000);
GeoLeaf.UI.Notifications.info("Téléchargement...", { persistent: true, dismissible: false });
```

### API Générique (Flexible)

```javascript
// Signature positionnelle
GeoLeaf.UI.Notifications.show("Message", "success", 3000);

// Signature objet (avec options avancées)
GeoLeaf.UI.Notifications.show("Message", {
  type: "success",           // "success" | "error" | "warning" | "info"
  duration: 3000,            // Durée en ms
  persistent: false,         // Toast persistant (pas d'auto-dismiss)
  dismissible: true,         // Bouton de fermeture
  icon: "✓",                 // Icône personnalisée (futur)
  action: {                  // Bouton action (futur)
    label: "Annuler",
    callback: () => {}
  }
});
```

### API Gestion

```javascript
// Effacer toutes les notifications
GeoLeaf.UI.Notifications.clearAll();

// Désactiver temporairement
GeoLeaf.UI.Notifications.disable();

// Réactiver
GeoLeaf.UI.Notifications.enable();

// Obtenir le statut
const status = GeoLeaf.UI.Notifications.getStatus();
// {
//   enabled: true,
//   initialized: true,
//   activeToasts: 2,
//   temporaryToasts: 2,
//   persistentToasts: 0,
//   queued: 3,
//   maxVisible: 3,
//   maxPersistent: 2,
//   position: "bottom-center",
//   telemetryAvailable: true,
//   metricsBuffered: 0
// }
```

### Raccourcis Globaux

```javascript
// Équivalents directs (rétrocompatibilité)
GeoLeaf.UI.showSuccess("Message", 3000);
GeoLeaf.UI.showError("Message", 5000);
GeoLeaf.UI.showWarning("Message", 4000);
GeoLeaf.UI.showInfo("Message", 3000);
GeoLeaf.UI.showNotification("Message", "success", 3000);
GeoLeaf.UI.clearNotifications();
```

---

## 🎨 Configuration

### Initialisation

```javascript
GeoLeaf._UINotifications.init({
  container: '#gl-notifications',      // Sélecteur conteneur DOM
  position: 'bottom-center',           // Position ('bottom-center', 'top-right', etc.)
  maxVisible: 3,                       // Max toasts temporaires visibles
  animations: true,                    // Activer animations
  durations: {                         // Durées par défaut (ms)
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
  }
});
```

### Positions disponibles

- `bottom-center` (défaut, recommandé)
- `top-right`
- `bottom-right`
- `top-center`

### Container HTML requis

```html
<div id="gl-notifications" class="gl-notifications gl-notifications--bottom-center"></div>
```

---

## 📊 Intégration Telemetry

### Métriques trackées automatiquement

Le système enregistre les métriques suivantes via `GeoLeaf.Storage.Telemetry` :

| Métrique | Description | Type |
|----------|-------------|------|
| `notification.shown.success` | Toasts succès affichés | Counter |
| `notification.shown.error` | Toasts error affichés | Counter |
| `notification.shown.warning` | Toasts warning affichés | Counter |
| `notification.shown.info` | Toasts info affichés | Counter |
| `notification.dismissed.manual` | Fermeture manuelle (clic X) | Counter |
| `notification.dismissed.auto` | Fermeture automatique (timeout) | Counter |
| `notification.queued` | Ajouts à la queue | Counter |
| `notification.dropped` | Notifications évincées (queue pleine) | Counter |

### Buffer de démarrage

Si le module `Telemetry` n'est pas encore chargé au démarrage, les métriques sont **buffered pendant 30 secondes** puis :
- **Flush automatique** si `Telemetry` devient disponible
- **Abandon après 30s** si `Telemetry` ne charge pas (évite fuite mémoire)

---

## 🎭 Système de Queue Prioritaire

### Comportement

1. **Ajout à la queue** : Toast ajouté avec priorité selon type
2. **Tri automatique** : Queue triée par priorité (desc) puis timestamp (asc)
3. **Affichage** : Toasts affichés selon disponibilité (3 temporaires max, 2 persistants max)
4. **Réorganisation** : Si error arrive et queue pleine, un toast info/success est retiré avec animation `slideUp`
5. **Éviction** : Si 15 toasts en attente, le moins prioritaire est droppé

### Exemple de comportement

```javascript
// État initial : 3 toasts info visibles + 5 en queue
GeoLeaf.UI.Notifications.info("Info 1");
GeoLeaf.UI.Notifications.info("Info 2");
GeoLeaf.UI.Notifications.info("Info 3");
// ... 5 autres en queue

// Arrive un error prioritaire
GeoLeaf.UI.Notifications.error("Erreur critique !");

// Résultat : 
// - 1 toast info retiré avec animation slideUp
// - Error affiché immédiatement
// - 2 toasts info restants visibles
```

---

## 🎨 Classes CSS

### Structure DOM générée

```html
<div id="gl-notifications" class="gl-notifications gl-notifications--bottom-center">
  <div class="gl-toast gl-toast--success gl-toast--visible" role="alert" aria-live="polite">
    <span class="gl-toast__message">Message de succès</span>
    <button class="gl-toast__close" aria-label="Fermer">×</button>
  </div>
</div>
```

### Classes principales

| Classe | Description |
|--------|-------------|
| `.gl-notifications` | Conteneur fixe |
| `.gl-notifications--bottom-center` | Variante position |
| `.gl-toast` | Toast individuel |
| `.gl-toast--visible` | État visible (opacity: 1) |
| `.gl-toast--removing` | Animation de sortie |
| `.gl-toast--sliding-up` | Animation réorganisation (toast évincé) |
| `.gl-toast--sliding-down` | Animation réorganisation (toast descendu) |
| `.gl-toast--success` | Type succès (vert) |
| `.gl-toast--error` | Type error (rouge) |
| `.gl-toast--warning` | Type warning (orange) |
| `.gl-toast--info` | Type info (bleu) |
| `.gl-toast__message` | Contenu du message |
| `.gl-toast__close` | Bouton fermeture |

### Animations CSS

```css
/* Animation slide-up (toast retiré par priorité) */
@keyframes slideUp {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-100%); opacity: 0; }
}

/* Animation slide-down (toast descendu dans la pile) */
@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0.5; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## ♿ Accessibilité

### Features WCAG

- ✅ `role="alert"` sur chaque toast
- ✅ `aria-live="assertive"` pour errors et toasts prioritaires
- ✅ `aria-live="polite"` pour success/warning/info
- ✅ `aria-label` sur bouton fermeture
- ✅ Support `prefers-reduced-motion`
- ✅ Focus management (`:focus-within`)

### Mode réduit

```css
@media (prefers-reduced-motion: reduce) {
  .gl-toast, .gl-notifications {
    transition: none !important;
  }
}
```

---

## 📱 Responsive

### Mobile

Sur mobile (< 768px) :
- Toasts occupent toute la largeur
- Position centrée en bas
- Espacement réduit

```css
@media (max-width: 768px) {
  .gl-notifications--bottom-center {
    left: 10px;
    right: 10px;
    transform: none;
  }
}
```

---

## 🔧 Exemples d'Usage Réel

### Cache offline

```javascript
// Succès téléchargement
GeoLeaf.UI.Notifications.success(
  `Profil téléchargé : ${sizeMB} MB`,
  4000
);

// Erreur stockage
GeoLeaf.UI.Notifications.error(
  "Stockage offline non disponible",
  5000
);

// Avertissement arrêt
GeoLeaf.UI.Notifications.warning(
  "Téléchargement arrêté",
  3000
);
```

### Synchronisation POI

```javascript
// Info démarrage
GeoLeaf.UI.Notifications.info(
  "Synchronisation en cours...",
  { persistent: true, dismissible: false }
);

// Succès conditionnel
if (results.failed > 0) {
  GeoLeaf.UI.Notifications.warning(
    `✅ Sync terminée: ${results.synced} réussies, ${results.failed} échecs`,
    5000
  );
} else {
  GeoLeaf.UI.Notifications.success(
    `✅ Sync terminée: ${results.synced} réussies`,
    5000
  );
}

// Erreur
GeoLeaf.UI.Notifications.error(
  `❌ Erreur synchronisation: ${error.message}`,
  5000
);
```

---

## 🚀 Évolutions Futures

### Options avancées planifiées

```javascript
// Icône personnalisée
GeoLeaf.UI.Notifications.success("Message", {
  icon: "🎉",
  duration: 3000
});

// Bouton action
GeoLeaf.UI.Notifications.warning("Connexion perdue", {
  persistent: true,
  action: {
    label: "Reconnecter",
    callback: () => reconnect()
  }
});

// Toast de progression
GeoLeaf.UI.Notifications.info("Téléchargement", {
  persistent: true,
  progress: true,  // Affiche barre de progression
  onProgress: (percent) => {}
});
```

---

## 📝 Notes de Migration

### Depuis v4.4.0

**Breaking changes** :
- Méthode `show(message, type, duration)` maintenant disponible publiquement
- Support double signature : positionnelle ET objet options

**Migrations recommandées** :
```javascript
// Avant (v4.4.0)
GeoLeaf.UI.Notifications.show("Message", "warning", 3000);

// Après (v4.4.1) - Recommandé
GeoLeaf.UI.Notifications.warning("Message", 3000);

// Alternative avec options avancées
GeoLeaf.UI.Notifications.warning("Message", { 
  duration: 3000,
  persistent: false 
});
```

---

## 🐛 Debugging

### Mode Debug

```javascript
// Vérifier l'état
console.log(GeoLeaf.UI.Notifications.getStatus());

// Vérifier métriques Telemetry
if (GeoLeaf.Storage?.Telemetry) {
  const report = GeoLeaf.Storage.Telemetry.getMetricsReport();
  console.log('Notification metrics:', report);
}

// Tester la queue
for (let i = 0; i < 20; i++) {
  GeoLeaf.UI.Notifications.info(`Test ${i}`);
}
// Observe: 3 visibles, 12 en queue, 5 droppés
```

---

**📘 Documentation liée** :
- [GeoLeaf_UI_README.md](./GeoLeaf_UI_README.md) - Module UI principal
- [../storage/telemetry.md](../storage/telemetry.md) - Système Telemetry
