// postcss.config.mjs
// GeoLeaf CSS Pipeline – Phase 3.3 / Phase 8.5.4
// Handles @import + aggressive minification

import postcssImport from "postcss-import";
import cssnano from "cssnano";

export default {
  plugins: [
    postcssImport(),
    cssnano({
      preset: [
        "default",
        {
          // Normalize whitespace and values
          normalizeWhitespace: true,
          // Deduplicate rules (reduces repetitions)
          discardDuplicates: true,
          // Remove comments
          discardComments: { removeAll: true },
          // Optimize numeric values
          convertValues: true,
          // Minify selectors
          minifySelectors: true,
          // Minify font declarations
          minifyFontValues: true,
          // Minify gradients
          minifyGradients: true,
          // Reduce transform properties
          minifyParams: true,
          // Inline SVG: minify
          svgo: true,
          // Reduce URLs
          normalizeUrl: true
        }
      ]
    })
  ]
};

