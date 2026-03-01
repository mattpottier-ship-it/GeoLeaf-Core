// rollup.config.mjs
// Pipeline de build officiel GeoLeaf – Phase 3.x + Sprint 7.1 Optimizations
// Objectif : produire uniquement les bundles standalone (UMD) :
// - geoleaf.umd.js (dev)
// - geoleaf.min.js (prod)
// avec minification + sourcemaps + analyse bundle + optimisations avancées.

// Sprint 7.1: Optimisations Bundle & Runtime
// - Visualizer pour analyse bundle (stats.html)
// - Tree-shaking agressif
// - Dead code elimination via Terser
// - Compression avancée (mangle, compress)
// - Filesize reporter

// ⚠️ Point d'entrée : fichier bundle-entry.js qui importe tous les modules dans l'ordre correct
// Il regroupe tous les modules (Core, UI, Config, POI, GeoJSON, Route, Legend, etc.).
// ✅ Ordre de chargement géré par bundle-entry.js :
//    1. geoleaf.log.js (logger)
//    2. geoleaf.constants.js (constantes globales)
//    3. geoleaf.utils.js (utilitaires partagés)
//    4. geoleaf.core.js, geoleaf.ui.js, geoleaf.config.js, etc.
//    5. geoleaf.api.js (API publique)
// 🚧 Phase 7 ESM Migration: separate entry files for UMD vs ESM builds
const INPUT_FILE      = "src/bundle-entry.ts";           // UMD only — no named exports
const INPUT_FILE_ESM  = "src/bundle-esm-entry.ts";       // ESM only — all named exports
const INPUT_FILE_LITE = "src/bundle-core-lite-entry.ts"; // PERF-02 — lite sans table/labels/route
const STORAGE_PLUGIN  = "../plugin-storage/src/entry.ts";
const ADDPOI_PLUGIN   = "../plugin-addpoi/src/entry.ts";

import { minify } from "rollup-plugin-esbuild";
import { visualizer } from "rollup-plugin-visualizer";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import alias  from "@rollup/plugin-alias";
import fs   from "node:fs";
import path  from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pre-compile plugin .ts files so Rollup receives JS (avoids "Expression expected" on interface). */
function pluginTsLoad(tsconfigPath) {
  const configPath = path.resolve(__dirname, tsconfigPath);
  return {
    name: "plugin-ts-load",
    load(id) {
      if (!id.endsWith(".ts") || (!id.includes("plugin-storage") && !id.includes("plugin-addpoi"))) return null;
      const raw = fs.readFileSync(id, "utf-8");
      const config = ts.readConfigFile(configPath, (p) => fs.readFileSync(p, "utf-8"));
      if (config.error) return null;
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
      const out = ts.transpileModule(raw, {
        compilerOptions: { ...parsed.options, declaration: false, declarationMap: false },
        fileName: id,
      });
      return { code: out.outputText, map: out.sourceMapText ? JSON.parse(out.sourceMapText) : undefined };
    },
  };
}

/** Alias pour résoudre @storage et @addpoi depuis les configs plugin (Phase 7) */
const premiumAliases = alias({
    entries: [
        { find: '@storage', replacement: path.resolve(__dirname, '../plugin-storage/src') },
        { find: '@addpoi',  replacement: path.resolve(__dirname, '../plugin-addpoi/src') },
    ],
});

// Read version from package.json for dynamic injection
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

/**
 * Configuration Rollup principale pour GeoLeaf.
 * - external : on considère Leaflet et MarkerCluster comme déjà présents côté navigateur.
 * - treeshake: configuration agressive pour éliminer dead code.
 */
const baseConfig = {
  input: INPUT_FILE,
  plugins: [
    // Injection version build — remplace __GEOLEAF_VERSION__ dans les sources JS
    replace({
      preventAssignment: true,
      values: {
        '__GEOLEAF_VERSION__': JSON.stringify(pkg.version),
        '__SW_DEBUG__': process.env.NODE_ENV !== 'production' ? 'true' : 'false',
      }
    }),
    // Sprint 5: TypeScript — avant resolve/commonjs pour traiter .ts
    typescript({ tsconfig: './tsconfig.json' }),
    // Résolution modules Node.js (si nécessaire)
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.ts', '.js']
    }),
    // Support CommonJS (conversion en ESM)
    commonjs(),
    // Reporter taille fichiers retiré (rollup-plugin-filesize dépendances vulnérables)
    // Utiliser dist/stats.html (rollup-plugin-visualizer) pour l'analyse du bundle
  ],
  external: ["leaflet", "leaflet.markercluster", "leaflet.vectorgrid", "maplibre-gl", "@maplibre/maplibre-gl-leaflet"],

  // Tree-shaking UMD — conserver tous les side-effects (app/*, globals.js, sw-register.js…)
  // ⚠️ Ne pas filtrer ici : app/boot.js, app/init.js etc. sont des side-effect imports purs.
  // ⚠️ unknownGlobalSideEffects DOIT être true : les modules qui mutent window.GeoLeaf via
  //    des variables dérivées de globalThis (ex: api/geoleaf-api.js → Object.assign) seraient
  //    incorrectement éliminés si Rollup traite globalThis comme un objet local sans état.
  treeshake: {
    moduleSideEffects: true,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: true,
    annotations: true,
  },
};

