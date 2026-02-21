# 🤝 Guide de Contribution - GeoLeaf.js

> **Bienvenue!** Merci de votre intérêt pour contribuer à GeoLeaf.js. Ce guide vous aidera à démarrer.

**Version produit**: GeoLeaf Platform V1  
**Version**: 4.0.0  
**Dernière mise à jour**: 14 février 2026

> Convention de versioning : **Platform V1** est le label produit ; le SemVer technique des packages/releases reste en **4.x**. Voir [VERSIONING_POLICY.md](VERSIONING_POLICY.md).

---

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Configuration de Développement](#configuration-de-développement)
- [Standards de Code](#standards-de-code)
- [Processus de Pull Request](#processus-de-pull-request)
- [Architecture et Modules](#architecture-et-modules)
- [Tests](#tests)
- [Documentation](#documentation)
- [Versioning](#versioning)

---

## 📜 Code de Conduite

### Nos Engagements

GeoLeaf.js s'engage à maintenir une communauté ouverte, accueillante et inclusive. Nous attendons de tous les contributeurs qu'ils:

- **Respectent** tous les participants, indépendamment de leur niveau d'expérience
- **Acceptent** les critiques constructives avec grâce
- **Se concentrent** sur ce qui est le mieux pour la communauté
- **Communiquent** de manière professionnelle et courtoise

### Comportements Inacceptables

- Langage ou imagerie sexualisés, attention non désirée
- Trolling, commentaires insultants/désobligeants
- Harcèlement public ou privé
- Publication d'informations privées sans permission

---

## 🚀 Comment Contribuer

### Types de Contributions

Nous accueillons plusieurs types de contributions:

#### 🐛 Rapports de Bugs

- Utilisez le template d'issue GitHub
- Incluez une description claire du problème
- Fournissez des étapes pour reproduire
- Ajoutez des captures d'écran si pertinent
- Précisez la version de GeoLeaf.js

#### ✨ Suggestions de Fonctionnalités

- Ouvrez une issue avec le label "enhancement"
- Décrivez le cas d'usage et le problème résolu
- Proposez une solution ou des alternatives
- Soyez ouvert aux discussions

#### 📝 Documentation

- Corrections de typos
- Clarifications
- Nouveaux guides ou tutoriels
- Traductions

#### 🔧 Code

- Corrections de bugs
- Nouvelles fonctionnalités
- Optimisations de performance
- Refactoring

---

## 💻 Configuration de Développement

### Prérequis

```bash
# Node.js >= 18.x
node --version  # v18.0.0 ou supérieur

# npm >= 9.x
npm --version
```

### Installation

```bash
# 1. Fork le repository sur GitHub

# 2. Clone votre fork
git clone https://github.com/VOTRE-USERNAME/geoleaf-js.git
cd geoleaf-js

# 3. Ajouter le remote upstream
git remote add upstream https://github.com/geonatwork/geoleaf-js.git

# 4. Installer les dépendances
npm install

# 5. Vérifier l'installation
npm run test
```

### Structure de Branches

```
main              # Production stable
├── develop       # Développement actif
├── feature/*     # Nouvelles fonctionnalités
├── bugfix/*      # Corrections de bugs
├── hotfix/*      # Corrections urgentes production
└── release/*     # Préparation releases
```

### Workflow Git

```bash
# 1. Créer une branche depuis develop
git checkout develop
git pull upstream develop
git checkout -b feature/ma-nouvelle-fonctionnalite

# 2. Faire vos modifications
# ... codez, testez, commitez ...

# 3. Mettre à jour depuis upstream
git fetch upstream
git rebase upstream/develop

# 4. Pousser vers votre fork
git push origin feature/ma-nouvelle-fonctionnalite

# 5. Créer une Pull Request sur GitHub
```

---

## 📏 Standards de Code

### Style JavaScript

GeoLeaf.js utilise **ESLint** et **Prettier** pour l'uniformité du code.

```bash
# Linter le code
npm run lint

# Fixer automatiquement
npm run lint:fix

# Formatter avec Prettier
npm run format
```

#### Conventions de Nommage

```javascript
// Variables et fonctions: camelCase
const mapInstance = map;
function createMarker() {}

// Classes et constructeurs: PascalCase
class LayerManager {}
const MyComponent = {};

// Constants: UPPER_SNAKE_CASE
const MAX_ZOOM_LEVEL = 18;
const DEFAULT_CONFIG = {};

// Privé (convention): préfixe _underscore
function _internalHelper() {}
const _privateState = {};

// Modules: kebab-case
// fichier: layer-manager.js
// répertoire: content-builder/
```

#### Organisation du Code

```javascript
/**
 * Structure d'un module GeoLeaf
 */

// 1. Imports
import { dependency } from "./module";

// 2. Constants
const CONSTANT_VALUE = "value";

// 3. Variables privées
let _internalState = {};

// 4. Fonctions utilitaires privées
function _helperFunction() {}

// 5. Fonctions publiques (exports)
export function publicFunction() {
    // Implementation
}

// 6. Export par défaut (si applicable)
export default MainModule;
```

### JSDoc et Documentation Inline

**Toutes les fonctions publiques DOIVENT avoir une JSDoc complète.**

```javascript
/**
 * Crée un marqueur POI sur la carte avec options personnalisées.
 *
 * @param {L.Map} map - Instance Leaflet de la carte
 * @param {Object} poi - Objet POI avec propriétés
 * @param {number} poi.lat - Latitude du POI
 * @param {number} poi.lng - Longitude du POI
 * @param {string} [poi.icon='default'] - Nom de l'icône
 * @param {Object} [options={}] - Options additionnelles
 * @param {boolean} [options.draggable=false] - Marqueur déplaçable
 * @param {Function} [options.onClick] - Callback au clic
 *
 * @returns {L.Marker} Instance du marqueur créé
 *
 * @throws {TypeError} Si map n'est pas une instance L.Map
 * @throws {ValidationError} Si poi.lat ou poi.lng invalides
 *
 * @example
 * const marker = createPoiMarker(map, {
 *   lat: 48.8566,
 *   lng: 2.3522,
 *   icon: 'restaurant'
 * }, {
 *   draggable: true,
 *   onClick: (e) => console.log('Clicked!', e)
 * });
 *
 * @since 3.0.0
 */
export function createPoiMarker(map, poi, options = {}) {
    // Implementation
}
```

### Architecture Modulaire v3.0

#### Principes de Modularisation

1. **Single Responsibility Principle**: Un module = une responsabilité
2. **Modules < 500 lignes**: Si > 500 lignes, découper
3. **Exports explicites**: Toujours nommer les exports
4. **Dépendances minimales**: Éviter les couplages forts

#### Structure de Répertoires

```
src/modules/
├── geoleaf.*.js        # Modules legacy (en modularisation)
│
├── api/                # API publique et controllers
│   ├── controller.js
│   ├── factory-manager.js
│   └── ...
│
├── ui/                 # Composants UI
│   ├── content-builder/  # ⭐ Exemple architecture v3.0
│   │   ├── core.js       # Helpers partagés
│   │   ├── templates.js  # Templates HTML
│   │   ├── assemblers.js # Assemblage final
│   │   └── *-renderer.js # Renderers spécialisés
│   └── ...
│
├── storage/            # Système de cache
│   ├── cache/          # Cache online/offline
│   └── db/             # IndexedDB
│
└── utils/              # Utilitaires transversaux
```

#### Exemple: Créer un Nouveau Module

```javascript
// src/modules/features/mon-module.js

/**
 * @module features/mon-module
 * @description Description du module
 */

import { logError } from "../utils/error-logger";
import { validateConfig } from "../utils/validators";

// Constants
const MODULE_NAME = "MonModule";

// Internal state
let _initialized = false;

/**
 * Initialise le module avec configuration
 *
 * @param {Object} config - Configuration du module
 * @returns {boolean} true si succès
 */
export function init(config) {
    try {
        validateConfig(config);
        _initialized = true;
        return true;
    } catch (error) {
        logError(`${MODULE_NAME} init failed`, error);
        return false;
    }
}

/**
 * Fonctionnalité principale du module
 *
 * @param {*} data - Données à traiter
 * @returns {*} Résultat du traitement
 */
export function mainFeature(data) {
    if (!_initialized) {
        throw new Error(`${MODULE_NAME} not initialized`);
    }
    // Implementation
}

// Export par défaut si applicable
export default {
    init,
    mainFeature,
};
```

---

## 🔄 Processus de Pull Request

### Checklist Avant Soumission

#### ✅ Code Quality & Style

- [ ] **Code style**: Lint et format validés (`npm run lint`, `npm run format`)
- [ ] **Complexity**: Aucune fonction >80 LOC (max: 100 LOC acceptable avec justification)
- [ ] **Duplication**: Pas de code dupliqué (utiliser modules partagés)
- [ ] **Nomenclature**: Conventions respectées (camelCase, PascalCase, UPPER_SNAKE_CASE)

#### 🔒 Security Checklist (from Audit 2026)

- [ ] **XSS Prevention**: Aucun usage de `innerHTML` sans sanitization
    - Utiliser `GeoLeaf.DOMSecurity.setSafeHTML()` ou `textContent`
    - Valider avec: `node scripts/audit-innerhtml.cjs`
- [ ] **Input Validation**: Toutes les entrées utilisateur validées
    - JSON.parse() wrappé dans try-catch
    - Upload files validés (magic bytes, size, extensions)
    - Pas de `Object.assign()` avec données non fiables (prototype pollution)
- [ ] **CSRF Protection**: Tokens CSRF si formulaires/mutations
- [ ] **Sanitization**: HTML/URL/SQL échappés correctement

#### 🧪 Tests & Coverage

- [ ] **Tests**: Tous les tests passent (`npm test`)
- [ ] **Coverage**: Couverture ≥75% pour nouveau code
    - Vérifier: `npm run test:coverage`
- [ ] **Edge cases**: Tests pour null/undefined/empty values
- [ ] **Tests ajoutés**: Nouveaux tests pour nouvelles fonctionnalités

#### 📚 Documentation

- [ ] **JSDoc**: Complète sur toutes fonctions publiques
    - @param avec types, @returns, @throws si applicable
- [ ] **README**: Mis à jour si changements API publiques
- [ ] **CHANGELOG**: Entrée ajoutée avec description
- [ ] **Examples**: Code examples fournis si nouvelle feature

#### 🏗️ Architecture & Performance

- [ ] **Memory leaks**: Pas de fuites mémoire
    - Vérifier event listeners cleanup
    - Vérifier setTimeout/setInterval clearés
    - Éviter circular references (utiliser WeakMap)
- [ ] **Performance**: Pas de régression performance
    - Profiler avec Chrome DevTools si changement critique
- [ ] **Bundle size**: Pas d'augmentation significative (>5%)

#### 📦 Git & CI/CD

- [ ] **Commits**: Messages clairs et descriptifs (Conventional Commits)
- [ ] **Branch**: À jour avec `upstream/develop`
- [ ] **CI/CD**: Pipeline passe (lint, tests, build)
- [ ] **No warnings**: Aucun warning ESLint/TypeScript

### Template de Pull Request

```markdown
## Description

Brève description des changements.

## Type de Changement

- [ ] 🐛 Bug fix (changement non-breaking qui corrige un problème)
- [ ] ✨ New feature (changement non-breaking qui ajoute une fonctionnalité)
- [ ] 💥 Breaking change (fix ou feature qui casse la compatibilité)
- [ ] 📝 Documentation (changements de documentation uniquement)
- [ ] 🎨 Refactoring (changement qui n'ajoute pas de feature ni ne fixe de bug)
- [ ] ⚡ Performance (amélioration des performances)
- [ ] ✅ Tests (ajout ou correction de tests)

## Motivation et Contexte

Pourquoi ce changement est nécessaire? Quel problème résout-il?

## Comment Tester

Étapes pour tester les changements:

1.
2.
3.

## Screenshots (si applicable)

## Checklist

- [ ] Mon code suit le style du projet
- [ ] J'ai effectué une auto-revue de mon code
- [ ] J'ai commenté mon code dans les parties complexes
- [ ] J'ai mis à jour la documentation
- [ ] Mes changements ne génèrent pas de warnings
- [ ] J'ai ajouté des tests qui prouvent que mon fix fonctionne
- [ ] Tous les tests passent localement
- [ ] Aucune régression de performance

## Issues Liées

Fixes #(issue_number)
Related to #(issue_number)
```

### Revue de Code

Les Pull Requests seront reviewées selon ces critères:

1. **Qualité du Code**
    - Respect des conventions
    - Lisibilité et maintenabilité
    - Performance et optimisation

2. **Tests**
    - Couverture adéquate
    - Tests pertinents et robustes
    - Pas de régression

3. **Documentation**
    - JSDoc complète et précise
    - README à jour si nécessaire
    - Commentaires clairs

4. **Architecture**
    - Respect des patterns établis
    - Modules bien découplés
    - Éviter les dépendances circulaires

### Processus de Merge

1. **Review approuvée** par au moins 1 mainteneur
2. **CI/CD green** (tous les tests passent)
3. **Conflits résolus** avec develop
4. **Squash merge** dans develop (commits nettoyés)
5. **Issue liée fermée** automatiquement

---

## ✅ Tests

### Framework de Tests

- **Jest**: Tests unitaires et d'intégration
- **Playwright**: Tests E2E (end-to-end)
- **Tests manuels**: Validation fonctionnelle HTML

### Commandes de Tests

```bash
# Tous les tests
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests E2E
npm run test:e2e

# Tests spécifiques
npm test -- content-builder
```

### Écrire des Tests

#### Tests Unitaires (Jest)

```javascript
// __tests__/features/mon-module.test.js

import { init, mainFeature } from "../../src/modules/features/mon-module";

describe("MonModule", () => {
    describe("init()", () => {
        it("should initialize with valid config", () => {
            const config = { key: "value" };
            const result = init(config);
            expect(result).toBe(true);
        });

        it("should reject invalid config", () => {
            const invalidConfig = null;
            const result = init(invalidConfig);
            expect(result).toBe(false);
        });
    });

    describe("mainFeature()", () => {
        beforeEach(() => {
            init({ key: "value" });
        });

        it("should process data correctly", () => {
            const data = { test: "data" };
            const result = mainFeature(data);
            expect(result).toBeDefined();
        });

        it("should throw if not initialized", () => {
            // Reset initialization
            expect(() => mainFeature({})).toThrow();
        });
    });
});
```

#### Tests E2E (Playwright)

```javascript
// tests/e2e/mon-feature.spec.js

import { test, expect } from "@playwright/test";

test.describe("Ma Fonctionnalité", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("http://localhost:3000/demo");
        await page.waitForSelector("#map");
    });

    test("should load map correctly", async ({ page }) => {
        const map = await page.locator("#map");
        await expect(map).toBeVisible();
    });

    test("should interact with feature", async ({ page }) => {
        await page.click("#my-button");
        await expect(page.locator(".result")).toHaveText("Expected Result");
    });
});
```

### Couverture de Tests

**Objectif**: >80% couverture globale

- **Fonctions critiques**: 100% couverture obligatoire
- **Utilitaires**: >90% couverture
- **UI components**: >70% couverture
- **Edge cases**: Toujours tester les cas limites

---

## 📚 Documentation

### Types de Documentation

1. **JSDoc Inline**: Dans le code source (obligatoire pour APIs publiques)
2. **README**: Vue d'ensemble et quick start
3. **Guides**: Documentation détaillée dans `docs/`
4. **API Reference**: Générée depuis JSDoc
5. **Examples**: Code examples dans `demo/` et `profiles/tourism/`

### Mettre à Jour la Documentation

#### Après Changements API

```bash
# 1. Mettre à jour JSDoc dans le code

# 2. Mettre à jour README.md si nécessaire
# - Installation
# - Usage basique
# - API publique

# 3. Mettre à jour docs/DEVELOPER_GUIDE.md

# 4. Ajouter exemples si feature majeure
# demo/example-ma-feature.html

# 5. Mettre à jour CHANGELOG.md
```

#### Standards Documentation

- **Clarté**: Écrire pour des développeurs de tous niveaux
- **Exemples**: Toujours inclure des exemples concrets
- **À jour**: Synchroniser avec le code actuel
- **Complétude**: Couvrir tous les cas d'usage principaux

---

## 🔖 Versioning

GeoLeaf.js suit le **Semantic Versioning 2.0.0**:

### Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Changements incompatibles (breaking changes)
- **MINOR**: Nouvelles fonctionnalités compatibles
- **PATCH**: Corrections de bugs compatibles

### Exemples

```
3.0.0 → 3.0.1   # Bug fix
3.0.1 → 4.0.0   # Nouvelle fonctionnalité
4.0.0 → 4.0.0   # Breaking change
```

### Messages de Commit

Format: **Conventional Commits**

```bash
# Format
<type>(<scope>): <description courte>

[corps optionnel]

[footer optionnel]
```

#### Types de Commits

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation uniquement
- `style`: Formatage, point-virgules manquants, etc.
- `refactor`: Refactoring sans changer le comportement
- `perf`: Amélioration des performances
- `test`: Ajout ou correction de tests
- `chore`: Maintenance, build, dépendances

#### Exemples

```bash
# Feature
git commit -m "feat(content-builder): add template caching system"

# Bug fix
git commit -m "fix(poi): correct marker positioning on zoom"

# Breaking change
git commit -m "feat(api)!: change init signature to accept options object

BREAKING CHANGE: init() now requires options object instead of individual parameters"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactoring
git commit -m "refactor(ui): extract theme logic to separate module"
```

---

## 🎯 Bonnes Pratiques

### Performance

- **Lazy Loading**: Charger à la demande
- **Debounce/Throttle**: Sur événements fréquents (scroll, resize, input)
- **DocumentFragment**: Pour manipulations DOM multiples
- **Cache**: Mettre en cache les résultats coûteux
- **Éviter**: Manipulations DOM dans les boucles
- **Memory Management**:
    - Cleanup event listeners dans destroy()
    - Clear setTimeout/setInterval
    - Éviter circular references (utiliser WeakMap si nécessaire)

### Sécurité (Based on Audit 2026)

#### XSS Prevention

```javascript
// ❌ INTERDIT
element.innerHTML = userInput;
element.innerHTML = `<div>${data}</div>`;

// ✅ CORRECT
GeoLeaf.DOMSecurity.setSafeHTML(element, userInput);
element.textContent = userText;
```

#### Input Validation

```javascript
// JSON.parse with error handling
try {
    const config = JSON.parse(jsonString);
    if (!validateSchema(config)) {
        throw new Error("Invalid schema");
    }
} catch (e) {
    Log.error("Parse error:", e.message);
    config = DEFAULT_CONFIG;
}

// File upload validation
if (!validateFile(file)) {
    throw new Error("Invalid file type");
}
```

#### Prototype Pollution Prevention

```javascript
// ❌ INTERDIT
const merged = Object.assign({}, baseConfig, userConfig);

// ✅ CORRECT
const ALLOWED_KEYS = ['id', 'label', 'data', ...];
const safe = {};
Object.keys(userConfig).forEach(key => {
  if (ALLOWED_KEYS.includes(key) &&
      key !== '__proto__' &&
      key !== 'constructor') {
    safe[key] = userConfig[key];
  }
});
const merged = { ...baseConfig, ...safe };
```

#### Security Tools

```bash
# Audit XSS vulnerabilities
node scripts/audit-innerhtml.cjs

# Check dependencies
npm audit

# Validate code
npm run lint
```

### Sécurité

### Maintenabilité

- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **Documentation**: Expliquer le "pourquoi", pas le "comment"

---

## 🚀 CI/CD & Publishing

### GitHub Actions Workflow

The project uses GitHub Actions for automated testing, building, and publishing:

- **Lint Job**: ESLint + Prettier formatting check
- **Test Job**: Jest unit tests + coverage enforcement (75% minimum)
- **Build Job**: Rollup bundling + bundle size validation
- **Security Job**: npm audit + XSS auditing
- **Publish Job** (on tag push): Automatic npm publishing + GitHub release

### Publishing a Release

#### Prerequisites

You must have **npm publish permissions** on the [geoleaf npm package](https://npmjs.com/package/geoleaf).

#### Release Process

1. **Ensure all tests pass locally:**

    ```bash
    npm run test:ci
    npm run lint
    npm run build:all
    ```

2. **Update version in package.json** (Semantic Versioning):

    ```json
    {
        "version": "4.0.0"
    }
    ```

3. **Update CHANGELOG.md** with release notes

4. **Commit version bump:**

    ```bash
    git add package.json CHANGELOG.md
    git commit -m "chore: release v4.0.0"
    ```

5. **Create git tag (triggers CI/CD):**

    ```bash
    git tag -a v4.0.0 -m "Release version 4.0.0"
    git push origin main --tags
    ```

6. **GitHub Actions will automatically:**
    - Run all tests and linting
    - Build production bundle
    - Publish to npm registry
    - Create GitHub Release with artifacts

#### Required GitHub Secrets

For automated npm publishing, configure these secrets in repository settings:

**Secret Name**: `NPM_TOKEN`

- **Description**: npm authentication token for automated publishing
- **Value**: Your npm token with "Automation" or "Read and Publish" permissions
- **How to create**:
    1. Go to [npmjs.com/settings/tokens](https://npmjs.com/settings/tokens)
    2. Click "Generate New Token"
    3. Select "Automation" permission level
    4. Copy the token
    5. Add to GitHub: Settings → Secrets and variables → Actions → New repository secret

**Note**: Store the `NPM_TOKEN` securely. Never commit it to the repository.

### Manual Publishing (if needed)

If you need to publish manually without using git tags:

```bash
npm run prepublishOnly  # Lint, build, test
npm publish
```

---

## 🆘 Besoin d'Aide?

### Ressources

- **Documentation**: [docs/](./docs/)
- **Issues GitHub**: [Issues](https://github.com/geonatwork/geoleaf-js/issues)
- **Discussions**: [Discussions](https://github.com/geonatwork/geoleaf-js/discussions)

### Contact

- **Mainteneurs**: Voir [MAINTAINERS.md](./MAINTAINERS.md)
- **Email**: support@geonatwork.fr

---

## 📄 Licensing

### License Header

All JavaScript files contributed to GeoLeaf Core must include the MIT license header at the top of the file:

```javascript
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */
```

**Important**: This header must be placed **before all other code and comments** in the file.

For detailed information about license headers and where they apply, see [LICENSE_HEADERS.md](./LICENSE_HEADERS.md).

### License Agreement

By contributing to GeoLeaf Core, you agree that:

1. Your contributions are licensed under the **MIT License**
2. You have the right to license your contributions
3. Your contributions do not infringe on any third-party rights
4. You understand the distinction between GeoLeaf Core (open source) and potential future modules

For more information about the distinction between GeoLeaf Core and future modules, see [NOTICE.md](./NOTICE.md).

### MIT License

GeoLeaf Core is released under the MIT License:

```
© 2026 Mattieu Pottier
Released under the MIT License
https://geoleaf.dev
```

See the [LICENCE](../LICENCE) file for the complete license text.

---

**Merci de contribuer à GeoLeaf.js! 🚀**

Votre aide fait de GeoLeaf.js un meilleur outil pour tous.
