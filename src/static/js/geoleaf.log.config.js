/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * Configuration globale des logs pour GeoLeaf
 * Applique automatiquement les bonnes configurations de log selon l'environnement
 */

(function() {
    "use strict";

    // Attendre que GeoLeaf.Log soit chargé
    function configureLogging() {
        if (!window.GeoLeaf || !window.GeoLeaf.Log) {
            setTimeout(configureLogging, 50);
            return;
        }

        const Log = window.GeoLeaf.Log;

        // Détecter l'environnement
        const isProduction = location.hostname !== 'localhost' && !location.hostname.includes('127.0.0.1') && !location.search.includes('debug=true');
        const isDebug = location.search.includes('debug=true') || location.search.includes('verbose=true');

        if (isProduction) {
            // Production: seulement warnings et erreurs + mode silencieux
            Log.setLevel('production');
            if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.info) { GeoLeaf.Log.info("🔧 [GeoLeaf] Mode production activé - logs réduits"); }
        } else if (isDebug) {
            // Debug explicite: tous les logs
            Log.setLevel('debug');
            Log.setQuietMode(false);
            if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.info) { GeoLeaf.Log.info("🔧 [GeoLeaf] Mode debug activé - tous les logs visibles"); }
        } else {
            // Développement: logs informatifs avec mode silencieux pour réduire les répétitions
            Log.setLevel('info');
            Log.setQuietMode(true);
            if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.info) { GeoLeaf.Log.info("🔧 [GeoLeaf] Mode développement - logs optimisés"); }
        }

        // Afficher un résumé après chargement complet
        setTimeout(() => {
            if (Log.showSummary) {
                Log.showSummary();
            }

            // Afficher un résumé de démarrage concis
            const endTime = performance.now();
            if (window.GeoLeaf && GeoLeaf.Log && GeoLeaf.Log.info) {
                GeoLeaf.Log.info("🎯 [GeoLeaf] Démarrage terminé:", {
                    "⏱️ Temps total": Math.round(endTime) + "ms",
                    "📦 Modules": "122 chargés",
                    "🔇 Logs": isProduction ? "mode production" : (isDebug ? "mode debug" : "mode optimisé"),
                    "💡 Conseil": isDebug ? "" : "Ajoutez ?debug=true pour les logs détaillés"
                });
            }
        }, 3000);
    }

    // Démarrer la configuration dès que possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configureLogging);
    } else {
        configureLogging();
    }
})();
