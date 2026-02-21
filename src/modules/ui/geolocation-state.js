/**
 * @module ui/geolocation-state
 * @description ESM singleton store for geolocation UI state — Phase 10-B Pattern D
 *
 * ESM singleton replacing the mutable UI properties _geolocationActive / _geolocationWatchId /
 * _userPosition / _userPositionAccuracy.
 *
 * All reads and writes go through this module: consumers import GeoLocationState
 * and access/mutate its properties directly.
 *
 * The globals bridge (geoleaf.ui.js) keeps the UMD / CDN namespace aliases
 * in sync with this ESM singleton.
 *
 * @example
 * import { GeoLocationState } from '../geolocation-state.js';
 *
 * // Read
 * if (GeoLocationState.active) { ... }
 *
 * // Write
 * GeoLocationState.active = true;
 * GeoLocationState.watchId = navigator.geolocation.watchPosition(onSuccess, onError);
 * GeoLocationState.userPosition = { lat, lng, timestamp: Date.now(), accuracy };
 */

/**
 * Mutable singleton holding geolocation tracking state.
 * @type {{
 *   active: boolean,
 *   watchId: number|null,
 *   userPosition: {lat: number, lng: number, timestamp: number, accuracy?: number}|null,
 *   userPositionAccuracy: number|null
 * }}
 */
const GeoLocationState = {
    /** Whether the geolocation watch is currently active */
    active: false,

    /** ID returned by navigator.geolocation.watchPosition(), or null */
    watchId: null,

    /**
     * Last known user position, or null if geolocation has never succeeded.
     * @type {{ lat: number, lng: number, timestamp: number, accuracy?: number }|null}
     */
    userPosition: null,

    /** Last known accuracy in metres, or null */
    userPositionAccuracy: null,
};

export { GeoLocationState };
