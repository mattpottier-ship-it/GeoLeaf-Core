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
const INPUT_FILE     = "src/bundle-entry.js";          // UMD only — no named exports
const INPUT_FILE_ESM = "src/bundle-esm-entry.js";      // ESM only — all named exports
const STORAGE_PLUGIN = "../GeoLeaf-Plugins/plugin-storage/src/entry.js";
const ADDPOI_PLUGIN  = "../GeoLeaf-Plugins/plugin-addpoi/src/entry.js";

import terser from "@rollup/plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import alias  from "@rollup/plugin-alias";
import filesize from "rollup-plugin-filesize";
import fs   from "node:fs";
import path  from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Alias pour résoudre @storage et @addpoi depuis les configs plugin (Phase 7) */
const premiumAliases = alias({
    entries: [
        { find: '@storage', replacement: path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-storage/src') },
        { find: '@addpoi',  replacement: path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-addpoi/src') },
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
    // Résolution modules Node.js (si nécessaire)
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    // Support CommonJS (conversion en ESM)
    commonjs(),
    // Reporter taille fichiers
    filesize({
      showMinifiedSize: true,
      showGzippedSize: true,
      showBrotliSize: true
    })
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
    // Force Rollup to emit separate chunk files for each lazy/ module.
    // Without this, Rollup inlines dynamic imports as Promise.resolve() when
    // the lazy modules share all their dependencies with the static imports.
    manualChunks(id) {
      if (id.includes('/src/lazy/') || id.includes('\\src\\lazy\\')) {
        return path.basename(id, '.js');
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

    // Minification Terser avec options agressives (Sprint 7.1)
    terser({
      compress: {
        // Dead code elimination
        dead_code: true,
        drop_console: false,        // Le Logger utilise console.* — on strip via pure_funcs
        drop_debugger: true,        // Supprimer debugger
        pure_funcs: ['console.log', 'console.debug', 'Log.debug'],  // Strip verbose logging du bundle de production
        passes: 3,                  // 3 passes compression pour max optimisation

        // Optimisations avancées
        booleans_as_integers: true, // Convertir true/false en 1/0
        keep_fargs: false,          // Supprimer args non utilisés
        unsafe: false,              // Pas d'optimisations unsafe (sécurité)
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_methods: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: false,

        // Autres optimisations
        arrows: true,               // Convertir en arrow functions
        collapse_vars: true,        // Collapse variables
        comparisons: true,          // Optimiser comparaisons
        computed_props: true,       // Optimiser propriétés calculées
        conditionals: true,         // Simplifier conditionnels
        evaluate: true,             // Évaluer expressions constantes
        if_return: true,            // Optimiser if/return
        inline: 3,                  // Inline agressif
        join_vars: true,            // Joindre déclarations var
        loops: true,                // Optimiser loops
        negate_iife: true,          // Optimiser IIFE
        properties: true,           // Optimiser propriétés
        reduce_funcs: true,         // Réduire fonctions inline
        reduce_vars: true,          // Réduire variables
        sequences: true,            // Joindre séquences
        side_effects: true,         // Supprimer side effects
        switches: true,             // Optimiser switch
        typeofs: true,              // Optimiser typeof
        unused: true,               // Supprimer code inutilisé
      },

      mangle: {
        // Name mangling agressif
        toplevel: false,            // Pas de mangle top-level (exports)
        properties: false,          // Pas de mangle propriétés (breaking)
        keep_classnames: true,      // Garder noms classes (debug)
        keep_fnames: false,         // Minifier noms fonctions (sauf exports)
        reserved: ['GeoLeaf', 'L']  // Réserver noms critiques
      },

      format: {
        comments: false,            // Supprimer commentaires
        preamble: `/* GeoLeaf v${pkg.version} | MIT License | github.com/mattpottier-ship-it/geoleaf-js */`,
        ascii_only: true,           // ASCII seulement (compatibilité)
        beautify: false,            // Pas de beautify (minifié)
        ecma: 2015                  // Target ES6
      },

      sourceMap: false,             // No source maps in production
      toplevel: false,              // Pas de mangle exports
      keep_classnames: true,        // Garder noms classes
      keep_fnames: false            // Minifier fonctions internes
    }),

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
            pluginSrc:   path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-storage/src'),
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
            pluginSrc:   path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-addpoi/src'),
            defaultSrc:  path.resolve(__dirname, 'src/modules/poi'),
            dirMappings: {},
        },
    ];
    // Files with completely different original locations (not derivable from plugin path)
    const fileOriginOverrides = {
        [path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-addpoi/src/lazy-chunk.js')]:
            path.resolve(__dirname, 'src/lazy'),
        // geoleaf.storage.js was a top-level facade at src/modules/ (not inside storage/)
        [path.resolve(__dirname, '../GeoLeaf-Plugins/plugin-storage/src/core/geoleaf.storage.js')]:
            path.resolve(__dirname, 'src/modules'),
    };

    function tryExtensions(base) {
        for (const ext of ['', '.js', '/index.js']) {
            if (fs.existsSync(base + ext)) return base + ext;
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
                    else if (entry.name.endsWith('.js')) {
                        const key = entry.name.replace(/\.js$/, '');
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

            const pluginsRoot = path.resolve(__dirname, '../GeoLeaf-Plugins');
            if (!importer.startsWith(pluginsRoot)) return null;

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
          premiumAliases,
          premiumCoreRedirect(),
          resolve({ browser: true, preferBuiltins: false }),
          commonjs(),
          swVersionPlugin(pkg.version),  // Emit dist/sw.js alongside storage plugin
        ],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        output: {
          file: "dist/geoleaf-storage.plugin.js",
          format: "iife",
          name: "GeoLeafStoragePlugin",
          sourcemap: false,
          globals: { leaflet: "L", "leaflet.markercluster": "L" },
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
        plugins: [premiumAliases, premiumCoreRedirect(), resolve({ browser: true, preferBuiltins: false }), commonjs()],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        output: {
          file: "dist/geoleaf-addpoi.plugin.js",
          format: "iife",
          name: "GeoLeafAddPoiPlugin",
          sourcemap: false,
          globals: { leaflet: "L", "leaflet.markercluster": "L" },
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

// Phase 7 B13: esmConfig activé — architecture ESM + tree-shaking enabled
export default [umdConfig, umdMinConfig, esmConfig, ...storagePluginConfigs, ...addPoiPluginConfigs];