/**
 * Bundle ESM — version ESM pour bundlers (import/export natif).
 * Phase 7 B13: activé — tree-shaking + ~50 named exports + lazy chunks dans dist/chunks/.
 * Entrée dédiée : bundle-esm-entry.js (séparée du bundle UMD pour ne pas contaminer window.GeoLeaf).
 */
const esmConfig = {
  ...baseConfig,
  input: INPUT_FILE_ESM,
  // ESM tree-shaking : seuls globals.js + sw-register.js + app/* ont des side-effects réels
  treeshake: {
    ...baseConfig.treeshake,
    moduleSideEffects: (id) =>
      id.includes('globals.js') ||
      id.includes('sw-register.js') ||
      id.includes('/app/'),
  },
  output: {
    dir: "dist",
    format: "es",
    entryFileNames: "geoleaf.esm.js",
    chunkFileNames: "chunks/geoleaf-[name]-[hash].js",
    sourcemap: true,
    exports: "named",
    // PERF-01: manualChunks thématiques pour éviter l'explosion combinatoire.
    // Sans grouping, Rollup crée un chunk par combinaison unique de dépendances
    // entre les ~12 dynamic imports → 300+ chunks dupliqués.
    // Avec grouping thématique → ~15 chunks stables réutilisables.
    manualChunks(id) {
      const norm = id.replace(/\\/g, '/');

      // 1. Lazy entry points → chunks nommés explicites (même nom que les fichiers)
      if (norm.includes('/src/lazy/')) {
        return path.basename(norm, path.extname(norm));
      }

      // 2. Groupes thématiques — modules partagés entre plusieurs lazy chunks
      // Légende (legend-generator, legend-renderer, legend-control, geoleaf.legend)
      if (norm.includes('/modules/legend/') || norm.includes('/modules/geoleaf.legend')) {
        return 'chunk-legend';
      }
      // POI complet (shared, normalizers, markers, core, sidepanel, renderers/*, contracts/poi*)
      if (norm.includes('/modules/poi/') || norm.includes('/contracts/poi')) {
        return 'chunk-poi';
      }
      // Route (loaders, layer-manager/route, style-resolver, route-types)
      if (norm.includes('/modules/route/') || norm.includes('/modules/geoleaf.route')) {
        return 'chunk-route';
      }
      // Table
      if (norm.includes('/modules/table/') || norm.includes('/modules/geoleaf.table')) {
        return 'chunk-table';
      }
      // Labels
      if (norm.includes('/modules/labels/') || norm.includes('/modules/geoleaf.labels')) {
        return 'chunk-labels';
      }
      // Themes
      if (norm.includes('/modules/themes/') || norm.includes('/modules/geoleaf.themes')) {
        return 'chunk-themes';
      }
      // Layer manager (basemap-selector, layer-manager control)
      if (norm.includes('/modules/layer-manager/') || norm.includes('/modules/baselayers/') ||
          norm.includes('/modules/geoleaf.layer-manager') || norm.includes('/modules/geoleaf.baselayers')) {
        return 'chunk-layers';
      }
      // GeoJSON processing (loader, clustering, style-utils, geojson-types)
      if (norm.includes('/modules/geojson/') || norm.includes('/modules/geoleaf.geojson')) {
        return 'chunk-geojson';
      }
      // Core shared utilities (log, utils, config, constants, errors, security)
      // These are referenced by almost everything — put in a single shared chunk
      // so lazy chunks don't need to re-emit them.
      if (
        norm.includes('/modules/log/') ||
        norm.includes('/modules/utils/') ||
        norm.includes('/modules/constants/') ||
        norm.includes('/modules/errors/') ||
        norm.includes('/modules/config/') ||
        norm.includes('/modules/security/')
      ) {
        return 'chunk-core-utils';
      }
    },
  },
};

