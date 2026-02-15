/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

(function (global) {
    "use strict";

    /**
     * GeoLeaf.Log — gestion centralisée des logs
     *
     * Objectif :
     * - remplacer tous les console.log/console.warn/... du projet
     * - fournir un niveau de verbosité configurable via la config JSON
     * - s’assurer que chaque message possède un préfixe normalisé [GeoLeaf.X]
     */

    if (!global.GeoLeaf) global.GeoLeaf = {};

    const LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    let currentLevel = LEVELS.INFO; // niveau par défaut
    let quietMode = false; // mode silencieux pour les logs répétitifs
    let suppressedMessages = new Set(); // pour éviter les répétitions
    let groupedMessageCounts = new Map(); // pour grouper les messages similaires

    const formatPrefix = (type) => `[GeoLeaf.${type}]`;

    // Détecte si un message est répétitif ou informatif non critique
    const isRepetitiveMessage = (message) => {
        const patterns = [
            /Chargement du sprite SVG/,
            /Sprite SVG détecté/,
            /IconsConfig récupéré/,
            /Module.*chargé/,
            /Module.*initialisé/,
            /Contrôle.*ajouté/,
            /Bouton.*ajouté/,
            /Panneau.*créé/,
            /Section.*remplie/,
            /Profil.*chargé/,
            /Couche.*chargée/,
            /Style.*appliqué/,
            /ThemeApplier/,
            /LayerManager/,
            /Storage/,
            /CacheButton/,
            /Renderers\./,
            /FormRenderer/,
            /ResourceEnumerator/,
            /LayerSelector/,
            /CacheControl/,
            /POI.*DEBUG/,
            /AddForm/
        ];
        return patterns.some(pattern => pattern.test(message));
    };

    // Messages critiques qui doivent toujours être affichés
    const isCriticalMessage = (message) => {
        const criticalPatterns = [
            /ERROR/,
            /WARN/,
            /Failed/,
            /Error/,
            /Exception/,
            /Carte initialisée avec succès/,
            /All.*modules loaded/,
            /Mode.*activé/
        ];
        return criticalPatterns.some(pattern => pattern.test(message));
    };

    // Gère les messages groupés
    const handleGroupedMessage = (message, args) => {
        const key = message.replace(/\d+/g, 'X').replace(/[{}:,]/g, ''); // normalise
        const count = (groupedMessageCounts.get(key) || 0) + 1;
        groupedMessageCounts.set(key, count);

        if (count === 1) {
            return true; // affiche le premier
        } else if (count === 3 && !isCriticalMessage(message)) {
            console.info(`${formatPrefix('INFO')} [Groupé] Message répété - suite masquée: ${message.substring(0, 60)}...`);
            return false;
        } else if (count > 3) {
            return false; // supprime après 3 occurrences pour les non-critiques
        }
        return count <= 2; // affiche max 2 fois les messages non critiques
    };

    const Log = {
        /**
         * Définir le niveau de logs global
         * @param {string} level  "debug" | "info" | "warn" | "error"
         */
        setLevel(level) {
            const lvl = String(level).toLowerCase();
            switch (lvl) {
                case "debug":
                    currentLevel = LEVELS.DEBUG;
                    break;
                case "info":
                    currentLevel = LEVELS.INFO;
                    break;
                case "warn":
                    currentLevel = LEVELS.WARN;
                    break;
                case "error":
                    currentLevel = LEVELS.ERROR;
                    break;
                case "production":
                    currentLevel = LEVELS.WARN; // En production, seulement WARN et ERROR
                    quietMode = true;
                    break;
                default:
                    console.warn(`${formatPrefix("WARN")} Niveau de log inconnu :`, level);
            }
        },

        /**
         * Active/désactive le mode silencieux pour les messages répétitifs
         */
        setQuietMode(enabled) {
            if (quietMode === enabled) return; // éviter les répétitions
            quietMode = enabled;
            if (enabled) {
                console.info(`${formatPrefix("INFO")} Mode silencieux activé - logs répétitifs réduits`);
            }
        },

        /**
         * Affiche un résumé des messages groupés
         */
        showSummary() {
            if (groupedMessageCounts.size > 0) {
                console.group(`${formatPrefix("INFO")} Résumé des logs groupés:`);
                for (const [message, count] of groupedMessageCounts) {
                    if (count > 3) {
                        console.info(`• ${count}x: ${message.substring(0, 60)}...`);
                    }
                }
                console.groupEnd();
            }
        },

        debug(...args) {
            if (currentLevel <= LEVELS.DEBUG) {
                const message = args.join(' ');
                if (quietMode && isRepetitiveMessage(message)) {
                    if (!handleGroupedMessage(message, args)) return;
                }
                console.debug(formatPrefix("DEBUG"), ...args);
            }
        },

        info(...args) {
            if (currentLevel <= LEVELS.INFO) {
                const message = args.join(' ');

                // En mode silencieux, filtrer plus agressivement
                if (quietMode) {
                    // Toujours afficher les messages critiques
                    if (isCriticalMessage(message)) {
                        console.info(formatPrefix("INFO"), ...args);
                        return;
                    }

                    // Grouper/masquer les messages répétitifs
                    if (isRepetitiveMessage(message)) {
                        if (!handleGroupedMessage(message, args)) return;
                    }
                }

                console.info(formatPrefix("INFO"), ...args);
            }
        },

        warn(...args) {
            if (currentLevel <= LEVELS.WARN) {
                console.warn(formatPrefix("WARN"), ...args);
            }
        },

        error(...args) {
            if (currentLevel <= LEVELS.ERROR) {
                console.error(formatPrefix("ERROR"), ...args);
            }
        }
    };

    global.GeoLeaf.Log = Log;

})(typeof globalThis !== "undefined" ? globalThis : window);
