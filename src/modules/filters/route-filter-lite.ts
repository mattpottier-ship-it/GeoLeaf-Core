/**
 * route-filter-lite.ts — Stub filterRouteList for the build Lite (PERF-02)
 * Remplace filters/route-filter.ts in thes builds lightweights via liteGlobalsAlias().
 * Routes are excluded from the Lite build, so the filter always returns an empty array.
 */
export function filterRouteList(_routes: any, _options: any): any[] {
    return [];
}