/**
 * Bundle UMD non minifié – utile en dev (CDN, script direct).
 * Sprint 6: inlineDynamicImports — les chunks sont inlineés (bundle unique).
 * → Sourcemap activé.
 */
const umdConfig = {
  ...baseConfig,
  output: {
    file: "dist/geoleaf.umd.js",
    format: "umd",
    name: "GeoLeaf",
    sourcemap: true,
    globals: {
      leaflet: "L",
      "leaflet.markercluster": "L",
      "leaflet.vectorgrid": "L",
      "maplibre-gl": "maplibregl",
      "@maplibre/maplibre-gl-leaflet": "L",
    },
    compact: false,
    exports: "named",
    inlineDynamicImports: true,
  },
};

/**
 * Bundle UMD minifié – version de production pour CDN.
 * Sprint 6: inlineDynamicImports — les chunks sont inlineés (bundle unique).
 * → Minification via Terser + analyse bundle.
 * Sprint 7.1: Compression et mangling agressifs
 * ⚠️ Source maps disabled in production (security: prevents source code exposure)
 */
const umdMinConfig = {
  ...baseConfig,
  output: {
    file: "dist/geoleaf.min.js",
    format: "umd",
    name: "GeoLeaf",
    sourcemap: false,
    banner: `/* GeoLeaf v${pkg.version} | MIT License | github.com/mattpottier-ship-it/geoleaf-js */`,
    globals: {
      leaflet: "L",
      "leaflet.markercluster": "L",
      "leaflet.vectorgrid": "L",
      "maplibre-gl": "maplibregl",
      "@maplibre/maplibre-gl-leaflet": "L",
    },
    compact: true,
    exports: "named",
    inlineDynamicImports: true,
  },
  plugins: [
    ...(baseConfig.plugins || []),
    minify({ target: "es2015", legalComments: "none" }),

    // Visualizer bundle (stats.html) - Sprint 7.1
    visualizer({
      filename: "dist/stats.html",
      open: false,                  // Ne pas ouvrir auto
      gzipSize: true,              // Afficher taille gzip
      brotliSize: true,            // Afficher taille brotli
      template: "treemap",         // Format: treemap, sunburst, network
      title: "GeoLeaf Bundle Analysis - Sprint 7.1",
      sourcemap: true
    }),

    // Sprint 7: Emit sw-core.js (lite SW) and geojson-worker.js as assets
    swCoreVersionPlugin(pkg.version),
    geojsonWorkerPlugin(pkg.version)
  ],
};

/**
 * Custom Rollup plugin — Premium Core Redirect (Phase 7)
 * Premium plugin source files (in GeoLeaf-Plugins) contain relative imports
 * that assumed they lived in GeoLeaf-Js/src/modules/. This plugin transparently
 * redirects unresolvable relative imports to their real target:
 *   1. Same module still in GeoLeaf-Js/src (log, config, utils, contracts…)
 *   2. Or a sibling module moved to another plugin sub-directory
 *
 * Mapping: plugin-storage/src  ↔  GeoLeaf-Js/src/modules/storage
 *          plugin-addpoi/src   ↔  GeoLeaf-Js/src/modules/poi
 *
 * Special origins override: files whose original GeoLeaf-Js location differs
 * from what the plugin path implies (e.g. lazy-chunk.js was src/lazy/).
 */
