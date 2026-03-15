/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Storage - Offline Detector Module
 *
 * Détecte et gère les transitions online/offline.
 * Displays un badge UI et émet des événements personnalisés.
 *
 * @module GeoLeaf.OfflineDetector
 * @version 3.0.0
 */
"use strict";

import { Log } from "../log/index.js";
import { getLabel } from "../i18n/i18n.js";
import { ensureMap } from "../utils/general-utils.js";
import { events } from "../utils/event-listener-manager.js";

/**
 * Module de détection online/offline
 */
function _createOfflineBadgeContainer(L: any): HTMLElement {
    const container = L.DomUtil.create("div", "leaflet-bar geoleaf-offline-badge-control");
    container.style.cssText = `
        background: #ff6b6b;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: default;
        display: none;
        white-space: nowrap;
        position: absolute;
        left: 54px;
        top: 0;
        margin: 0 !important;
        border: none;
    `;
    container.textContent = getLabel("ui.offline.badge");
    container.title = getLabel("aria.offline.badge_title");
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
}

const OfflineDetector = {
    /**
     * État de connexion current
     * @private
     */
    _isOnline: navigator.onLine,

    /**
     * Badge UI (si activé)
     * @private
     */
    _badge: null as HTMLElement | null,

    /**
     * Contrôle Leaflet for the badge
     * @private
     */
    _badgeControl: null as any,

    /**
     * Configuration
     * @private
     */
    _config: {
        showBadge: false,
        badgePosition: "topleft",
        checkInterval: 30000,
        pingUrl: null,
    } as any,

    /**
     * Timer de vérification périodique
     * @private
     */
    _checkTimer: null as ReturnType<typeof setInterval> | null,

    /**
     * Event cleanup functions
     * @private
     */
    _eventCleanups: [] as (number | null | (() => void))[],

    /**
     * Initialise le détecteur
     * @param {Object} options - Options de configuration
     * @param {boolean} options.showBadge - Displaysr le badge UI
     * @param {string} options.badgePosition - Position du badge (top-right, top-left, etc.)
     * @param {number} options.checkInterval - Interval de vérification en ms
     * @param {string} options.pingUrl - URL pour ping de connectivité
     * @returns {void}
     */
    init(options: any = {}) {
        // Fusionner config
        this._config = { ...this._config, ...options };

        Log.info(
            `[OfflineDetector] Initializing (badge: ${this._config.showBadge ? "enabled" : "disabled"})`
        );

        // État initial
        this._isOnline = navigator.onLine;
        Log.info(`[OfflineDetector] Initial state: ${this._isOnline ? "ONLINE" : "OFFLINE"}`);

        // Le badge sera créé de manière lazy :
        // - During the premier événement offline si showBadge=true
        // - Ou via un appel manuel si the map devient available plus tard

        // Écouter les événements navigateur
        this._attachEventListeners();

        // Vérification périodique
        this._startPeriodicCheck();

        // Vérifier immédiatement l'état réel
        this.checkConnectivity();
    },

    /**
     * Crée le badge UI comme contrôle Leaflet
     * @private
     */
    _createBadge() {
        if (this._badge) return; // Déjà créé

        const map = ensureMap(undefined) as any;
        if (!map) {
            Log.warn("[OfflineDetector] Cannot create badge: map not available");
            return;
        }

        // Créer un contrôle Leaflet personnalisé
        const L = (globalThis as any).L;
        if (!L || !L.Control) {
            Log.warn("[OfflineDetector] Leaflet not available");
            return;
        }

        const OfflineBadgeControl = L.Control.extend({
            options: {
                position: "topleft",
            },

            onAdd: function (_map: any) {
                return _createOfflineBadgeContainer(L);
            },
        });

        this._badgeControl = new OfflineBadgeControl();
        this._badgeControl.addTo(map);
        this._badge = this._badgeControl.getContainer();

        Log.debug("[OfflineDetector] Badge control created on map");
    },

    /**
     * Displays le badge
     * @private
     */
    _showBadge() {
        // Créer le badge si pas encore créé (lazy creation)
        if (!this._badge && this._config.showBadge) {
            this._createBadge();
        }

        if (this._badge) {
            this._badge.style.display = "block";
        }
    },

    /**
     * Masque le badge
     * @private
     */
    _hideBadge() {
        if (this._badge) {
            this._badge.style.display = "none";
        }
    },

    /**
     * Attache les event listners
     * @private
     */
    _attachEventListeners() {
        // événements natifs du navigateur - avec cleanup tracking

        if (events) {
            this._eventCleanups.push(
                events.on(
                    window,
                    "online",
                    () => this._handleOnline(),
                    false,
                    "OfflineDetector.online"
                )
            );
            this._eventCleanups.push(
                events.on(
                    window,
                    "offline",
                    () => this._handleOffline(),
                    false,
                    "OfflineDetector.offline"
                )
            );
        } else {
            // Fallback sans cleanup
            Log.warn(
                "[OfflineDetector] EventListenerManager not available - listeners will not be cleaned up"
            );
            window.addEventListener("online", () => this._handleOnline());
            window.addEventListener("offline", () => this._handleOffline());
        }

        Log.debug("[OfflineDetector] Event listeners attached");
    },

    /**
     * Cleanup event listners
     */
    destroy() {
        // Cleanup event listners
        if (this._eventCleanups && this._eventCleanups.length > 0) {
            this._eventCleanups.forEach((cleanup: number | null | (() => void)) => {
                if (typeof cleanup === "function") cleanup();
                else if (typeof cleanup === "number") events.off(cleanup);
            });
            this._eventCleanups = [];
            Log.info("[OfflineDetector] Event listeners cleaned up");
        }

        // Clear check timer
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
        }

        // Remove badge control if present
        if (this._badgeControl && (this._badgeControl as any)._map) {
            (this._badgeControl as any)._map.removeControl(this._badgeControl);
            this._badgeControl = null;
        }
        this._badge = null;
    },

    /**
     * Gère le passage online
     * @private
     */
    _handleOnline() {
        if (this._isOnline) return; // Déjà online

        Log.info("[OfflineDetector] Connection restored ? ONLINE");
        this._isOnline = true;

        // Masquer le badge
        if (this._config.showBadge) {
            this._hideBadge();
        }

        // Émettre événement personnalisé
        (document as any).dispatchEvent(
            new CustomEvent("geoleaf:online", {
                detail: { timestamp: Date.now() },
            })
        );

        // Vérifier avec ping si nécessaire
        this.checkConnectivity();
    },

    /**
     * Gère le passage hors line
     * @private
     */
    _handleOffline() {
        if (!this._isOnline) return; // Déjà offline

        Log.warn("[OfflineDetector] Connection lost ? OFFLINE");
        this._isOnline = false;

        // Displaysr le badge
        if (this._config.showBadge) {
            this._showBadge();
        }

        // Émettre événement personnalisé
        document.dispatchEvent(
            new CustomEvent("geoleaf:offline", {
                detail: { timestamp: Date.now() },
            })
        );
    },

    /**
     * Vérifie la connectivité réelle (avec ping si configuré)
     *
     * @returns {Promise<boolean>}
     * @example
     * const isOnline = await GeoLeaf.Storage.OfflineDetector.checkConnectivity();
     */
    async checkConnectivity() {
        // Si pas d'URL de ping, utiliser l'état navigateur
        if (!this._config.pingUrl) {
            return this._isOnline;
        }

        try {
            // Tenter un ping vers l'URL configurée
            const controller = new AbortController();
            const timeoutId: ReturnType<typeof setTimeout> = setTimeout(
                () => controller.abort(),
                5000
            );

            const response = await fetch(this._config.pingUrl, {
                method: "HEAD",
                cache: "no-cache",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const isOnline = response.ok;

            // Mettre à jour l'état si différent
            if (isOnline !== this._isOnline) {
                if (isOnline) {
                    this._handleOnline();
                } else {
                    this._handleOffline();
                }
            }

            return isOnline;
        } catch (error: unknown) {
            // Error = probablement offline
            Log.debug(`[OfflineDetector] Ping failed: ${(error as any)?.message ?? error}`);

            if (this._isOnline) {
                this._handleOffline();
            }

            return false;
        }
    },

    /**
     * Démarre la vérification périodique
     * @private
     */
    _startPeriodicCheck() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
        }

        this._checkTimer = setInterval(() => {
            this.checkConnectivity();
        }, this._config.checkInterval);

        Log.debug(
            `[OfflineDetector] Periodic check started (every ${this._config.checkInterval}ms)`
        );
    },

    /**
     * Arrête la vérification périodique
     */
    stopPeriodicCheck() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
            Log.debug("[OfflineDetector] Periodic check stopped");
        }
    },

    /**
     * Returns the État de connexion current
     *
     * @returns {boolean}
     * @example
     * if (GeoLeaf.Storage.OfflineDetector.isOnline()) {
     *   // Effectuer requête réseau
     * }
     */
    isOnline() {
        return this._isOnline;
    },
};

export { OfflineDetector };
