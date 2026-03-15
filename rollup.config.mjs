// rollup.config.mjs
// Official GeoLeaf build pipeline – Phase 3.x + Sprint 7.1 Optimizations
// Goal: produce standalone bundles (UMD) only:
// - geoleaf.umd.js (dev)
// - geoleaf.min.js (prod)
// with minification + sourcemaps + bundle analysis + advanced optimizations.

// Sprint 7.1: Bundle & Runtime Optimizations
// - Visualizer for bundle analysis (stats.html)
// - Aggressive tree-shaking
// - Dead code elimination via Terser
// - Advanced compression (mangle, compress)
// - Filesize reporter

// ⚠️ Entry point: bundle-entry.js imports all modules in the correct order
// It groups all modules (Core, UI, Config, POI, GeoJSON, Route, Legend, etc.).
// ✅ Load order managed by bundle-entry.js:
//    1. geoleaf.log.js (logger)
//    2. geoleaf.constants.js (global constants)
//    3. geoleaf.utils.js (shared utilities)
//    4. geoleaf.core.js, geoleaf.ui.js, geoleaf.config.js, etc.
//    5. geoleaf.api.js (public API)
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

/** Alias to resolve @storage and @addpoi from plugin configs (Phase 7) */
const premiumAliases = alias({
    entries: [
        { find: '@storage', replacement: path.resolve(__dirname, '../plugin-storage/src') },
        { find: '@addpoi',  replacement: path.resolve(__dirname, '../plugin-addpoi/src') },
    ],
});

// Read version from package.json for dynamic injection
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

/**
 * Main Rollup configuration for GeoLeaf.
 * - external: Leaflet and MarkerCluster are assumed to be already present in the browser.
 * - treeshake: aggressive configuration to eliminate dead code.
 */
const baseConfig = {
  input: INPUT_FILE,
  plugins: [
    // Build version injection — replaces __GEOLEAF_VERSION__ in JS sources
    replace({
      preventAssignment: true,
      values: {
        '__GEOLEAF_VERSION__': JSON.stringify(pkg.version),
        '__SW_DEBUG__': process.env.NODE_ENV !== 'production' ? 'true' : 'false',
      }
    }),
    // Sprint 5: TypeScript — before resolve/commonjs to process .ts files
    // noEmit: true — Rollup handles JS output; TS only type-checks (required by allowImportingTsExtensions)
    typescript({ tsconfig: './tsconfig.json', compilerOptions: { noEmit: true } }),
    // Node.js module resolution (when needed)
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.ts', '.js']
    }),
    // CommonJS support (conversion to ESM)
    commonjs(),
    // File size reporter removed (rollup-plugin-filesize has vulnerable dependencies)
    // Use dist/stats.html (rollup-plugin-visualizer) for bundle analysis
  ],
  external: ["leaflet", "leaflet.markercluster", "leaflet.vectorgrid", "maplibre-gl", "@maplibre/maplibre-gl-leaflet"],

  // Tree-shaking UMD — preserve all side-effects (app/*, globals.js, sw-register.js…)
  // ⚠️ Do not filter here: app/boot.js, app/init.js etc. are pure side-effect imports.
  // ⚠️ unknownGlobalSideEffects MUST be true: modules that mutate window.GeoLeaf via
  //    variables derived from globalThis (e.g. api/geoleaf-api.js → Object.assign) would
  //    be incorrectly eliminated if Rollup treats globalThis as a stateless local object.
  // Suppress TS5096: @rollup/plugin-typescript v12 fires this even when noEmit is set
  // because the check runs before compilerOptions overrides are applied.
  onwarn(warning, warn) {
    if (warning.plugin === 'typescript' && warning.message.includes('TS5096')) return;
    warn(warning);
  },
  treeshake: {
    moduleSideEffects: true,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: true,
    annotations: true,
  },
};

/**
 * ESM Bundle — ESM version for bundlers (native import/export).
 * Phase 7 B13: enabled — tree-shaking + ~50 named exports + lazy chunks in dist/chunks/.
 * Dedicated entry: bundle-esm-entry.js (separate from the UMD bundle to avoid polluting window.GeoLeaf).
 */
