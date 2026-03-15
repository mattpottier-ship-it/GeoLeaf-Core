/**
 * labels-lite.ts — Stub Labels for the build Lite (PERF-02)
 * Remplace labels.ts in thes builds lightweights via liteGlobalsAlias().
 * The modules qui importent Labels verify sa presence avant usage :
 *   if (Labels && typeof Labels.initializeLayerLabels === "function") { ... }
 * → null est managed gracieusement.
 */
export const Labels: any = null;
