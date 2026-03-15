/**
 * label-button-manager-lite.ts — Stub LabelButtonManager for the build Lite (PERF-02)
 * Remplace label-button-manager.ts in thes builds lightweights via liteGlobalsAlias().
 * The modules qui importent LabelButtonManager verify sa presence avant usage :
 *   if (LabelButtonManager) { ... }
 * → null est managed gracieusement.
 */
export const LabelButtonManager: any = null;