const esmConfig = {
  ...baseConfig,
  input: INPUT_FILE_ESM,
  // ESM tree-shaking: only globals.js + sw-register.js + app/* have real side-effects
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
      // PERF-01: thematic manualChunks to avoid combinatorial explosion.
      // Without grouping, Rollup creates one chunk per unique dependency combination
      // between the ~12 dynamic imports → 300+ duplicated chunks.
      // With thematic grouping → ~15 stable reusable chunks.
    manualChunks(id) {
      const norm = id.replace(/\\/g, '/');

      // 1. Lazy entry points → explicitly named chunks (same name as source files)
      if (norm.includes('/src/lazy/')) {
        return path.basename(norm, path.extname(norm));
      }

      // 2. Thematic groups — modules shared between multiple lazy chunks
      // Legend (legend-generator, legend-renderer, legend-control, geoleaf.legend)
      if (norm.includes('/modules/legend/') || norm.includes('/modules/geoleaf.legend')) {
        return 'chunk-legend';
      }
      // Full POI (shared, normalizers, markers, core, sidepanel, renderers/*, contracts/poi*)
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
      // Referenced by almost everything — placed in a single shared chunk
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
 * Unminified UMD Bundle – useful in dev (CDN, direct script).
 * Sprint 6: inlineDynamicImports — chunks are inlined (single bundle).
 * → Sourcemap enabled.
 * PERF-UMD-DIAG: visualizer added to analyze raw bundle composition (#6).
 */
const umdConfig = {
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins || []),
    // PERF-UMD-DIAG: raw unminified stats to identify heavy modules (#6)
    visualizer({
      filename: "dist/stats-umd-dev.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
      title: "GeoLeaf UMD Dev — Bundle Analysis",
      sourcemap: true,
    }),
  ],
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
 * Minified UMD Bundle – production version for CDN.
 * Sprint 6: inlineDynamicImports — chunks are inlined (single bundle).
 * → Minification via Terser + bundle analysis.
 * Sprint 7.1: Aggressive compression and mangling
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

    // Bundle visualizer (stats.html) - Sprint 7.1
    visualizer({
      filename: "dist/stats.html",
      open: false,                  // Do not open automatically
      gzipSize: true,              // Show gzip size
      brotliSize: true,            // Show brotli size
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
 * Loaded after the core bundle. Attaches to window.GeoLeaf.Storage.
 * ⚠️ Conditional: only built if the source file exists (open-source clones exclude it).
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
            compilerOptions: { noEmit: true, outDir: path.resolve(__dirname, 'dist'), declarationDir: undefined },
          }),
          resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
          commonjs(),
        ],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        onwarn(warning, warn) {
          if (warning.plugin === 'typescript' && warning.message.includes('TS5096')) return;
          warn(warning);
        },
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
 * Loaded after the core bundle. Attaches to window.GeoLeaf.POI.AddForm.
 * ⚠️ Conditional: only built if the source file exists.
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
            compilerOptions: { noEmit: true, outDir: path.resolve(__dirname, 'dist'), declarationDir: undefined },
          }),
          resolve({ browser: true, preferBuiltins: false, extensions: ['.ts', '.js'] }),
          commonjs(),
        ],
        external: ["leaflet", "leaflet.markercluster"],
        treeshake: { moduleSideEffects: true },
        onwarn(warning, warn) {
          if (warning.plugin === 'typescript' && warning.message.includes('TS5096')) return;
          warn(warning);
        },
        output: {
          file: "dist/geoleaf-addpoi.plugin.js",
          format: "es",
          sourcemap: false,
        },
      },
    ]
  : [];

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
    // Copy sw-core.js to packages/core/ root for local dev serving
    writeBundle(options) {
      const distFile = path.join(options.dir || path.dirname(options.file || "dist/geoleaf.min.js"), "sw-core.js");
      const pkgCoreDir = path.resolve(__dirname);
      const destFile = path.resolve(pkgCoreDir, "sw-core.js");
      if (fs.existsSync(distFile)) {
        fs.copyFileSync(distFile, destFile);
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
  const WORKER_TS = path.resolve(__dirname, "src/modules/geojson/geojson-worker.ts");
  const WORKER_JS = path.resolve(__dirname, "src/modules/geojson/geojson-worker.js");
  return {
    name: "geojson-worker-emit",
    generateBundle() {
      const workerPath = fs.existsSync(WORKER_TS) ? WORKER_TS : fs.existsSync(WORKER_JS) ? WORKER_JS : null;
      if (!workerPath) return;
      let content = fs.readFileSync(workerPath, "utf-8");
      if (workerPath.endsWith(".ts")) {
        const out = ts.transpileModule(content, {
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, strict: true },
          fileName: "geojson-worker.ts",
        });
        content = out.outputText;
      }
      content = content.replaceAll("__GEOLEAF_VERSION__", version);
      this.emitFile({
        type: "asset",
        fileName: "geojson-worker.js",
        source: content,
      });
    },
  };
}

