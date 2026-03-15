/**
 * @module geoleaf.route-lite
 * @description Stub Route for the build Lite (PERF-02).
 *
 * @remarks
 * Ce module remplace {@link geoleaf.route} in thes builds lightweights via
 * `liteGlobalsAlias()` in the configuration Rollup.
 * The value exportede est `null` — les consommateurs verify sa presence :
 * ```ts
 * if (Route && typeof Route.isInitialized === "function" && Route.isInitialized()) { ...}
 * ```
 * Cela permet au _Lite build_ to save ~30 KB without runtime error.
 */
export const Route: null = null;
