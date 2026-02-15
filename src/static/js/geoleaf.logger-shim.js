/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/*!
 * GeoLeaf – Logger Shim
 * Initialise window.GeoLeaf.Log avec fallback console
 * À charger EN PREMIER dans index.html avant tous les modules
 */
(function (root) {
    "use strict";

    // Initialiser GeoLeaf si inexistant
    root.GeoLeaf = root.GeoLeaf || {};

    // Définir Log avec fallback console
    root.GeoLeaf.Log = root.GeoLeaf.Log || {
        debug: (...args) => console.debug(...args),
        info: (...args) => { if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.info) { GeoLeaf.Log.info(...args); } },
        warn: (...args) => { if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.warn) { GeoLeaf.Log.warn(...args); } },
        error: (...args) => { if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.error) { GeoLeaf.Log.error(...args); } }
    };
})(typeof self !== "undefined" ? self : this);
