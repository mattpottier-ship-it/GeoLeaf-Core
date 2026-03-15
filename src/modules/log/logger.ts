/* eslint-disable security/detect-object-injection */
/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module log/logger
 * @description GeoLeaf.Log — gestion centralizede des logs
 *
 * Objectif :
 * - remplacer tous les console.log/console.warn/... du projet
 * - provide a configurable verbosity level via JSON config
 * - ensure each message has a normalized prefix [GeoLeaf.X]
 */

/* eslint-disable no-console */ // This module IS the logger — console calls are intentional

export type LogLevelName = "debug" | "info" | "warn" | "error" | "production";

export const LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
} as const;

let currentLevel: number = LEVELS.INFO; // niveau by default
let quietMode = false; // silent mode for repetitive logs
const _suppressedMessages = new Set<string>(); // to avoid repetitions
const groupedMessageCounts = new Map<string, number>(); // pour groupr les messages similaires
const MAX_GROUPED_ENTRIES = 200; // cap to prevent unbounded growth

const formatPrefix = (type: string): string => `[GeoLeaf.${type}]`;

// Detects if a message is repetitive or non-critical informational
const isRepetitiveMessage = (message: string): boolean => {
    const patterns = [
        /Chargement du sprite SVG/,
        /Sprite SVG detected/,
        /IconsConfig retrieved/,
        /Module.*loaded/,
        /Module.*initialized/,
        /Control.*added/,
        /Button.*added/,
        /Panel.*created/,
        /Section.*remplie/,
        /Profile.*loaded/,
        /Layer.*loaded/,
        /Style.*applied/,
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

// Critical messages that must always be displayed
const isCriticalMessage = (message: string): boolean => {
    const criticalPatterns = [
        /ERROR/,
        /WARN/,
        /Failed/,
        /Error/,
        /Exception/,
        /Map initialized successfully/,
        /All.*modules loaded/,
        /Mode.*activated/,
    ];
    return criticalPatterns.some((pattern) => pattern.test(message));
};

// Manages grouped messages
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
        return true; // displays le premier
    } else if (count === 3 && !isCriticalMessage(message)) {
        console.info(
            `${formatPrefix("INFO")} [Grouped] Repeated message - continuation hidden: ${message.substring(0, 60)}...`
        );
        return false;
    } else if (count > 3) {
        return false; // suppressed after 3 occurrences for non-critical messages
    }
    return count <= 2; // displays max 2 fois les messages non critiques
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
 * Logger centralized GeoLeaf (implementation)
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
                currentLevel = LEVELS.WARN; // En production, only WARN et ERROR
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
        if (quietMode === enabled) return; // avoid repetitions
        quietMode = enabled;
        if (enabled) {
            console.info(`${formatPrefix("INFO")} Silent mode activated - repetitive logs reduced`);
        }
    },

    showSummary(): void {
        if (groupedMessageCounts.size > 0) {
            console.group(`${formatPrefix("INFO")} Grouped log summary`);
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

            // In mode silencieux, filter plus agressivement
            if (quietMode) {
                // Always display les messages critiques
                if (isCriticalMessage(message)) {
                    console.info(formatPrefix("INFO"), ...args);
                    return;
                }

                // Group/hide repetitive messages
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
 * Exported Log proxy — delegates to LogImpl; provides CJS test override area
 * (global.GeoLeaf.Log = mock)
 * whithe modules use the standard `import { Log }` pattern.
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
