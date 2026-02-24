/*!
 * GeoLeaf Core
 * � 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Storage - Offline Detector Module
 *
 * D�tecte et g�re les transitions online/offline.
 * Affiche un badge UI et �met des �v�nements personnalis�s.
 *
 * @module GeoLeaf.OfflineDetector
 * @version 3.0.0
 */
"use strict";

import { Log } from '../log/index.js';
import { ensureMap } from '../utils/general-utils.js';
import { events } from '../utils/event-listener-manager.js';





/**
 * Module de d�tection online/offline
 */
const OfflineDetector = {
    /**
     * �tat de connexion actuel
     * @private
     */
    _isOnline: navigator.onLine,

    /**
     * Badge UI (si activ�)
     * @private
     */
    _badge: null,

    /**
     * Contr�le Leaflet pour le badge
     * @private
     */
    _badgeControl: null,

    /**
     * Configuration
     * @private
     */
    _config: {
        showBadge: false,
        badgePosition: 'topleft',
        checkInterval: 30000,
        pingUrl: null
    },

    /**
     * Timer de v�rification p�riodique
     * @private
     */
    _checkTimer: null,

    /**
     * Event cleanup functions
     * @private
     */
    _eventCleanups: [],

    /**
     * Initialise le d�tecteur
     * @param {Object} options - Options de configuration
     * @param {boolean} options.showBadge - Afficher le badge UI
     * @param {string} options.badgePosition - Position du badge (top-right, top-left, etc.)
     * @param {number} options.checkInterval - Intervalle de v�rification en ms
     * @param {string} options.pingUrl - URL pour ping de connectivit�
     * @returns {void}
     */
    init(options = {}) {
        // Fusionner config
        this._config = { ...this._config, ...options };

        Log.info(`[OfflineDetector] Initializing (badge: ${this._config.showBadge ? 'enabled' : 'disabled'})`);

        // �tat initial
        this._isOnline = navigator.onLine;
        Log.info(`[OfflineDetector] Initial state: ${this._isOnline ? "ONLINE" : "OFFLINE"}`);

        // Le badge sera cr�� de mani�re lazy :
        // - Lors du premier �v�nement offline si showBadge=true
        // - Ou via un appel manuel si la carte devient disponible plus tard

        // �couter les �v�nements navigateur
        this._attachEventListeners();

        // V�rification p�riodique
        this._startPeriodicCheck();

        // V�rifier imm�diatement l'�tat r�el
        this.checkConnectivity();
    },

    /**
     * Cr�e le badge UI comme contr�le Leaflet
     * @private
     */
    _createBadge() {
        if (this._badge) return; // D�j� cr��

        const map = ensureMap();
        if (!map) {
            Log.warn('[OfflineDetector] Cannot create badge: map not available');
            return;
        }

        // Cr�er un contr�le Leaflet personnalis�
        const L = globalThis.L;
        if (!L || !L.Control) {
            Log.warn('[OfflineDetector] Leaflet not available');
            return;
        }

        const OfflineBadgeControl = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar geoleaf-offline-badge-control');
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
                container.textContent = '?? Hors ligne';
                container.title = 'Mode hors ligne actif';

                // Emp�cher les �v�nements de propagation
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                return container;
            }
        });

        this._badgeControl = new OfflineBadgeControl();
        this._badgeControl.addTo(map);
        this._badge = this._badgeControl.getContainer();

        Log.debug('[OfflineDetector] Badge control created on map');
    },

    /**
     * Affiche le badge
     * @private
     */
    _showBadge() {
        // Cr�er le badge si pas encore cr�� (lazy creation)
        if (!this._badge && this._config.showBadge) {
            this._createBadge();
        }

        if (this._badge) {
            this._badge.style.display = 'block';
        }
    },

    /**
     * Masque le badge
     * @private
     */
    _hideBadge() {
        if (this._badge) {
            this._badge.style.display = 'none';
        }
    },

    /**
     * Attache les event listeners
     * @private
     */
    _attachEventListeners() {
        // �v�nements natifs du navigateur - avec cleanup tracking

        if (events) {
            this._eventCleanups.push(
                events.on(
                    window,
                    "online",
                    () => this._handleOnline(),
                    false,
                    'OfflineDetector.online'
                )
            );
            this._eventCleanups.push(
                events.on(
                    window,
                    "offline",
                    () => this._handleOffline(),
                    false,
                    'OfflineDetector.offline'
                )
            );
        } else {
            // Fallback sans cleanup
            Log.warn('[OfflineDetector] EventListenerManager not available - listeners will not be cleaned up');
            window.addEventListener("online", () => this._handleOnline());
            window.addEventListener("offline", () => this._handleOffline());
        }

        Log.debug("[OfflineDetector] Event listeners attached");
    },

    /**
     * Cleanup event listeners
     */
    destroy() {
        // Cleanup event listeners
        if (this._eventCleanups && this._eventCleanups.length > 0) {
            this._eventCleanups.forEach(cleanup => {
                if (typeof cleanup === 'function') cleanup();
            });
            this._eventCleanups = [];
            Log.info('[OfflineDetector] Event listeners cleaned up');
        }

        // Clear check timer
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
        }

        // Remove badge control if present
        if (this._badgeControl && this._badgeControl._map) {
            this._badgeControl._map.removeControl(this._badgeControl);
            this._badgeControl = null;
        }
        this._badge = null;
    },

    /**
     * G�re le passage en ligne
     * @private
     */
    _handleOnline() {
        if (this._isOnline) return; // D�j� online

        Log.info("[OfflineDetector] Connection restored ? ONLINE");
        this._isOnline = true;

        // Masquer le badge
        if (this._config.showBadge) {
            this._hideBadge();
        }

        // �mettre �v�nement personnalis�
        document.dispatchEvent(new CustomEvent("geoleaf:online", {
            detail: { timestamp: Date.now() }
        }));

        // V�rifier avec ping si n�cessaire
        this.checkConnectivity();
    },

    /**
     * G�re le passage hors ligne
     * @private
     */
    _handleOffline() {
        if (!this._isOnline) return; // D�j� offline

        Log.warn("[OfflineDetector] Connection lost ? OFFLINE");
        this._isOnline = false;

        // Afficher le badge
        if (this._config.showBadge) {
            this._showBadge();
        }

        // �mettre �v�nement personnalis�
        document.dispatchEvent(new CustomEvent("geoleaf:offline", {
            detail: { timestamp: Date.now() }
        }));
    },

    /**
     * V�rifie la connectivit� r�elle (avec ping si configur�)
     *
     * @returns {Promise<boolean>}
     * @example
     * const isOnline = await GeoLeaf.Storage.OfflineDetector.checkConnectivity();
     */
    async checkConnectivity() {
        // Si pas d'URL de ping, utiliser l'�tat navigateur
        if (!this._config.pingUrl) {
            return this._isOnline;
        }

        try {
            // Tenter un ping vers l'URL configur�e
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout 5s

            const response = await fetch(this._config.pingUrl, {
                method: "HEAD",
                cache: "no-cache",
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const isOnline = response.ok;

            // Mettre � jour l'�tat si diff�rent
            if (isOnline !== this._isOnline) {
                if (isOnline) {
                    this._handleOnline();
                } else {
                    this._handleOffline();
                }
            }

            return isOnline;

        } catch (error) {
            // Erreur = probablement offline
            Log.debug(`[OfflineDetector] Ping failed: ${error.message}`);

            if (this._isOnline) {
                this._handleOffline();
            }

            return false;
        }
    },

    /**
     * D�marre la v�rification p�riodique
     * @private
     */
    _startPeriodicCheck() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
        }

        this._checkTimer = setInterval(() => {
            this.checkConnectivity();
        }, this._config.checkInterval);

        Log.debug(`[OfflineDetector] Periodic check started (every ${this._config.checkInterval}ms)`);
    },

    /**
     * Arr�te la v�rification p�riodique
     */
    stopPeriodicCheck() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
            Log.debug("[OfflineDetector] Periodic check stopped");
        }
    },

    /**
     * Retourne l'�tat de connexion actuel
     *
     * @returns {boolean}
     * @example
     * if (GeoLeaf.Storage.OfflineDetector.isOnline()) {
     *   // Effectuer requ�te r�seau
     * }
     */
    isOnline() {
        return this._isOnline;
    },

    /**
     * Nettoie les ressources
     */
    destroy() {
        this.stopPeriodicCheck();

        // Supprimer le contr�le de la carte
        if (this._badgeControl) {
            const map = ensureMap();
            if (map) {
                map.removeControl(this._badgeControl);
            }
            this._badgeControl = null;
            this._badge = null;
        }

        Log.info("[OfflineDetector] Destroyed");
    }
};


export { OfflineDetector };
