# GeoLeaf.Security – Documentation du module Security

Product Version: GeoLeaf Platform V1  
**Version**: 1.1.0 (Phase 1 XSS hardening)  
**Fichier (monorepo)** : `packages/core/src/modules/security/`  
**Date**: Février 2026

---

## 📌 Vue d'ensemble

Le module **GeoLeaf.Security** fournit des fonctions de sécurité centralisées pour protéger l'application contre les vulnérabilités XSS (Cross-Site Scripting) et les injections malveillantes.

### Responsabilités principales

- ✅ **Échappement HTML** - Neutralise les caractères HTML dangereux
- ✅ **Validation d'URLs** - Whitelist de protocoles autorisés
- ✅ **Sanitization de données** - Nettoie les propriétés des POI/GeoJSON
- ✅ **Protection XSS** - Prévention des attaques par injection de code

---

## 🔒 Fonctions de sécurité

### `escapeHtml(str)`

Échappe les caractères HTML dangereux pour prévenir les attaques XSS.

**Signature** :

```js
GeoLeaf.Security.escapeHtml(str: string): string
```

**Exemple** :

```js
const userInput = '<script>alert("XSS")</script>';
const safe = GeoLeaf.Security.escapeHtml(userInput);
// Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'

// Utilisation dans du HTML
element.innerHTML = GeoLeaf.Security.escapeHtml(userInput);
// Affiche le texte sans exécuter le script
```

**Caractères échappés** :

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#39;`

---

### `escapeAttribute(str)`

Échappe les caractères pour une utilisation sûre dans les attributs HTML.

**Signature** :

```js
GeoLeaf.Security.escapeAttribute(str: string): string
```

**Exemple** :

```js
const userValue = 'value" onclick="alert(1)';
const safe = GeoLeaf.Security.escapeAttribute(userValue);
// Returns: 'value&quot; onclick=&quot;alert(1)'

// Utilisation dans un attribut
const html = `<input value="${safe}">`;
// Sécurisé, le onclick ne sera pas exécuté
```

---

### `validateUrl(url, baseUrl?)`

Valide une URL avec une whitelist stricte de protocoles autorisés.

**Signature** :

```js
GeoLeaf.Security.validateUrl(
  url: string,
  baseUrl?: string
): string
```

**Paramètres** :

- `url` : URL à valider (obligatoire)
- `baseUrl` : URL de base pour résolution relative (optionnel)

**Protocoles autorisés** :

- ✅ `http:`
- ✅ `https:`
- ✅ `data:` (pour images base64)

**Exemples** :

```js
// URL valide
GeoLeaf.Security.validateUrl("https://example.com/data.json");
// Returns: 'https://example.com/data.json'

// URL relative (avec baseUrl)
GeoLeaf.Security.validateUrl("../data/poi.json", window.location.href);
// Returns: URL absolue résolue

// URL malveillante (lance une erreur)
try {
    GeoLeaf.Security.validateUrl("javascript:alert(1)");
} catch (error) {
    console.error("URL non autorisée:", error.message);
}
```

**Erreurs lancées** :

- `TypeError` : Si URL vide ou non-string
- `Error` : Si protocole non autorisé

---

### `sanitizePoiProperties(properties)`

Nettoie les propriétés d'un POI ou feature GeoJSON pour prévenir les injections.

**Signature** :

```js
GeoLeaf.Security.sanitizePoiProperties(
  properties: object
): object
```

**Exemple** :

```js
const unsafeProps = {
    name: "<img src=x onerror=alert(1)>",
    description: "Normal text",
    popupContent: '<script>alert("XSS")</script>',
    rating: 4.5,
};

const safeProps = GeoLeaf.Security.sanitizePoiProperties(unsafeProps);
// Returns: {
//   name: '&lt;img src=x onerror=alert(1)&gt;',
//   description: 'Normal text',
//   popupContent: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
//   rating: 4.5
// }
```

**Champs échappés automatiquement** :

- `name`, `label`, `title`
- `description`, `shortDescription`
- `popupContent`, `tooltipContent`
- Tous les champs string sauf URLs et IDs

---

## 🛡️ Protection XSS dans GeoLeaf