function premiumCoreRedirect() {
    // Each plugin maps its src/ subdirs to original GeoLeaf-Js module locations.
    // dirMappings: first path segment → { base, stripSegment }
    //   base: the original module root for files in that subdir
    //   stripSegment: if true, consume the segment so relAfterMapping is relative to base
    const pluginMappings = [
        {
            pluginSrc:   path.resolve(__dirname, '../plugin-storage/src'),
            defaultSrc:  path.resolve(__dirname, 'src/modules/storage'),
            dirMappings: {
                // These subdirs were introduced during Phase 7 copy; original files lived
                // at the root of src/modules/storage/ or at another module root.
                'core': { base: path.resolve(__dirname, 'src/modules/storage') },
                'sync': { base: path.resolve(__dirname, 'src/modules/storage') },
                'sw'  : { base: path.resolve(__dirname, 'src/modules/storage') },
                'ui'  : { base: path.resolve(__dirname, 'src/modules/ui')      },
            },
        },
        {
            pluginSrc:   path.resolve(__dirname, '../plugin-addpoi/src'),
            defaultSrc:  path.resolve(__dirname, 'src/modules/poi'),
            dirMappings: {},
        },
    ];
    // Files with completely different original locations (not derivable from plugin path)
    const fileOriginOverrides = {
        [path.resolve(__dirname, '../plugin-addpoi/src/lazy-chunk.ts')]:
            path.resolve(__dirname, 'src/lazy'),
        [path.resolve(__dirname, '../plugin-addpoi/src/lazy-chunk.js')]:
            path.resolve(__dirname, 'src/lazy'),
        // geoleaf.storage.ts was a top-level facade at src/modules/ (not inside storage/)
        [path.resolve(__dirname, '../plugin-storage/src/core/geoleaf.storage.ts')]:
            path.resolve(__dirname, 'src/modules'),
        [path.resolve(__dirname, '../plugin-storage/src/core/geoleaf.storage.js')]:
            path.resolve(__dirname, 'src/modules'),
    };

    function tryExtensions(base) {
        const baseNoJs = base.endsWith('.js') ? base.slice(0, -3) : base;
        for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
            if (fs.existsSync(baseNoJs + ext)) return baseNoJs + ext;
        }
        return null;
    }

    // Build a filename→[absolutePath] index for all files in each plugin src tree.
    // Used as fallback when a virtual-original path doesn't exist in GeoLeaf-Js core.
    const pluginFileIndex = new Map(); // pluginSrc → Map(basename → absPath[])
    for (const m of pluginMappings) {
        const idx = new Map();
        (function walk(dir) {
            try {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) { walk(full); }
                    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
                        const key = entry.name.replace(/\.(ts|js)$/, '');
                        if (!idx.has(key)) idx.set(key, []);
                        idx.get(key).push(full);
                    }
                }
            } catch (_) { /* skip unreadable dirs */ }
        })(m.pluginSrc);
        pluginFileIndex.set(m.pluginSrc, idx);
    }

    return {
        name: 'premium-core-redirect',
        resolveId(source, importer) {
            if (!importer || !source.startsWith('.')) return null;

            const pluginsRoot = path.resolve(__dirname, '..');
            if (!importer.startsWith(path.resolve(__dirname, '../plugin-storage')) &&
                !importer.startsWith(path.resolve(__dirname, '../plugin-addpoi'))) return null;

            // Find matching plugin mapping
            let mapping = null;
            for (const m of pluginMappings) {
                if (importer.startsWith(m.pluginSrc + path.sep) || importer === m.pluginSrc) {
                    mapping = m;
                    break;
                }
            }
            if (!mapping) return null;

            // ── Compute virtual original importer directory ────────────────────────
            let virtualImporterDir;
            const absImporter = path.normalize(importer);
            if (fileOriginOverrides[absImporter]) {
                virtualImporterDir = fileOriginOverrides[absImporter];
            } else {
                const relParts = path.relative(mapping.pluginSrc, path.dirname(importer))
                    .split(path.sep).filter(Boolean);
                const firstSeg = relParts[0];
                const dm = mapping.dirMappings[firstSeg];
                if (dm) {
                    // Always strip the first segment (it's consumed by the mapping key itself)
                    const restParts = relParts.slice(1);
                    virtualImporterDir = restParts.length
                        ? path.resolve(dm.base, restParts.join(path.sep))
                        : dm.base;
                } else {
                    virtualImporterDir = relParts.length
                        ? path.resolve(mapping.defaultSrc, relParts.join(path.sep))
                        : mapping.defaultSrc;
                }
            }

            // ── Resolve source from virtual original dir ───────────────────────────
            const virtualResolved = path.resolve(virtualImporterDir, source);

            // Step 1 — still exists in GeoLeaf-Js core tree
            const inCore = tryExtensions(virtualResolved);
            if (inCore) return inCore;

            // Step 2 — was moved to a plugin; search by filename
            // Prioritise the same plugin as the importer to avoid cross-plugin collisions.
            const targetName = path.basename(virtualResolved, '.js');
            const orderedMappings = [mapping, ...pluginMappings.filter(m => m !== mapping)];
            for (const m of orderedMappings) {
                const idx = pluginFileIndex.get(m.pluginSrc);
                const candidates = idx?.get(targetName) || [];
                if (candidates.length === 1) return candidates[0];
                if (candidates.length > 1) {
                    const hint = path.basename(path.dirname(virtualResolved));
                    const match = candidates.find(c => path.dirname(c).includes(hint));
                    return match || candidates[0];
                }
            }

            return null;
        },
    };
}

