/**
 * @module shared/geojson-state
 * @description ESM singleton store for GeoJSON shared state — Phase 10-B Pattern D
 *
 * Re-exports GeoJSONShared from geojson/shared.js as the canonical ESM reference.
 * Consumers import from this module — canonical ESM reference for GeoJSON shared state.
 *
 * Available API:
 *   GeoJSONShared.getLayers()        → Map<layerId, layerData>
 *   GeoJSONShared.getLayerById(id)   → layerData | undefined
 *   GeoJSONShared.state.layers       → Map<layerId, layerData>
 *   GeoJSONShared.state.map          → L.Map | null
 *
 * @example
 * import { GeoJSONShared } from '../../shared/geojson-state.js';
 * const layers = GeoJSONShared.getLayers();
 */
export { GeoJSONShared } from "../geojson/shared.js";
