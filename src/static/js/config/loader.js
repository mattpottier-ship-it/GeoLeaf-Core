/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * Namespace global GeoLeaf
     */
    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});

    /**
     * Logger unifié
     */
    const Log = GeoLeaf.Log;

    /**
     * Module Config.Loader
     *
     * Responsabilités :
     * - Chargement HTTP via fetch() avec validation CSRF/XSS
     * - Validation Content-Type stricte
     * - Gestion des headers personnalisés
     * - Helper générique _fetchJson()
     */
    const LoaderModule = {
        /**
         * Charge une configuration depuis une URL JSON et retourne l'objet.
         *
         * @param {string} url - URL du fichier JSON
         * @param {Object} [options] - Options de chargement
         * @param {Object} [options.headers] - Headers HTTP personnalisés (ex: CSRF token)
         * @param {boolean} [options.strictContentType=true] - Validation stricte du Content-Type
         * @returns {Promise<Object>}
         * @example
         * Loader.loadUrl('/api/config.json', {
         *     headers: { 'X-CSRF-Token': '...' },
         *     strictContentType: true
         * })
         */
        loadUrl(url, options = {}) {
            if (!url) {
                Log.warn("[GeoLeaf.Config.Loader] URL JSON manquante dans loadUrl().");
                return Promise.resolve({});
            }

            const { headers = {}, strictContentType = true } = options;

            // Validation de l'URL avec le module Security
            const Security =
                typeof GeoLeaf !== "undefined" && GeoLeaf.Security
                    ? GeoLeaf.Security
                    : null;

            // Pour les URLs relatives (commençant par ./ ou ../ ou /), on les laisse passer
            const isRelative = /^\.{0,2}\//.test(url) || /^\/[^/]/.test(url);

            if (!isRelative) {
                // URL absolue : validation stricte avec Security.validateUrl
                if (Security && typeof Security.validateUrl === "function") {
                    try {
                        url = Security.validateUrl(url);
                    } catch (e) {
                        const errMsg = "[GeoLeaf.Config.Loader] " + e.message;
                        Log.error(errMsg);
                        return Promise.reject(new Error(errMsg));
                    }
                } else {
                    // Fallback : vérification basique si Security pas disponible
                    if (!/^https?:\/\//i.test(url)) {
                        const errMsg =
                            "[GeoLeaf.Config.Loader] URL doit être relative ou commencer par http:// ou https://";
                        Log.error(errMsg);
                        return Promise.reject(new Error(errMsg));
                    }
                }
            }

            // Configuration fetch avec headers personnalisés
            const fetchOptions = {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...headers
                }
            };

            return fetch(url, fetchOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("HTTP " + response.status + " pour " + url);
                    }

                    // Validation Content-Type stricte
                    const contentType = response.headers.get("content-type");
                    if (strictContentType) {
                        if (!contentType || !contentType.includes("application/json")) {
                            throw new Error(
                                "[GeoLeaf.Config.Loader] Content-Type invalide: attendu 'application/json', reçu '" +
                                (contentType || "null") +
                                "'. Cela peut indiquer une attaque XSS ou un serveur mal configuré."
                            );
                        }
                    } else if (contentType && !contentType.includes("application/json")) {
                        Log.warn("[GeoLeaf.Config.Loader] Content-Type inattendu:", contentType);
                    }

                    // Security: Wrap response.json() to handle parse errors
                    return response.json().catch((parseErr) => {
                        const errMsg = "[GeoLeaf.Config.Loader] Erreur de parsing JSON pour " + url + ": " + parseErr.message;
                        Log.error(errMsg);
                        throw new Error(errMsg);
                    });
                })
                .then((jsonCfg) => {
                    if (typeof jsonCfg !== "object" || jsonCfg === null) {
                        throw new Error("Le JSON de configuration n'est pas un objet valide.");
                    }

                    return jsonCfg;
                })
                .catch((err) => {
                    Log.error("[GeoLeaf.Config.Loader] Erreur lors du chargement JSON :", err);
                    throw err;
                });
        },

        /**
         * Helper interne pour charger un JSON sans le fusionner dans la configuration.
         *
         * @param {string} url
         * @param {Object} [options]
         * @param {Object} [options.headers]
         * @param {boolean} [options.strictContentType=true]
         * @returns {Promise<Object|null>}
         */
        fetchJson(url, options = {}) {
            if (!url) {
                Log.warn("[GeoLeaf.Config.Loader] fetchJson() appelé sans URL.");
                return Promise.resolve(null);
            }

            const { headers = {}, strictContentType = true } = options;

            const Security =
                typeof GeoLeaf !== "undefined" && GeoLeaf.Security
                    ? GeoLeaf.Security
                    : null;

            const isRelative =
                /^\.{0,2}\//.test(url) || /^\/[^/]/.test(url);

            if (!isRelative) {
                if (Security && typeof Security.validateUrl === "function") {
                    try {
                        url = Security.validateUrl(url);
                    } catch (e) {
                        const errMsg =
                            "[GeoLeaf.Config.Loader] " + e.message;
                        Log.error(errMsg);
                        return Promise.reject(new Error(errMsg));
                    }
                } else {
                    if (!/^https?:\/\//i.test(url)) {
                        const errMsg =
                            "[GeoLeaf.Config.Loader] URL doit être relative ou commencer par http:// ou https://";
                        Log.error(errMsg);
                        return Promise.reject(new Error(errMsg));
                    }
                }
            }

            const fetchOptions = {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...headers
                }
            };

            return fetch(url, fetchOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("HTTP " + response.status + " pour " + url);
                    }

                    const contentType = response.headers.get("content-type");
                    if (strictContentType) {
                        if (!contentType || !contentType.includes("application/json")) {
                            throw new Error(
                                "[GeoLeaf.Config.Loader] Content-Type invalide dans fetchJson: attendu 'application/json', reçu '" +
                                (contentType || "null") +
                                "'."
                            );
                        }
                    } else if (contentType && !contentType.includes("application/json")) {
                        Log.warn("[GeoLeaf.Config.Loader] fetchJson() Content-Type inattendu:", contentType);
                    }

                    // Security: Wrap response.json() to handle parse errors
                    return response.json().catch((parseErr) => {
                        const errMsg = "[GeoLeaf.Config.Loader] Erreur de parsing JSON dans fetchJson pour " + url + ": " + parseErr.message;
                        Log.error(errMsg);
                        throw new Error(errMsg);
                    });
                })
                .then((json) => {
                    if (typeof json !== "object" || json === null) {
                        Log.warn(
                            "[GeoLeaf.Config.Loader] fetchJson() a reçu un JSON non-objet pour l'URL :",
                            url
                        );
                    }
                    return json;
                })
                .catch((err) => {
                    Log.error(
                        "[GeoLeaf.Config.Loader] Erreur fetchJson() pour " + url + " :",
                        err
                    );
                    throw err; // Re-throw pour que l'appelant puisse gérer l'erreur
                });
        }
    };

    // Exposer le module
    GeoLeaf._ConfigLoader = LoaderModule;
})(window);