/**
 * Plugin Storage — Module optionnel (offline, IndexedDB, cache).
 * Se charge après le bundle core. Attache sur window.GeoLeaf.Storage.
 * ⚠️ Conditionné : ne build que si le fichier source existe (open-source clones l'excluent).
 */
const storagePluginConfigs = fs.existsSync(STORAGE_PLUGIN)
  ? [
      {
        input: STORAGE_PLUGIN,
        plugins: [
          pluginTsLoad("../plugin-storage/tsconfig.json"),
          premiumAliases,
          premiumCoreRedirect(),
          typescript({
            tsconfig: path.resolve(__dirname, '../plugin-storage/tsconfig.json'),
            declaration: false,
            compilerOptions: { outDir: path.resolve(__dirname, 'dist'), declarationDir: undefined },
          }),
          resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
          commonjs(),
          swVersionPlugin(pkg.version),  // Emit dist/sw.js alongside storage plugin
        ],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        output: {
          file: "dist/geoleaf-storage.plugin.js",
          format: "es",
          sourcemap: false,
        },
      },
    ]
  : [];

/**
 * Plugin AddPOI — Module optionnel (formulaire ajout/edit POI).
 * Se charge après le bundle core. Attache sur window.GeoLeaf.POI.AddForm.
 * ⚠️ Conditionné : ne build que si le fichier source existe.
 */
const addPoiPluginConfigs = fs.existsSync(ADDPOI_PLUGIN)
  ? [
      {
        input: ADDPOI_PLUGIN,
        plugins: [
          pluginTsLoad("../plugin-addpoi/tsconfig.json"),
          premiumAliases,
          premiumCoreRedirect(),
          typescript({
            tsconfig: path.resolve(__dirname, '../plugin-addpoi/tsconfig.json'),
            declaration: false,
            compilerOptions: { outDir: path.resolve(__dirname, 'dist'), declarationDir: undefined },
          }),
          resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
          commonjs(),
        ],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        output: {
          file: "dist/geoleaf-addpoi.plugin.js",
          format: "es",
          sourcemap: false,
        },
      },
    ]
  : [];

/**
 * Custom Rollup plugin — Service Worker version injection (premium/full).
 * Reads the SW template, replaces __GEOLEAF_VERSION__ placeholders,
 * and emits dist/sw.js as a raw asset (no bundling/wrapping).
 * Attached to the Storage plugin build so sw.js is only produced
 * when the premium Storage module is being built.
 */
function swVersionPlugin(version) {
  const SW_SOURCE = "src/modules/storage/sw.js";
  return {
    name: "sw-version-inject",
    generateBundle() {
      if (!fs.existsSync(SW_SOURCE)) return;
      const swDebug = process.env.NODE_ENV !== 'production' ? 'true' : 'false';
      const content = fs.readFileSync(SW_SOURCE, "utf-8")
        .replaceAll("__GEOLEAF_VERSION__", version)
        .replaceAll("__SW_DEBUG__", swDebug);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: content,
      });
    },
  };
}

/**
 * Custom Rollup plugin — Service Worker Core (lite) version injection.
 * Emits dist/sw-core.js for the open-source/free bundle.
 * Provides basic offline caching (Cache API only, no IndexedDB/sync).
 * Attached to the UMD min build (core production).
 */
function swCoreVersionPlugin(version) {
  const SW_CORE_SOURCE = "src/modules/storage/sw-core.js";
  return {
    name: "sw-core-version-inject",
    generateBundle() {
      if (!fs.existsSync(SW_CORE_SOURCE)) return;
      const swDebug = process.env.NODE_ENV !== 'production' ? 'true' : 'false';
      const content = fs.readFileSync(SW_CORE_SOURCE, "utf-8")
        .replaceAll("__GEOLEAF_VERSION__", version)
        .replaceAll("__SW_DEBUG__", swDebug);
      this.emitFile({
        type: "asset",
        fileName: "sw-core.js",
        source: content,
      });
    },
    // Copy sw-core.js to demo/ if it exists (local dev only — not required in CI)
    writeBundle(options) {
      const distFile = path.join(options.dir || path.dirname(options.file || "dist/geoleaf.min.js"), "sw-core.js");
      const demoDir = path.resolve("demo");
      const demoFile = path.resolve(demoDir, "sw-core.js");
      if (fs.existsSync(distFile) && fs.existsSync(demoDir)) {
        fs.copyFileSync(distFile, demoFile);
      }
    },
  };
}

