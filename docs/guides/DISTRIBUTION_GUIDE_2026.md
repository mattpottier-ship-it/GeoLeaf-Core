# GeoLeaf — Distribution Guide (2026)

**Build, artefacts et déploiement** pour le monorepo GeoLeaf-Js et la publication des packages.

---

## Contexte

- **Monorepo** : GeoLeaf-Js (Turborepo, npm workspaces).
- **Core** : `packages/core` → bundle UMD/ESM, publié sur npm (MIT).
- **Plugins** : `packages/plugin-storage`, `packages/plugin-addpoi` → bundles séparés, licence commerciale (GitHub Packages ou registre privé).
- **Déploiements de test** : `deploy/` (deploy-core, deploy-storage, deploy-storage-addpoi), générés par `npm run build:deploy`.

---

## Build depuis les sources

### Depuis la racine du monorepo

```bash
# Tout builder (core puis plugins, via Turborepo)
npm run build

# Core uniquement
npm run build:core

# Plugins uniquement
npm run build:plugins
```

### Depuis un package

```bash
# Core
npm run build -w packages/core

# Plugin Storage
npm run build -w packages/plugin-storage

# Plugin AddPOI
npm run build -w packages/plugin-addpoi
```

Voir [MONOREPO_WORKFLOW.md](../MONOREPO_WORKFLOW.md) pour le graphe des tâches Turborepo et les commandes complètes.

---

## Artefacts générés

| Cible            | Emplacement                                                        | Description                                            |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Core UMD/ESM     | `packages/core/dist/`                                              | `geoleaf.umd.js`, `geoleaf.min.js`, CSS                |
| Plugin Storage   | `packages/plugin-storage/dist/`                                    | Bundle plugin storage                                  |
| Plugin AddPOI    | `packages/plugin-addpoi/dist/`                                     | Bundle plugin addpoi                                   |
| Deploy variantes | `deploy/deploy-core/`, `deploy-storage/`, `deploy-storage-addpoi/` | Générées par `npm run build:deploy` (build-deploy.cjs) |

Les variantes sont produites en une fois par `npm run build:deploy` (script `scripts/build-deploy.cjs`).

---

## Déploiement et publication

- **Core (MIT)** : `npm publish -w packages/core --access public` (npmjs.com).
- **Plugins (commercial)** : `npm publish -w packages/plugin-storage` et `-w packages/plugin-addpoi` (GitHub Packages ou registre privé, token requis).

Prérequis et étapes détaillées : [MONOREPO_WORKFLOW.md — Section 3 Release Workflow](../MONOREPO_WORKFLOW.md#section-3--release-workflow-step-by-step).

---

## Documentation associée

- [Developer Guide](../DEVELOPER_GUIDE.md) — structure projet, commandes de build détaillées, tests, contribution.
- [MONOREPO_WORKFLOW.md](../MONOREPO_WORKFLOW.md) — workflow quotidien, release, CI, sécurité et distribution.