### Où la sécurité est appliquée

| Module      | Protection appliquée                          |
| ----------- | --------------------------------------------- |
| **POI**     | Sanitization des propriétés avant rendu popup |
| **GeoJSON** | Échappement des propriétés dans popups        |
| **Route**   | Validation des URLs de chargement GPX/GeoJSON |
| **Config**  | Validation des URLs de dataSources            |
| **UI**      | Échappement de tous les textes utilisateur    |

### Exemple d'intégration

```js
// Module POI utilise Security automatiquement
GeoLeaf.POI.addPoi({
    id: "poi-user",
    latlng: [45.5, -73.6],
    label: userInput, // ⚠️ Peut contenir du HTML malveillant
    description: userDescription, // ⚠️ Peut contenir du HTML malveillant
});

// En interne, POI appelle :
// const safeProps = GeoLeaf.Security.sanitizePoiProperties(poi.attributes);
// Donc le rendu est automatiquement sécurisé ✅
```

---

## ⚠️ Bonnes pratiques

### ✅ À FAIRE

```js
// Échapper TOUJOURS les données utilisateur
const userName = GeoLeaf.Security.escapeHtml(userInput);
element.innerHTML = `<h1>${userName}</h1>`;

// Valider les URLs avant fetch
const safeUrl = GeoLeaf.Security.validateUrl(userProvidedUrl);
fetch(safeUrl).then(/*...*/);

// Utiliser sanitizePoiProperties pour les données externes
const apiData = await fetch("/api/poi").then((r) => r.json());
const safePoi = GeoLeaf.Security.sanitizePoiProperties(apiData);
```

### ❌ À ÉVITER

```js
// NE JAMAIS insérer directement du HTML utilisateur
element.innerHTML = userInput; // ❌ Dangereux !

// NE JAMAIS charger des URLs non validées
fetch(userUrl); // ❌ Peut être javascript:, file:, etc.

// NE PAS bypasser la sanitization
poi.properties.popupContent = unsafeHtml; // ❌ XSS possible !

// NE PAS vider un nœud DOM avec innerHTML = ''
element.innerHTML = ""; // ❌ Utiliser DOMSecurity.clearElement à la place (voir ci‑dessous)
```

---

## 📐 Vidage du DOM (convention unique)

**Règle** : pour vider le contenu d’un élément (supprimer ses enfants), ne pas utiliser `element.innerHTML = ''`. Utiliser à la place **`GeoLeaf.DOMSecurity.clearElement(element)`** ou **`GeoLeaf.DOMSecurity.clearElementFast(element)`**.

| Méthode                            | Usage                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DOMSecurity.clearElement(el)`     | Vide en supprimant les nœuds un par un (`removeChild`) — préférable quand des listeners ou des refs sont attachés aux enfants. |
| `DOMSecurity.clearElementFast(el)` | Vide via `el.textContent = ''` — plus rapide, à privilégier quand le contenu est uniquement texte/HTML sans listeners.         |

**Exemple** :

```js
// ✅ Correct
GeoLeaf.DOMSecurity.clearElementFast(container);

// ❌ À éviter
container.innerHTML = "";
```

Cette convention garantit un point unique de vidage du DOM et évite les assignations directes à `innerHTML` dans le code applicatif (core et plugins). Voir aussi `packages/core/src/modules/utils/dom-security.ts` et la roadmap (étape 5).

---

## 🧪 Tests

Le module Security est couvert par des tests Jest complets :

```bash
# Lancer les tests Security
npm test -- security

# Tests disponibles
__tests__/security/security.test.js
__tests__/security/security-extended.test.js
```

**Couverture** : 95%+ (187+ tests passants)

---

## 📚 Références

- **OWASP XSS Prevention Cheat Sheet** : https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- **MDN - Content Security Policy** : https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **Module Errors** : `docs/errors/GeoLeaf_Errors_README.md`

---

## 🔗 Voir aussi

- `GeoLeaf.Validators` - Validation de données structurées
- `GeoLeaf.Errors` - Gestion d'erreurs typées
- `GeoLeaf.POI` - Utilisation de Security dans POI
