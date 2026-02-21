// postcss.config.mjs
// Pipeline CSS GeoLeaf – Phase 3.3 / Phase 8.5.4
// Gestion des @import + minification agressive

import postcssImport from "postcss-import";
import cssnano from "cssnano";

export default {
  plugins: [
    postcssImport(),
    cssnano({
      preset: [
        "default",
        {
          // Normaliser les whitespaces et valeurs
          normalizeWhitespace: true,
          // Dédupliquer les règles (réduit les répétitions)
          discardDuplicates: true,
          // Supprimer les commentaires
          discardComments: { removeAll: true },
          // Optimiser les valeurs numériques
          convertValues: true,
          // Minifier les sélecteurs
          minifySelectors: true,
          // Minifier les déclarations de police
          minifyFontValues: true,
          // Minifier les dégradés
          minifyGradients: true,
          // Réduire les propriétés de transformation
          minifyParams: true,
          // SVG inline: minifier
          svgo: true,
          // Réduire les URLs
          normalizeUrl: true
        }
      ]
    })
  ]
};

