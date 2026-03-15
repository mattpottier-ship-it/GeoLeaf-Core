// @ts-nocheck — migration TS, typage progressif
/**
 * GeoLeaf UI Filter Panel - Proximity State
 * Shared state of the module de proximity (toutes les variables module-locales centralizedes)
 *
 * @module ui/filter-panel/proximity-state
 */
"use strict";

/**
 * Shared state entre tous les sous-modules de proximity.
 * Remplace les olds variables module-locales de proximity.ts.
 */
export const ProximityState: {
    mode: boolean;
    circle: any;
    marker: any;
    map: any;
    clickHandler: any;
    pendingRadius: number | null;
    eventCleanups: Array<() => void>;
} = {
    /** Mode proximity active ou non */
    mode: false,
    /** Circle Leaflet current */
    circle: null,
    /** Marqueur Leaflet current */
    marker: null,
    /** Reference to the Leaflet map */
    map: null,
    /** Handler de click manuel sur the map */
    clickHandler: null,
    /** Pre-selected radius before the marker is placed */
    pendingRadius: null,
    /** Cleanups des event listners */
    eventCleanups: [],
};