/**
 * PERF-TS1 — Granular ESM build (preserveModules: true)
 * Generates one .js file per source module in dist/esm/.
 * Allows consumers (Webpack/Vite) to tree-shake at module level.
 * Do not include in the CDN bundle — bundler use only.
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
    // outDir and declarationDir must be under dist/esm to satisfy the TS plugin
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
 * Plugin Rollup custom — redirige imports de globals.js → globals-lite.ts dans les builds Lite.
 * This prevents app/init.ts, app/boot.ts and app/helpers.ts from pulling in the full globals
 * (which includes table/labels/route/vector-tiles/mobile-toolbar/desktop-panel).
 * PERF-02-FIX: root cause of Lite bundle > Full bundle (#7).
 */
function liteGlobalsAlias() {
  const srcModules = path.resolve(__dirname, 'src/modules');
  const srcDir     = path.resolve(__dirname, 'src');
  const replacements = {
    globals:              path.resolve(srcModules, 'globals-lite.ts'),
    labelsLabels:         path.resolve(srcModules, 'labels/labels-lite.ts'),
    labelsButtonManager:  path.resolve(srcModules, 'labels/label-button-manager-lite.ts'),
    geoleafRoute:         path.resolve(srcModules, 'geoleaf.route-lite.ts'),
    routeFilter:          path.resolve(srcModules, 'filters/route-filter-lite.ts'),
  };
  return {
    name: 'lite-globals-alias',
    resolveId(source, importer) {
      // 1. Redirect globals.js → globals-lite.ts (any path prefix, not globals-lite/globals.core etc.)
      if (/(?:^|[/\\])globals\.(?:js|ts)$/.test(source)) {
        return replacements.globals;
      }
      // 2. Resolve relative imports to absolute path for targeted aliasing
      if (source.startsWith('.') && importer) {
        const abs = path.resolve(path.dirname(importer), source).replace(/\\/g, '/');
        if (/\/labels\/labels\.(js|ts)$/.test(abs))               return replacements.labelsLabels;
        if (/\/labels\/label-button-manager\.(js|ts)$/.test(abs)) return replacements.labelsButtonManager;
        if (/\/modules\/geoleaf\.route\.(js|ts)$/.test(abs))      return replacements.geoleafRoute;
        if (/\/filters\/route-filter\.(js|ts)$/.test(abs))        return replacements.routeFilter;
      }
      // 3. Also handle non-relative imports of geoleaf.route (e.g. bare specifier)
      if (/(?:^|[/\\])geoleaf\.route\.(js|ts)$/.test(source)) {
        return replacements.geoleafRoute;
      }
      return null;
    },
  };
}

/**
 * PERF-02 — UMD "Core Lite" build (without table / labels / route / vector-tiles)
 * Target: gzip < 130 KB (vs 148 KB full).
 * Use: CDN for projects not using these optional modules.
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
    // PERF-02-FIX: globals.js → globals-lite.ts to exclude table/labels/route/vector-tiles (#7)
    liteGlobalsAlias(),
    ...(baseConfig.plugins || []),
    minify({ target: "es2015", legalComments: "none" }),
    // PERF-02-DIAG: gzip stats of the lite build to identify unexpected modules (#7)
    visualizer({
      filename: "dist/stats-lite.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
      title: "GeoLeaf Lite — Bundle Analysis",
      sourcemap: true,
    }),
  ],
};

/**
 * PERF-02 — Build ESM granulaire "Core Lite" (preserveModules)
 */
const esmLiteGranularConfig = {
  ...esmGranularConfig,
  input: INPUT_FILE_LITE,
  plugins: [
    // PERF-02-FIX: same alias as umdLiteConfig (#7)
    liteGlobalsAlias(),
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

// Phase 7 B13: esmConfig enabled — ESM architecture + tree-shaking enabled
// PERF-TS1: esmGranularConfig — granular module-by-module build (preserveModules)
// PERF-02: umdLiteConfig + esmLiteGranularConfig — lite builds without table/labels/route
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
