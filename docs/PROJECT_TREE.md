# GeoLeaf-Js — Arborescence du projet (monorepo)

**Product Version:** GeoLeaf Platform V1  
**Version:** 4.0.0  
**Date:** février 2026  
**Architecture:** Monorepo (Turborepo, npm workspaces) — Core MIT + plugins (commercial)

> Ce document décrit la structure du dépôt GeoLeaf-Js telle qu’elle existe réellement.
>
> **Périmètre :**
>
> - **packages/core** : bibliothèque principale (MIT), sources dans `packages/core/src/` (TypeScript)
> - **packages/plugin-\*** : plugins optionnels (licence commerciale)
> - **docs/** : documentation complète monorepo (racine)
> - **deploy/** : variantes de déploiement (deploy-core, deploy-storage, deploy-storage-addpoi), générées par `npm run build:deploy`

---

## Table des matières

1. [Racine du projet](#1-racine-du-projet)
2. [packages/](#2-packages)
3. [packages/core](#3-packagescore)
4. [packages/core/src (modules)](#4-packagescoresrc-modules)
5. [apps/](#5-apps)
6. [deploy/ (variantes)](#6-deploy-variantes)
7. [profiles/](#7-profiles)
8. [docs/](#8-docs)
9. [scripts/](#9-scripts)
10. [Sorties de build](#10-sorties-de-build)
11. [Commandes principales](#11-commandes-principales)

---

## 1. Racine du projet

```
GeoLeaf-Js/                           # racine du dépôt (monorepo)
├── .github/                          # CI GitHub Actions
├── .husky/                           # hooks Git (pre-commit, etc.)
├── apps/                             # applications (ex. demo)
├── docs/                             # documentation (source unique)
├── packages/                         # packages npm (core + plugins)
├── profiles/                         # profils métier (tourism, etc.)
├── scripts/                          # scripts build, déploiement, audit
├── deploy/                           # déploiements (deploy-core, deploy-storage, deploy-storage-addpoi)
├── __mocks__/                        # mocks Jest globaux
├── __tests__/                        # tests unitaires (racine, si présents)
├── CHANGELOG.md
├── LICENCE
├── package.json                      # workspaces + Turborepo
├── turbo.json                        # tâches Turborepo
├── README.md
└── ...
```

---

## 2. packages/

| Package                     | Rôle                              | Licence     | Publication     |
| --------------------------- | --------------------------------- | ----------- | --------------- |
| **packages/core**           | Bibliothèque GeoLeaf (core)       | MIT         | npm (public)    |
| **packages/plugin-storage** | Plugin stockage / cache / offline | Commerciale | GitHub Packages |
| **packages/plugin-addpoi**  | Plugin ajout / édition POI        | Commerciale | GitHub Packages |

Les sources du core sont en **TypeScript** dans `packages/core/src/`. Les plugins ont leur propre `src/` et dépendent du core.

---

## 3. packages/core

```
packages/core/
├── src/                    # Code source TypeScript
│   ├── app/                # Boot, init, helpers
│   ├── bundle-entry.ts     # Point d’entrée Rollup (UMD)
│   ├── bundle-esm-entry.ts # Point d’entrée ESM
│   ├── modules/            # Modules métier (voir ci-dessous)
│   ├── lazy/               # Chargement différé (chunks)
│   ├── css/                # Styles
│   └── ...
├── __tests__/              # Tests Jest du core
├── dist/                   # (généré) Bundles et types
├── docs/                    # Doc API TypeDoc + sous-ensemble “core only”
├── package.json
├── rollup.config.mjs
├── jest.config.cjs
└── tsconfig.json
```

---

## 4. packages/core/src (modules)

Organisation des modules métier du core :

```
packages/core/src/
├── app/                    # Initialisation application
├── assets/                  # Ressources statiques
├── baselayers/              # Couches de base
├── contracts/               # Contrats / types partagés
├── core/                    # Cœur (init, log, config globale)
├── css/                     # Feuilles de style
├── filters/                 # Moteur de filtres
├── geojson/                 # Couches GeoJSON
├── helpers/                 # Utilitaires
├── layers/                  # Gestion des couches
├── legend/                  # Légende
├── markers/                 # Marqueurs
├── modules/                 # Façades et globaux (geoleaf.*)
├── poi/                     # POI (points d’intérêt)
├── route/                   # Itinéraires
├── storage/                 # Stockage / cache (core)
├── table/                   # Table des données
├── themes/                  # Thèmes
├── ui/                      # Composants UI
└── validators/              # Validateurs
```

Les sorties de build (UMD, ESM, CSS) sont dans `packages/core/dist/`.

---

## 5. apps/

| Dossier       | Rôle                                         |
| ------------- | -------------------------------------------- |
| **apps/demo** | Application de démonstration / développement |

---

## 6. deploy/ (variantes)

Variantes de déploiement générées par **`npm run build:deploy`** (script `scripts/build-deploy.cjs`) :

| Dossier                          | Contenu typique              |
| -------------------------------- | ---------------------------- |
| **deploy/deploy-core**           | Core seul (minifié + profil) |
| **deploy/deploy-storage**        | Core + plugin Storage        |
| **deploy/deploy-storage-addpoi** | Core + Storage + AddPOI      |

Utilisées pour tests manuels, E2E Playwright et copie sur serveur. Servir avec `npx serve deploy -p 8765` ou `node scripts/serve-test.cjs`.

---

## 7. profiles/

Profils métier (configuration couches, taxonomie, UI) :

```
profiles/
└── tourism/                # Profil tourisme
    ├── profile.json
    ├── LICENSE-DATA.md
    └── ...
```

Le core et les apps peuvent référencer `profiles/` à la racine ou une copie dans le package.

---

## 8. docs/

Documentation **complète** du monorepo (guides, spec, legal, audits). Ne pas confondre avec `packages/core/docs/` qui est le sous-ensemble destiné au dépôt public (core MIT).

```
docs/
├── INDEX.md
├── DEVELOPER_GUIDE.md
├── PROJECT_TREE.md         # ce document
├── MONOREPO_WORKFLOW.md
├── guides/                 # Guides (config, distribution, licence…)
├── legal/                  # Juridique (à créer/déplacer)
├── spec/                   # Spécifications (à créer/déplacer)
├── audits/                 # Audits (à créer/déplacer)
└── ...
```

---

## 9. scripts/

Scripts utilitaires (build, déploiement, audit, benchmark) :

```
scripts/
├── build-deploy.cjs        # Produit deploy/deploy-core, deploy-storage, deploy-storage-addpoi
├── smoke-test.cjs          # Test de fumée post-build
├── benchmark.cjs           # Benchmarks
├── audit-innerhtml.cjs     # Audit sécurité innerHTML
└── ...
```

---

## 10. Sorties de build

| Cible            | Emplacement                                                     | Description                              |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Core UMD/ESM     | `packages/core/dist/`                                           | geoleaf.umd.js, geoleaf.min.js, ESM, CSS |
| Plugin Storage   | `packages/plugin-storage/dist/`                                 | Bundle plugin storage                    |
| Plugin AddPOI    | `packages/plugin-addpoi/dist/`                                  | Bundle plugin addpoi                     |
| Deploy variantes | `deploy/deploy-core`, `deploy-storage`, `deploy-storage-addpoi` | Fichiers prêts à servir                  |

---

## 11. Commandes principales

| Commande                | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run build`         | Build tous les packages (Turborepo) |
| `npm run build:core`    | Build du core uniquement            |
| `npm run build:plugins` | Build des plugins uniquement        |
| `npm test`              | Tests (Turborepo)                   |
| `npm run test:core`     | Tests du core                       |
| `npm run test:coverage` | Couverture (core)                   |
| `npm run lint`          | Lint (Turborepo)                    |
| `npm run clean`         | Nettoyage des artefacts             |
| `npm run smoke-test`    | Test de fumée post-build            |

Voir [MONOREPO_WORKFLOW.md](MONOREPO_WORKFLOW.md) et [guides/DISTRIBUTION_GUIDE_2026.md](guides/DISTRIBUTION_GUIDE_2026.md) pour le détail.

---

_Dernière mise à jour : février 2026 — v4.0.0 (monorepo)_
