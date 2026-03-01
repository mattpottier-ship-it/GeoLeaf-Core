/**
 * @module shared/poi-state
 * @description ESM singleton store for POI shared state — Phase 10-B Pattern D
 *
 * Re-exports POIShared from poi/shared.js as the canonical ESM reference.
 * Consumers import from this module — canonical ESM reference for POI shared state.
 *
 * Available API:
 *   POIShared.getAllPois()       → Array of POI objects
 *   POIShared.getMarkerLayer()  → L.LayerGroup | null
 *   POIShared.state             → internal state object
 *
 * @example
 * import { POIShared } from '../../shared/poi-state.js';
 * const pois = POIShared.getAllPois();
 */
export { POIShared } from "../poi/shared.js";
