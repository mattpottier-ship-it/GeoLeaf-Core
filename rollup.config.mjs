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
const INPUT_FILE = "src/bundle-entry.js";
const STORAGE_PLUGIN = "src/plugins/geoleaf-storage.plugin.js";
const ADDPOI_PLUGIN = "src/plugins/geoleaf-addpoi.plugin.js";

import terser from "@rollup/plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import filesize from "rollup-plugin-filesize";
import fs from "node:fs";
import path from "node:path";

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
  external: ["leaflet", "leaflet.markercluster"],

  // Tree-shaking — les modules IIFE sont des side-effects par nature
  treeshake: {
    moduleSideEffects: true,            // Conserver les IIFE (side-effects sur window.GeoLeaf)
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: false,
    annotations: true,
  },
};

/**
 * Bundle UMD non minifié – utile en dev (CDN, script direct).
 * → Sourcemap activé.
 */
const umdConfig = {
  ...baseConfig,
  output: {
    file: "dist/geoleaf.umd.js",
    format: "umd",
    name: "GeoLeaf", // Nom du global exposé en mode <script>
    sourcemap: true,
    globals: {
      leaflet: "L",
      "leaflet.markercluster": "L",
    },
    // Optimisations output
    compact: false,  // Lisible en dev
    exports: "named"
  },
};

/**
 * Bundle UMD minifié – version de production pour CDN.
 * → Minification via Terser + sourcemap activé + analyse bundle.
 * Sprint 7.1: Compression et mangling agressifs
 */
const umdMinConfig = {
  ...baseConfig,
  output: {
    file: "dist/geoleaf.min.js",
    format: "umd",
    name: "GeoLeaf",
    sourcemap: true,
    globals: {
      leaflet: "L",
      "leaflet.markercluster": "L",
    },
    // Optimisations output
    compact: true,    // Compact en prod
    exports: "named"
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
        pure_funcs: ['console.log', 'console.debug'],  // Strip verbose logging du bundle de production
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

      sourceMap: true,              // Source maps
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
    })
  ],
};

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
          sourcemap: true,
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
        plugins: [resolve({ browser: true, preferBuiltins: false }), commonjs()],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        output: {
          file: "dist/geoleaf-addpoi.plugin.js",
          format: "iife",
          name: "GeoLeafAddPoiPlugin",
          sourcemap: true,
          globals: { leaflet: "L", "leaflet.markercluster": "L" },
        },
      },
    ]
  : [];

/**
 * Custom Rollup plugin — Service Worker version injection.
 * Reads the SW template, replaces __GEOLEAF_VERSION__ placeholders,
 * and emits dist/sw.js as a raw asset (no bundling/wrapping).
 * Attached to the Storage plugin build so sw.js is only produced
 * when the Storage module is being built.
 */
function swVersionPlugin(version) {
  const SW_SOURCE = "src/static/js/storage/sw.js";
  return {
    name: "sw-version-inject",
    generateBundle() {
      if (!fs.existsSync(SW_SOURCE)) return;
      const content = fs.readFileSync(SW_SOURCE, "utf-8")
        .replaceAll("__GEOLEAF_VERSION__", version);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: content,
      });
    },
  };
}

export default [umdConfig, umdMinConfig, ...storagePluginConfigs, ...addPoiPluginConfigs];
