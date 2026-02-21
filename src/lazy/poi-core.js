/**
 * GeoLeaf Lazy Chunk — POI Core
 * Noyau du module POI : état partagé, normalisation, marqueurs, logique principale.
 * Chargé en premier lors du code splitting POI (les autres chunks en dépendent).
 * @module lazy/poi-core
 */
import '../modules/poi/shared.js';
import '../modules/poi/normalizers.js';
import '../modules/poi/markers.js';
import '../modules/poi/core.js';
import '../modules/geoleaf.poi.js';
