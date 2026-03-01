/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module log/logger
 * @description GeoLeaf.Log — gestion centralisée des logs
 *
 * Objectif :
 * - remplacer tous les console.log/console.warn/... du projet
 * - fournir un niveau de verbosité configurable via la config JSON
 * - s'assurer que chaque message possède un préfixe normalisé [GeoLeaf.X]
 */

export type LogLevelName = "debug" | "info" | "warn" | "error" | "production";

export const LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
} as const;

let currentLevel: number = LEVELS.INFO; // niveau par défaut
let quietMode = false; // mode silencieux pour les logs répétitifs
const _suppressedMessages = new Set<string>(); // pour éviter les répétitions
const groupedMessageCounts = new Map<string, number>(); // pour grouper les messages similaires
const MAX_GROUPED_ENTRIES = 200; // cap to prevent unbounded growth

const formatPrefix = (type: string): string => `[GeoLeaf.${type}]`;

// Détecte si un message est répétitif ou informatif non critique
const isRepetitiveMessage = (message: string): boolean => {
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
        /AddForm/,
    ];
    return patterns.some((pattern) => pattern.test(message));
};

// Messages critiques qui doivent toujours être affichés
const isCriticalMessage = (message: string): boolean => {
    const criticalPatterns = [
        /ERROR/,
        /WARN/,
        /Failed/,
        /Error/,
        /Exception/,
        /Carte initialisée avec succès/,
        /All.*modules loaded/,
        /Mode.*activé/,
    ];
    return criticalPatterns.some((pattern) => pattern.test(message));
};

// Gère les messages groupés
const handleGroupedMessage = (message: string, _args: unknown[]): boolean => {
    const key = message.replace(/\d+/g, "X").replace(/[{}:,]/g, ""); // normalise
    const count = (groupedMessageCounts.get(key) || 0) + 1;
    groupedMessageCounts.set(key, count);

    // Evict oldest entries when cap is reached
    if (groupedMessageCounts.size > MAX_GROUPED_ENTRIES) {
        const firstKey = groupedMessageCounts.keys().next().value;
        if (firstKey !== undefined) groupedMessageCounts.delete(firstKey);
    }

    if (count === 1) {
        return true; // affiche le premier
    } else if (count === 3 && !isCriticalMessage(message)) {
        console.info(
            `${formatPrefix("INFO")} [Groupé] Message répété - suite masquée: ${message.substring(0, 60)}...`
        );
        return false;
    } else if (count > 3) {
        return false; // supprime après 3 occurrences pour les non-critiques
    }
    return count <= 2; // affiche max 2 fois les messages non critiques
};

export interface LogImplInterface {
    setLevel(level: string): void;
    getLevel(): number;
    getLevelName(): string;
    setQuietMode(enabled: boolean): void;
    showSummary(): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

/**
 * Logger centralisé GeoLeaf (implementation)
 */
const _LogImpl: LogImplInterface = {
    setLevel(level: string): void {
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

    getLevel(): number {
        return currentLevel;
    },

    getLevelName(): string {
        for (const [name, value] of Object.entries(LEVELS)) {
            if (value === currentLevel) return name;
        }
        return "UNKNOWN";
    },

    setQuietMode(enabled: boolean): void {
        if (quietMode === enabled) return; // éviter les répétitions
        quietMode = enabled;
        if (enabled) {
            console.info(
                `${formatPrefix("INFO")} Mode silencieux activé - logs répétitifs réduits`
            );
        }
    },

    showSummary(): void {
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

    debug(...args: unknown[]): void {
        if (currentLevel <= LEVELS.DEBUG) {
            const message = args.map((a) => String(a)).join(" ");
            if (quietMode && isRepetitiveMessage(message)) {
                if (!handleGroupedMessage(message, args)) return;
            }
            console.debug(formatPrefix("DEBUG"), ...args);
        }
    },

    info(...args: unknown[]): void {
        if (currentLevel <= LEVELS.INFO) {
            const message = args.map((a) => String(a)).join(" ");

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

    warn(...args: unknown[]): void {
        if (currentLevel <= LEVELS.WARN) {
            console.warn(formatPrefix("WARN"), ...args);
        }
    },

    error(...args: unknown[]): void {
        if (currentLevel <= LEVELS.ERROR) {
            console.error(formatPrefix("ERROR"), ...args);
        }
    },
};

// ── Local globalThis reference (for test-mock Proxy delegation) ──
interface GeoLeafGlobal {
    GeoLeaf?: { Log?: LogImplInterface };
}
const _g: GeoLeafGlobal =
    typeof globalThis !== "undefined"
        ? (globalThis as unknown as GeoLeafGlobal)
        : typeof window !== "undefined"
          ? (window as unknown as GeoLeafGlobal)
          : {};

/**
 * Exported Log proxy — delegates to LogImpl; provides CJS test override surface
 * (global.GeoLeaf.Log = mock)
 * while modules use the standard `import { Log }` pattern.
 */
export const Log: LogImplInterface = new Proxy(_LogImpl, {
    get(_target, prop: string, receiver) {
        const current = _g.GeoLeaf?.Log;
        if (current && current !== _LogImpl && current !== receiver && prop in current) {
            return (current as unknown as Record<string, unknown>)[prop];
        }
        return (_LogImpl as unknown as Record<string, unknown>)[prop];
    },
});
