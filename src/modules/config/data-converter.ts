/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

import { Log } from '../log/index.js';

/** GeoJSON Feature (minimal shape used by this module) */
interface GeoJSONFeature {
    type: 'Feature';
    id?: string;
    geometry: { type: string; coordinates: number[] | number[][] | number[][][] };
    properties: Record<string, unknown>;
}

/** GeoJSON FeatureCollection */
export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

/** POI-like input for conversion */
interface PoiInput {
    id?: string;
    title?: string;
    description?: string;
    latlng?: [number, number];
    location?: { lat: number; lng: number };
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
}

/** Route-like input */
interface RouteInput {
    id?: string;
    title?: string;
    description?: string;
    categoryId?: string;
    subCategoryId?: string;
    geometry?: { type: string; coordinates?: number[][] };
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
}

/** Zone-like input */
interface ZoneInput {
    id?: string;
    title?: string;
    siteName?: string;
    description?: string;
    geometry?: { type: string; coordinates?: number[][][] };
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
}

const emptyFC = (): GeoJSONFeatureCollection => ({ type: 'FeatureCollection', features: [] });

const DataConverterModule = {
    convertPoiArrayToGeoJSON(poiArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(poiArray)) {
            Log.warn("[DataConverter.convertPoiArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return emptyFC();
        }
        const features = (poiArray as PoiInput[])
            .map((poi) => {
                if (!poi || typeof poi !== 'object') return null;
                if (!poi.id) {
                    Log.warn('[DataConverter.convertPoiArrayToGeoJSON] POI sans ID, ignoré', poi);
                    return null;
                }
                let coordinates: [number, number] | null = null;
                if (Array.isArray(poi.latlng) && poi.latlng.length === 2) {
                    coordinates = [poi.latlng[1], poi.latlng[0]];
                } else if (
                    poi.location &&
                    typeof (poi.location as { lat?: number }).lat === 'number' &&
                    typeof (poi.location as { lng?: number }).lng === 'number'
                ) {
                    const loc = poi.location as { lat: number; lng: number };
                    coordinates = [loc.lng, loc.lat];
                } else {
                    Log.warn('[DataConverter.convertPoiArrayToGeoJSON] POI sans coordonnées valides, ignoré', {
                        id: poi.id,
                    });
                    return null;
                }
                return {
                    type: 'Feature',
                    id: poi.id,
                    geometry: { type: 'Point', coordinates },
                    properties: {
                        id: poi.id,
                        title: poi.title || 'Sans titre',
                        description: poi.description || '',
                        ...(poi.attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })
            .filter((f): f is GeoJSONFeature => f !== null);
        Log.debug('[DataConverter.convertPoiArrayToGeoJSON] Converti', {
            input: poiArray.length,
            output: features.length,
        });
        return { type: 'FeatureCollection', features };
    },

    convertRouteArrayToGeoJSON(routeArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(routeArray)) {
            Log.warn("[DataConverter.convertRouteArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return emptyFC();
        }
        const features = (routeArray as RouteInput[])
            .map((route) => {
                if (!route || typeof route !== 'object') return null;
                if (!route.id) {
                    Log.warn('[DataConverter.convertRouteArrayToGeoJSON] Route sans ID, ignorée', route);
                    return null;
                }
                if (
                    !route.geometry ||
                    route.geometry.type !== 'LineString' ||
                    !Array.isArray(route.geometry.coordinates)
                ) {
                    Log.warn(
                        '[DataConverter.convertRouteArrayToGeoJSON] Route sans géométrie LineString valide, ignorée',
                        { id: route.id }
                    );
                    return null;
                }
                return {
                    type: 'Feature',
                    id: route.id,
                    geometry: { type: 'LineString', coordinates: route.geometry.coordinates },
                    properties: {
                        id: route.id,
                        title: route.title || 'Sans titre',
                        description: route.description || '',
                        categoryId: route.categoryId,
                        subCategoryId: route.subCategoryId,
                        ...(route.attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })
            .filter((f): f is GeoJSONFeature => f !== null);
        Log.debug('[DataConverter.convertRouteArrayToGeoJSON] Converti', {
            input: routeArray.length,
            output: features.length,
        });
        return { type: 'FeatureCollection', features };
    },

    convertZoneArrayToGeoJSON(zoneArray: unknown): GeoJSONFeatureCollection {
        if (!Array.isArray(zoneArray)) {
            Log.warn("[DataConverter.convertZoneArrayToGeoJSON] Input n'est pas un array, retour FeatureCollection vide");
            return emptyFC();
        }
        const features = (zoneArray as ZoneInput[])
            .map((zone) => {
                if (!zone || typeof zone !== 'object') return null;
                if (!zone.id) {
                    Log.warn('[DataConverter.convertZoneArrayToGeoJSON] Zone sans ID, ignorée', zone);
                    return null;
                }
                if (
                    !zone.geometry ||
                    zone.geometry.type !== 'Polygon' ||
                    !Array.isArray(zone.geometry.coordinates)
                ) {
                    Log.warn(
                        '[DataConverter.convertZoneArrayToGeoJSON] Zone sans géométrie Polygon valide, ignorée',
                        { id: zone.id }
                    );
                    return null;
                }
                return {
                    type: 'Feature',
                    id: zone.id,
                    geometry: { type: 'Polygon', coordinates: zone.geometry.coordinates },
                    properties: {
                        id: zone.id,
                        title: zone.title || zone.siteName || 'Sans titre',
                        description: zone.description || '',
                        ...(zone.attributes as Record<string, unknown>),
                    },
                } as GeoJSONFeature;
            })
            .filter((f): f is GeoJSONFeature => f !== null);
        Log.debug('[DataConverter.convertZoneArrayToGeoJSON] Converti', {
            input: zoneArray.length,
            output: features.length,
        });
        return { type: 'FeatureCollection', features };
    },

    convertGpxToGeoJSON(gpxString: string): GeoJSONFeatureCollection {
        if (!gpxString || typeof gpxString !== 'string') {
            Log.warn('[DataConverter.convertGpxToGeoJSON] GPX string invalide');
            return emptyFC();
        }
        try {
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxString, 'text/xml');
            const parseErrors = gpxDoc.getElementsByTagName('parsererror');
            if (parseErrors.length > 0) {
                Log.error('[DataConverter.convertGpxToGeoJSON] Erreur parsing XML:', parseErrors[0].textContent);
                return emptyFC();
            }
            const features: GeoJSONFeature[] = [];
            const waypoints = gpxDoc.getElementsByTagName('wpt');
            for (let i = 0; i < waypoints.length; i++) {
                const wpt = waypoints[i];
                const lat = parseFloat(wpt.getAttribute('lat') ?? '');
                const lon = parseFloat(wpt.getAttribute('lon') ?? '');
                if (!isNaN(lat) && !isNaN(lon)) {
                    const nameElem = wpt.getElementsByTagName('name')[0];
                    const descElem = wpt.getElementsByTagName('desc')[0];
                    const symElem = wpt.getElementsByTagName('sym')[0];
                    const geoLeafExt: Record<string, unknown> = {};
                    const tagsList: string[] = [];
                    const extensions = wpt.getElementsByTagName('extensions');
                    if (extensions.length > 0) {
                        const ext = extensions[0];
                        for (let j = 0; j < ext.childNodes.length; j++) {
                            const child = ext.childNodes[j];
                            if (child.nodeType !== 1) continue;
                            const tagName = (child as Element).tagName || (child as Element).nodeName || '';
                            const localName = (child as Element).localName || tagName.split(':').pop() || '';
                            const isGeoLeaf =
                                tagName.toLowerCase().startsWith('geoleaf:') ||
                                ((child as Element).namespaceURI?.includes('geoleaf') ?? false);
                            if (isGeoLeaf || tagName.includes(':')) {
                                const key = localName || tagName.replace(/^[^:]+:/, '');
                                const value = (child as Element).textContent || '';
                                if (key === 'tag' || key === 'tags') {
                                    if (value) tagsList.push(value);
                                } else {
                                    geoLeafExt[key] = value;
                                }
                            }
                        }
                    }
                    if (tagsList.length > 0) geoLeafExt.tags = tagsList;
                    const id = (geoLeafExt.id as string) || (nameElem ? nameElem.textContent : `wpt-${i}`) || `wpt-${i}`;
                    features.push({
                        type: 'Feature',
                        id,
                        geometry: { type: 'Point', coordinates: [lon, lat] },
                        properties: {
                            id,
                            title: nameElem ? nameElem.textContent : `Waypoint ${i + 1}`,
                            description: descElem ? descElem.textContent : '',
                            symbol: symElem ? symElem.textContent : '',
                            ...geoLeafExt,
                        },
                    });
                }
            }
            const tracks = gpxDoc.getElementsByTagName('trk');
            for (let i = 0; i < tracks.length; i++) {
                const trk = tracks[i];
                const nameElem = trk.getElementsByTagName('name')[0];
                const descElem = trk.getElementsByTagName('desc')[0];
                const trkGeoLeafExt: Record<string, unknown> = {};
                const trkTagsList: string[] = [];
                const trkExtensions = trk.getElementsByTagName('extensions');
                if (trkExtensions.length > 0) {
                    const ext = trkExtensions[0];
                    for (let m = 0; m < ext.childNodes.length; m++) {
                        const child = ext.childNodes[m];
                        if (child.nodeType !== 1) continue;
                        const tagName = (child as Element).tagName || (child as Element).nodeName || '';
                        const localName = (child as Element).localName || tagName.split(':').pop() || '';
                        const isGeoLeaf =
                            tagName.toLowerCase().startsWith('geoleaf:') ||
                            ((child as Element).namespaceURI?.includes('geoleaf') ?? false);
                        if (isGeoLeaf || tagName.includes(':')) {
                            const key = localName || tagName.replace(/^[^:]+:/, '');
                            const value = (child as Element).textContent || '';
                            if (key === 'tag' || key === 'tags') {
                                if (value) trkTagsList.push(value);
                            } else {
                                trkGeoLeafExt[key] = value;
                            }
                        }
                    }
                }
                if (trkTagsList.length > 0) trkGeoLeafExt.tags = trkTagsList;
                const segments = trk.getElementsByTagName('trkseg');
                for (let j = 0; j < segments.length; j++) {
                    const segment = segments[j];
                    const trkpts = segment.getElementsByTagName('trkpt');
                    const coordinates: number[][] = [];
                    for (let k = 0; k < trkpts.length; k++) {
                        const trkpt = trkpts[k];
                        const tlat = parseFloat(trkpt.getAttribute('lat') ?? '');
                        const tlon = parseFloat(trkpt.getAttribute('lon') ?? '');
                        if (!isNaN(tlat) && !isNaN(tlon)) coordinates.push([tlon, tlat]);
                    }
                    if (coordinates.length > 0) {
                        const fid = nameElem ? `${nameElem.textContent}-${j}` : `trk-${i}-${j}`;
                        features.push({
                            type: 'Feature',
                            id: fid,
                            geometry: { type: 'LineString', coordinates },
                            properties: {
                                id: fid,
                                title: nameElem ? nameElem.textContent : `Track ${i + 1}`,
                                description: descElem ? descElem.textContent : '',
                                segmentIndex: j,
                                pointCount: coordinates.length,
                                ...trkGeoLeafExt,
                            },
                        });
                    }
                }
            }
            Log.debug('[DataConverter.convertGpxToGeoJSON] Converti', {
                waypoints: waypoints.length,
                tracks: tracks.length,
                features: features.length,
            });
            return { type: 'FeatureCollection', features };
        } catch (err) {
            Log.error('[DataConverter.convertGpxToGeoJSON] Erreur lors du parsing GPX:', err);
            return emptyFC();
        }
    },

    autoConvert(data: unknown): GeoJSONFeatureCollection {
        if (!data) {
            Log.warn('[DataConverter.autoConvert] Données nulles, retour FeatureCollection vide');
            return emptyFC();
        }
        const d = data as { type?: string; features?: unknown[]; geometry?: unknown };
        if (d.type === 'FeatureCollection' && Array.isArray(d.features)) {
            Log.debug('[DataConverter.autoConvert] Données déjà en GeoJSON, passage direct');
            return data as GeoJSONFeatureCollection;
        }
        if (d.type === 'Feature' && d.geometry) {
            Log.debug('[DataConverter.autoConvert] Feature unique, conversion en FeatureCollection');
            return { type: 'FeatureCollection', features: [data as GeoJSONFeature] };
        }
        if (!Array.isArray(data) || data.length === 0) {
            Log.warn('[DataConverter.autoConvert] Données ne sont pas un array ou array vide');
            return emptyFC();
        }
        const firstItem = data[0] as Record<string, unknown>;
        if (!firstItem || typeof firstItem !== 'object') {
            Log.warn('[DataConverter.autoConvert] Premier élément invalide');
            return emptyFC();
        }
        if (firstItem.latlng || (firstItem.location && typeof (firstItem.location as { lat?: number }).lat === 'number')) {
            Log.debug('[DataConverter.autoConvert] Détecté comme array de POI');
            return this.convertPoiArrayToGeoJSON(data);
        }
        const geom = firstItem.geometry as { type?: string; coordinates?: unknown } | undefined;
        if (geom?.type === 'LineString' && Array.isArray(geom.coordinates)) {
            Log.debug('[DataConverter.autoConvert] Détecté comme array de routes');
            return this.convertRouteArrayToGeoJSON(data);
        }
        if (geom?.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            Log.debug('[DataConverter.autoConvert] Détecté comme array de zones');
            return this.convertZoneArrayToGeoJSON(data);
        }
        Log.warn('[DataConverter.autoConvert] Type de données non reconnu');
        return emptyFC();
    },
};

const DataConverter = DataConverterModule;
export { DataConverter };
