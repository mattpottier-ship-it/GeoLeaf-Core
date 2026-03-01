/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from "../log/index.js";
import { Security } from "../security/index.js";
import type { LoadUrlOptions } from "./geoleaf-config/config-types.js";

let _cachedSecurity: typeof Security | null = null;
function _getSecurity(): typeof Security | null {
    if (_cachedSecurity !== null) return _cachedSecurity;
    _cachedSecurity = Security ?? null;
    return _cachedSecurity;
}

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
    loadUrl(url: string, options: LoadUrlOptions = {}): Promise<Record<string, unknown>> {
        if (!url) {
            Log.warn("[GeoLeaf.Config.Loader] URL JSON manquante dans loadUrl().");
            return Promise.resolve({});
        }
        const { headers = {}, strictContentType = true } = options;
        const Security = _getSecurity();
        const isRelative = /^\.{0,2}\//.test(url) || /^\/[^/]/.test(url);
        if (!isRelative) {
            if (Security && typeof Security.validateUrl === "function") {
                try {
                    url = Security.validateUrl(url);
                } catch (e) {
                    const errMsg =
                        "[GeoLeaf.Config.Loader] " + (e instanceof Error ? e.message : String(e));
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
        const fetchOptions: RequestInit = {
            method: "GET",
            headers: { Accept: "application/json", ...headers },
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
                            "[GeoLeaf.Config.Loader] Content-Type invalide: attendu 'application/json', reçu '" +
                                (contentType || "null") +
                                "'. Cela peut indiquer une attaque XSS ou un serveur mal configuré."
                        );
                    }
                } else if (contentType && !contentType.includes("application/json")) {
                    Log.warn("[GeoLeaf.Config.Loader] Content-Type inattendu:", contentType);
                }
                return response.json().catch((parseErr: Error) => {
                    const errMsg =
                        "[GeoLeaf.Config.Loader] Erreur de parsing JSON pour " +
                        url +
                        ": " +
                        parseErr.message;
                    Log.error(errMsg);
                    throw new Error(errMsg);
                });
            })
            .then((jsonCfg: unknown) => {
                if (typeof jsonCfg !== "object" || jsonCfg === null) {
                    throw new Error("Le JSON de configuration n'est pas un objet valide.");
                }
                return jsonCfg as Record<string, unknown>;
            })
            .catch((err: Error) => {
                Log.error("[GeoLeaf.Config.Loader] Erreur lors du chargement JSON :", err);
                throw err;
            });
    },

    fetchJson(url: string, options: LoadUrlOptions = {}): Promise<Record<string, unknown> | null> {
        if (!url) {
            Log.warn("[GeoLeaf.Config.Loader] fetchJson() appelé sans URL.");
            return Promise.resolve(null);
        }
        const { headers = {}, strictContentType = true } = options;
        const Security = _getSecurity();
        const isRelative = /^\.{0,2}\//.test(url) || /^\/[^/]/.test(url);
        if (!isRelative) {
            if (Security && typeof Security.validateUrl === "function") {
                try {
                    url = Security.validateUrl(url);
                } catch (e) {
                    const errMsg =
                        "[GeoLeaf.Config.Loader] " + (e instanceof Error ? e.message : String(e));
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
        const fetchOptions: RequestInit = {
            method: "GET",
            headers: { Accept: "application/json", ...headers },
        };
        return fetch(url, fetchOptions)
            .then((response) => {
                if (!response.ok) throw new Error("HTTP " + response.status + " pour " + url);
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
                    Log.warn(
                        "[GeoLeaf.Config.Loader] fetchJson() Content-Type inattendu:",
                        contentType
                    );
                }
                return response.json().catch((parseErr: Error) => {
                    const errMsg =
                        "[GeoLeaf.Config.Loader] Erreur de parsing JSON dans fetchJson pour " +
                        url +
                        ": " +
                        parseErr.message;
                    Log.error(errMsg);
                    throw new Error(errMsg);
                });
            })
            .then((json: unknown) => {
                if (typeof json !== "object" || json === null) {
                    Log.warn(
                        "[GeoLeaf.Config.Loader] fetchJson() a reçu un JSON non-objet pour l'URL :",
                        url
                    );
                }
                return json as Record<string, unknown> | null;
            })
            .catch((err: Error) => {
                Log.error("[GeoLeaf.Config.Loader] Erreur fetchJson() pour " + url + " :", err);
                throw err;
            });
    },
};

const ProfileLoader = LoaderModule;
export { ProfileLoader };
