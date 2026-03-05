# GeoLeaf-Core � Arborescence du projet

**Product Version:** GeoLeaf Platform V1
**Version:** 1.1.0
**Date:** mars 2026

> Ce document d�crit la structure du projet **GeoLeaf-Core** (biblioth�que principale, licence MIT).

---

## Table des mati�res

1. [Racine du projet](#1-racine-du-projet)
2. [src/ � Code source](#2-src--code-source)
3. [src/modules/ � Modules m�tier](#3-srcmodules--modules-m�tier)
4. [dist/ � Sorties de build](#4-dist--sorties-de-build)
5. [profiles/](#5-profiles)
6. [docs/](#6-docs)
7. [scripts/](#7-scripts)
8. [Commandes principales](#8-commandes-principales)

---

## 1. Racine du projet

```
GeoLeaf-Core/
+-- src/                    # Code source (JavaScript)
+-- dist/                   # (g�n�r�) Bundles et types
+-- profiles/               # Profils m�tier (tourism, etc.)
+-- docs/                   # Documentation
+-- scripts/                # Scripts utilitaires
+-- __tests__/              # Tests unitaires et d'int�gration
+-- __mocks__/              # Mocks Jest globaux
+-- demo/                   # Application de d�monstration
+-- CHANGELOG.md
+-- LICENCE
+-- package.json
+-- rollup.config.mjs
+-- jest.config.cjs
+-- README.md
```

---

## 2. src/ � Code source

```
src/
+-- app/                    # Boot, initialisation, helpers applicatifs
+-- bundle-entry.js         # Point d'entr�e Rollup (UMD)
+-- bundle-esm-entry.js     # Point d'entr�e ESM
+-- modules/                # Modules m�tier (voir �3)
+-- lazy/                   # Chargement diff�r� (code splitting)
+-- css/                    # Feuilles de style (22+ fichiers)
+-- contracts/              # Contrats / interfaces d'extension
+-- assets/                 # Ressources statiques
```

---

## 3. src/modules/ � Modules m�tier

```
src/modules/
+-- api/                    # APIController, APIFactoryManager, PluginRegistry
+-- baselayers/             # Couches de fond cartographiques
+-- config/                 # Configuration centralis�e
+-- constants/              # Constantes globales
+-- core/                   # C�ur (init, log, config globale)
+-- data/                   # Normalisation des donn�es
+-- filters/                # Moteur de filtres
+-- geojson/                # Couches GeoJSON, worker, layer-manager
+-- helpers/                # Fonctions utilitaires transversales
+-- labels/                 # �tiquettes cartographiques
+-- layer-manager/          # Gestion des couches
+-- legend/                 # L�gende interactive
+-- log/                    # Journalisation
+-- loaders/                # Chargeurs (style-loader, etc.)
+-- map/                    # Contr�les carte (scale-control)
+-- markers/                # Marqueurs personnalis�s
+-- performance/            # M�triques de performance
+-- poi/                    # Points d'int�r�t (core)
+-- renderers/              # Renderers g�n�riques
+-- route/                  # Itin�raires
+-- schema/                 # Validation de sch�mas JSON
+-- security/               # XSS, sanitisation
+-- shared/                 # Singletons d'�tat partag�
+-- storage/                # D�tection hors-ligne (offline-detector)
+-- table/                  # Table des donn�es attributaires
+-- themes/                 # Gestion des th�mes visuels
+-- ui/                     # Composants UI (filter-panel, modals, etc.)
+-- utils/                  # Utilitaires (file-validator, scale-utils�)
+-- validators/             # Validateurs de donn�es
�
+-- geoleaf.*.js            # Barrels API (17 fichiers � composition de l'API finale)
+-- globals*.js             # Namespaces UMD globaux (8 fichiers � window.GeoLeaf.*)
```

---

## 4. dist/ � Sorties de build

| Fichier / Dossier      | Description                   |
| ---------------------- | ----------------------------- |
| `dist/geoleaf.umd.js`  | Bundle UMD d�veloppement      |
| `dist/geoleaf.min.js`  | Bundle UMD minifi� production |
| `dist/geoleaf.min.css` | Styles minifi�s               |
| `dist/esm/`            | Modules ESM (entry + chunks)  |
| `dist/*.d.ts`          | D�clarations TypeScript       |

---

## 5. profiles/

Profils m�tier (configuration couches, taxonomie, UI) :

```
profiles/
+-- tourism/                # Profil tourisme
    +-- profile.json
    +-- LICENSE-DATA.md
    +-- ...
```

---

## 6. docs/

Documentation publique de GeoLeaf-Core :

```
docs/
+-- INDEX_CORE.md           # Index principal
+-- API_REFERENCE.md        # R�f�rence API compl�te
+-- ARCHITECTURE_GUIDE.md   # Guide architecture
+-- GETTING_STARTED.md      # D�marrage rapide
+-- USER_GUIDE.md           # Guide utilisateur
+-- DEVELOPER_GUIDE.md      # Guide d�veloppeur
+-- CONFIGURATION_GUIDE.md  # Configuration
+-- PROFILE_JSON_REFERENCE.md
+-- architecture/           # Guides architecture d�taill�s
+-- baselayers/             # Doc module baselayers
+-- config/                 # Doc module config
+-- core/                   # Doc module core
+-- geojson/                # Doc module geojson
+-- labels/                 # Doc module labels
+-- legend/                 # Doc module legend
+-- poi/                    # Doc module poi
+-- route/                  # Doc module route
+-- security/               # Doc module security
+-- storage/                # Doc module storage (offline-detector uniquement)
+-- themes/                 # Doc module themes
+-- ui/                     # Doc modules UI
+-- utils/                  # Doc module utils
```

---

## 7. scripts/

Scripts utilitaires :

```
scripts/
+-- smoke-test.cjs              # Test de fum�e post-build
+-- benchmark.cjs               # Benchmarks de performance
+-- audit-innerhtml.cjs         # Audit s�curit� innerHTML
+-- core-docs-whitelist.json    # Liste blanche docs publi�es
+-- verify-no-premium-in-core.cjs  # V�rification int�grit� build
```

---

## 8. Commandes principales

| Commande                | Description                       |
| ----------------------- | --------------------------------- |
| `npm run build`         | Build de la biblioth�que (Rollup) |
| `npm test`              | Tests Jest                        |
| `npm run test:coverage` | Couverture de tests               |
| `npm run lint`          | Analyse statique ESLint           |
| `npm run clean`         | Nettoyage des artefacts           |
| `npm run smoke-test`    | Test de fum�e post-build          |
| `npm run benchmark`     | Benchmarks de performance         |

---

_Derni�re mise � jour : mars 2026 � v1.1.0_
