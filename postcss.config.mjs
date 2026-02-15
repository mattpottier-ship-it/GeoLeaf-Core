// postcss.config.mjs
// Pipeline CSS GeoLeaf – Phase 3.3
// Gestion des @import + minification

import postcssImport from "postcss-import";
import cssnano from "cssnano";

export default {
  plugins: [
    postcssImport(),
    cssnano({
      preset: "default",
    }),
  ],
};
