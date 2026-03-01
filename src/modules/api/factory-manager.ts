/**
 * API Factory Manager - Sprint 4.3 (Version Robuste)
 * Gestionnaire pour la cr�ation d'instances multi-cartes
 * @module APIFactoryManager
 */
"use strict";

import { Log } from "../log/index.js";
const _g: any =
    typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
_g.GeoLeaf = _g.GeoLeaf || {};

/**
 * Gestionnaire de factory pour multi-cartes
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
     * Initialise le gestionnaire avec la fonction d'acc�s aux modules
     * @param {Function} getModule - Fonction d'acc�s aux modules
     * @returns {boolean} Succ�s
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
     * Cr�e une nouvelle instance de carte
     * @param {string} targetId - ID de l'�l�ment cible
     * @param {Object} options - Options de configuration
     * @param {Function} getModule - Fonction d'acc�s aux modules
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

            // Cr�er la carte avec les options fournies
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
     * Obtient une instance de carte par ID
     * @param {string} targetId - ID de l'�l�ment cible
     * @returns {*} Instance de carte ou null
     */
    getMapInstance(targetId: string) {
        return this.mapInstances.get(targetId) || null;
    }

    /**
     * Obtient toutes les instances de carte
     * @returns {Array} Liste des instances
     */
    getAllMapInstances() {
        return Array.from(this.mapInstances.values());
    }

    /**
     * Supprime une instance de carte par ID
     * @param {string} targetId - ID de l'�l�ment cible
     * @returns {boolean} Succ�s de la suppression
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
     * R�initialise le gestionnaire
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
