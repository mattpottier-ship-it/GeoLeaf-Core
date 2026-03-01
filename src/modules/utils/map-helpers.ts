/**
 * @fileoverview Map Helpers - Utilities for Leaflet map instance management
 * @module utils/map-helpers
 */

import { Core } from "../geoleaf.core.js";

/** Duck-typed Leaflet map (avoids global L) */
export interface LeafletMapLike {
    getCenter?: () => unknown;
    setView?: (center: unknown, zoom?: number) => unknown;
    getBounds?: () => unknown;
    on?: (event: string, fn: () => void) => unknown;
    off?: (event: string, fn: () => void) => unknown;
}

export interface MapDiagnostic {
    map: LeafletMapLike | null;
    found: boolean;
    source: "explicit" | "core" | "none";
    isValid: boolean;
}

export const MapHelpers = {
    ensureMap(explicitMap: LeafletMapLike | null | undefined): LeafletMapLike | null {
        if (explicitMap && typeof explicitMap === "object") {
            if (this._isLeafletMap(explicitMap)) {
                return explicitMap;
            }
        }

        const CoreModule = Core as { getMap?: () => LeafletMapLike | null } | undefined;
        if (CoreModule?.getMap && typeof CoreModule.getMap === "function") {
            const coreMap = CoreModule.getMap();
            if (coreMap && this._isLeafletMap(coreMap)) {
                return coreMap;
            }
        }

        return null;
    },

    requireMap(
        explicitMap: LeafletMapLike | null | undefined,
        contextInfo = "Unknown"
    ): LeafletMapLike {
        const map = this.ensureMap(explicitMap);

        if (!map) {
            const sources: string[] = [];
            if (explicitMap !== null && explicitMap !== undefined)
                sources.push("explicit parameter");
            if (Core) sources.push("(Core module)");

            throw new Error(
                `[${contextInfo}] No Leaflet map instance found. ` +
                    `Tried: ${sources.length ? sources.join(", ") : "no sources available"}. ` +
                    `Ensure map is initialized or passed as option.`
            );
        }

        return map;
    },

    _isLeafletMap(obj: unknown): obj is LeafletMapLike {
        if (!obj || typeof obj !== "object") return false;

        const o = obj as LeafletMapLike;
        return (
            typeof o.getCenter === "function" &&
            typeof o.setView === "function" &&
            typeof o.getBounds === "function" &&
            typeof o.on === "function" &&
            typeof o.off === "function"
        );
    },

    hasMap(explicitMap: LeafletMapLike | null | undefined): boolean {
        return this.ensureMap(explicitMap) !== null;
    },

    getMapDiagnostic(explicitMap: LeafletMapLike | null | undefined): MapDiagnostic {
        const diagnostic: MapDiagnostic = {
            map: null,
            found: false,
            source: "none",
            isValid: false,
        };

        if (explicitMap && typeof explicitMap === "object") {
            if (this._isLeafletMap(explicitMap)) {
                diagnostic.map = explicitMap;
                diagnostic.found = true;
                diagnostic.source = "explicit";
                diagnostic.isValid = true;
                return diagnostic;
            }
        }

        const CoreModule = Core as { getMap?: () => LeafletMapLike | null } | undefined;
        if (CoreModule?.getMap && typeof CoreModule.getMap === "function") {
            const coreMap = CoreModule.getMap();
            if (coreMap && this._isLeafletMap(coreMap)) {
                diagnostic.map = coreMap;
                diagnostic.found = true;
                diagnostic.source = "core";
                diagnostic.isValid = true;
                return diagnostic;
            }
        }

        return diagnostic;
    },
};
