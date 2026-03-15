/**
 * API Factory Manager - Sprint 4.3 (Version Robuste)
 * Manager for the création d'instances multi-cartes
 * @module APIFactoryManager
 */
"use strict";

import { Log } from "../log/index.js";
const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * Manager for factory pour multi-cartes
 */
class APIFactoryManager {
    isReady: boolean;
    mapInstances: Map<string, any>;
    stats: { mapsCreated: number; errors: number };
    getModule: ((name: string) => any) | null;

    constructor() {
        this.isReady = true;
        this.mapInstances = new Map();
        this.stats = {
            mapsCreated: 0,
            errors: 0,
        };
        this.getModule = null;
    }

    /**
     * Initialise le manager with the fonction d'accès aux modules
     * @param {Function} getModule - Fonction d'accès aux modules
     * @returns {boolean} Succès
     */
    init(getModule: (name: string) => any) {
        try {
            if (!getModule || typeof getModule !== "function") {
                throw new Error("getModule function is required");
            }

            this.getModule = getModule;

            if (Log) Log.info("[APIFactoryManager] Factory manager initialized");
            return true;
        } catch (error) {
            this.stats.errors++;
            if (Log) Log.error("[APIFactoryManager] Initialization failed:", error);
            return false;
        }
    }

    /**
     * Créer une nouvelle instance de carte
     * @param {string} targetId - ID of the élément cible
     * @param {Object} options - Options de configuration
     * @param {Function} getModule - Fonction d'accès aux modules
     * @returns {*} Instance de carte ou null
     */
    createMap(targetId: any, options: any, getModule: (name: string) => any) {
        try {
            this.stats.mapsCreated++;

            if (!targetId) {
                throw new Error("Target ID is required");
            }

            const Core = getModule("Core");
            if (!Core || typeof Core.init !== "function") {
                throw new Error("Core module not available for map creation");
            }

            // Créer the map with thes options fournies
            const mapOptions = {
                target: targetId,
                ...options,
            };

            const mapInstance = Core.init(mapOptions);

            if (mapInstance) {
                this.mapInstances.set(targetId, mapInstance);
                if (Log) Log.info(`[APIFactoryManager] Map created for target: ${targetId}`);
            }

            return mapInstance;
        } catch (error) {
            this.stats.errors++;
            if (Log) Log.error(`[APIFactoryManager] Failed to create map for ${targetId}:`, error);
            return null;
        }
    }

    /**
     * Obtient an instance de carte par ID
     * @param {string} targetId - ID of the élément cible
     * @returns {*} Instance de carte ou null
     */
    getMapInstance(targetId: string) {
        return this.mapInstances.get(targetId) || null;
    }

    /**
     * Obtient toutes les instances de carte
     * @returns {Array} List des instances
     */
    getAllMapInstances() {
        return Array.from(this.mapInstances.values());
    }

    /**
     * Removes ae instance de carte par ID
     * @param {string} targetId - ID of the élément cible
     * @returns {boolean} Succès de la removal
     */
    removeMapInstance(targetId: string) {
        if (!this.mapInstances.has(targetId)) {
            if (Log) Log.warn(`[APIFactoryManager] No map instance found for: ${targetId}`);
            return false;
        }
        this.mapInstances.delete(targetId);
        if (Log) Log.info(`[APIFactoryManager] Map instance removed for: ${targetId}`);
        return true;
    }

    /**
     * Obtient les statistiques
     */
    getStats() {
        return {
            ...this.stats,
            activeInstances: this.mapInstances.size,
            isReady: this.isReady,
        };
    }

    /**
     * Réinitializes le manager
     */
    reset() {
        this.mapInstances.clear();
        this.getModule = null;
        this.stats = {
            mapsCreated: 0,
            errors: 0,
        };

        if (Log) Log.info("[APIFactoryManager] Manager reset");
    }
}

export { APIFactoryManager };
