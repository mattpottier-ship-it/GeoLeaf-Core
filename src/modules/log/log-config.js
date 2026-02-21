/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module log/log-config
 * @description Configuration globale des logs pour GeoLeaf.
 * Applique automatiquement les bonnes configurations de log selon l'environnement.
 */

import { Log } from './logger.js';

/**
 * Configure le logger selon l'environnement détecté ou les options fournies.
 *
 * @param {Object} [options]
 * @param {string} [options.level]      - Niveau forcé ("debug"|"info"|"warn"|"error"|"production")
 * @param {boolean} [options.quietMode] - Mode silencieux
 */
export function configureLogging(options = {}) {
    // Si des options explicites sont fournies, les utiliser
    if (options.level) {
        Log.setLevel(options.level);
        if (typeof options.quietMode === 'boolean') {
            Log.setQuietMode(options.quietMode);
        }
        return;
    }

    // Auto-détection de l'environnement (browser only)
    if (typeof location === 'undefined') return;

    const isProduction = location.hostname !== 'localhost'
        && !location.hostname.includes('127.0.0.1')
        && !location.search.includes('debug=true');
    const isDebug = location.search.includes('debug=true')
        || location.search.includes('verbose=true');

    if (isProduction) {
        // Production: seulement warnings et erreurs + mode silencieux
        Log.setLevel('production');
        Log.info("🔧 [GeoLeaf] Mode production activé - logs réduits");
    } else if (isDebug) {
        // Debug explicite: tous les logs
        Log.setLevel('debug');
        Log.setQuietMode(false);
        Log.info("🔧 [GeoLeaf] Mode debug activé - tous les logs visibles");
    } else {
        // Développement: logs informatifs avec mode silencieux
        Log.setLevel('info');
        Log.setQuietMode(true);
        Log.info("🔧 [GeoLeaf] Mode développement - logs optimisés");
    }

    // Afficher un résumé après chargement complet
    if (typeof setTimeout !== 'undefined' && typeof performance !== 'undefined') {
        setTimeout(() => {
            if (Log.showSummary) {
                Log.showSummary();
            }

            const endTime = performance.now();
            Log.info("🎯 [GeoLeaf] Démarrage terminé:", {
                "⏱️ Temps total": Math.round(endTime) + "ms",
                "📦 Modules": (typeof globalThis !== 'undefined' && globalThis.GeoLeaf && typeof globalThis.GeoLeaf._moduleCount === 'number' ? globalThis.GeoLeaf._moduleCount : '?') + " chargés",
                "🔇 Logs": isProduction ? "mode production" : (isDebug ? "mode debug" : "mode optimisé"),
                "💡 Conseil": isDebug ? "" : "Ajoutez ?debug=true pour les logs détaillés"
            });
        }, 3000);
    }
}

// ── Auto-configuration au chargement (side-effect, backward compat) ──
// En mode browser, configure automatiquement au chargement du module.
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => configureLogging());
    } else {
        configureLogging();
    }
}