/**
 * Custom Rollup plugin — GeoJSON Web Worker asset emission.
 * Emits dist/geojson-worker.js for off-thread GeoJSON parsing (Sprint 7).
 * Attached to the core build so it’s always available.
 */
function geojsonWorkerPlugin(version) {
  const WORKER_SOURCE = "src/modules/geojson/geojson-worker.js";
  return {
    name: "geojson-worker-emit",
    generateBundle() {
      if (!fs.existsSync(WORKER_SOURCE)) return;
      const content = fs.readFileSync(WORKER_SOURCE, "utf-8")
        .replaceAll("__GEOLEAF_VERSION__", version);
      this.emitFile({
        type: "asset",
        fileName: "geojson-worker.js",
        source: content,
      });
    },
  };
}

/**
 * PERF-TS1 — Build ESM granulaire (preserveModules: true)
 * Génère un fichier .js par module source dans dist/esm/.
 * Permet aux consommateurs (Webpack/Vite) de tree-shaker au niveau module.
 * Ne pas inclure dans le bundle CDN — usage bundler uniquement.
 */
const esmGranularConfig = {
  ...baseConfig,
  input: INPUT_FILE_ESM,
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        '__GEOLEAF_VERSION__': JSON.stringify(pkg.version),
        '__SW_DEBUG__': 'false',
      }
    }),
    // outDir et declarationDir doivent être sous dist/esm pour satisfaire le plugin TS
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        noEmit: true,
        declaration: false,
        declarationDir: undefined,
        outDir: path.resolve(__dirname, 'dist/esm'),
      }
    }),
    resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
    commonjs(),
  ],
  treeshake: {
    ...baseConfig.treeshake,
    moduleSideEffects: (id) =>
      id.includes('globals') ||
      id.includes('sw-register') ||
      id.includes('/app/'),
  },
  output: {
    dir: "dist/esm",
    format: "es",
    preserveModules: true,
    preserveModulesRoot: "src",
    entryFileNames: "[name].js",
    chunkFileNames: "[name].js",
    sourcemap: false,
    exports: "named",
  },
};

/**
 * PERF-02 — Build UMD "Core Lite" (sans table / labels / route / vector-tiles)
 * Cible : gzip < 130 KB (vs 148 KB full).
 * Usage : CDN pour projets n'utilisant pas ces modules optionnels.
 */
const umdLiteConfig = {
  ...baseConfig,
  input: INPUT_FILE_LITE,
  output: {
    file: "dist/geoleaf-lite.umd.js",
    format: "umd",
    name: "GeoLeaf",
    sourcemap: false,
    banner: `/* GeoLeaf Lite v${pkg.version} | MIT | geoleaf.dev */`,
    globals: {
      leaflet: "L",
      "leaflet.markercluster": "L",
      "leaflet.vectorgrid": "L",
      "maplibre-gl": "maplibregl",
      "@maplibre/maplibre-gl-leaflet": "L",
    },
    compact: true,
    exports: "named",
    inlineDynamicImports: true,
  },
  plugins: [
    ...(baseConfig.plugins || []),
    minify({ target: "es2015", legalComments: "none" }),
  ],
};

/**
 * PERF-02 — Build ESM granulaire "Core Lite" (preserveModules)
 */
const esmLiteGranularConfig = {
  ...esmGranularConfig,
  input: INPUT_FILE_LITE,
  plugins: [
    replace({
      preventAssignment: true,
      values: { '__GEOLEAF_VERSION__': JSON.stringify(pkg.version), '__SW_DEBUG__': 'false' }
    }),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        noEmit: true,
        declaration: false,
        declarationDir: undefined,
        outDir: path.resolve(__dirname, 'dist/esm-lite'),
      }
    }),
    resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
    commonjs(),
  ],
  output: {
    ...esmGranularConfig.output,
    dir: "dist/esm-lite",
  },
};

// Phase 7 B13: esmConfig activé — architecture ESM + tree-shaking enabled
// PERF-TS1: esmGranularConfig — build granulaire module-par-module (preserveModules)
// PERF-02: umdLiteConfig + esmLiteGranularConfig — builds allégés sans table/labels/route
export default [
  umdConfig,
  umdMinConfig,
  esmConfig,
  esmGranularConfig,
  umdLiteConfig,
  esmLiteGranularConfig,
  ...storagePluginConfigs,
  ...addPoiPluginConfigs,
];
