/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf Notification System
 * Gestion des notifications toast et overlays
 * @module ui/notifications
 * @version 4.4.1
 * @updated 2026-01-23 - Standardisation API, queue prioritaire, intégration Telemetry
 */

(function (window) {
    "use strict";

    // Namespace global GeoLeaf
    const GeoLeaf = window.GeoLeaf || (window.GeoLeaf = {});

    // Helper pour utiliser createElement unifié
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    // Constantes pour les priorités de la queue
    const PRIORITY = {
        ERROR: 3,
        WARNING: 2,
        SUCCESS: 1,
        INFO: 1
    };

class NotificationSystem {
    constructor() {
        this.container = null;
        this.maxVisible = 3;              // Max toasts temporaires visibles
        this.maxPersistent = 2;           // Max toasts persistants visibles
        this.durations = {
            success: 3000,
            error: 5000,
            warning: 4000,
            info: 3000
        };
        this.config = {
            enabled: true,
            position: 'bottom-center',
            animations: true
        };

        // Managers pour cleanup
        this._eventManager = null;
        this._timerManager = null;
        this._activeToasts = new Map();

        // Queue avec priorités (limite: 15 max en attente)
        this._queue = [];
        this._maxQueueSize = 15;

        // Buffer pour métriques Telemetry (avant chargement du module)
        this._metricsBuffer = [];
        this._metricsBufferTimeout = null;
        this._telemetryAvailable = false;
    }

    /**
     * Initialise le système de notifications
     * @param {Object} config - Configuration
     * @param {string} config.container - Sélecteur du container
     * @param {number} config.maxVisible - Nombre max de toasts visibles
     * @param {Object} config.durations - Durées par type
     * @param {string} config.position - Position ('bottom-center', 'top-right', etc.)
     * @param {boolean} config.animations - Activer les animations
     */
    init(config = {}) {
        // Fusionner la config
        this.config = { ...this.config, ...config };
        this.maxVisible = config.maxVisible || 3;
        this.durations = { ...this.durations, ...config.durations };

        // Récupérer le container
        this.container = document.querySelector(config.container || '#gl-notifications');

        if (!this.container) {
            const Log = GeoLeaf.Log;
            if (Log) Log.warn('[GeoLeaf Notifications] Container introuvable:', config.container);
            return false;
        }

        // Appliquer la classe de position
        if (config.position) {
            this.container.className = `gl-notifications gl-notifications--${config.position}`;
        }

        const Log = GeoLeaf.Log;
        if (Log) Log.debug('[GeoLeaf Notifications] Système initialisé');

        // Initialiser les managers pour le cleanup
        if (GeoLeaf.Utils) {
            this._eventManager = GeoLeaf.Utils.events ? GeoLeaf.Utils.events.createManager('notifications') : null;
            this._timerManager = GeoLeaf.Utils.timers ? GeoLeaf.Utils.timers.createManager('notifications') : null;
        }

        // Démarrer le timer de 30s pour vider le buffer de métriques
        this._startMetricsBufferTimeout();

        // Flush immédiat si Telemetry est déjà disponible
        this._flushMetricsBuffer();

        return true;
    }

    /**
     * Affiche une notification générique (méthode publique standardisée)
     * Support double signature:
     * - show(message, type, duration) : Appel positionnel classique
     * - show(message, options) : Appel avec objet options
     *
     * @param {string} message - Message à afficher
     * @param {string|Object} typeOrOptions - Type ('success', 'error', 'warning', 'info') OU objet options
     * @param {number} [duration] - Durée personnalisée (ms) - ignoré si typeOrOptions est un objet
     *
     * @example
     * // Appel positionnel
     * show("Message", "success", 3000);
     *
     * @example
     * // Appel avec options
     * show("Message", {
     *   type: "success",
     *   duration: 3000,
     *   persistent: false,      // Toast persistant (ne s'auto-dismiss pas)
     *   dismissible: true,      // Bouton de fermeture
     *   icon: "✓",             // Icône personnalisée (futur)
     *   action: {               // Action button (futur)
     *     label: "Annuler",
     *     callback: () => {}
     *   }
     * });
     */
    show(message, typeOrOptions = 'info', duration) {
        // Parser les arguments selon la signature
        let options = {};

        if (typeof typeOrOptions === 'string') {
            // Signature positionnelle: show(message, type, duration)
            options = {
                type: typeOrOptions,
                duration: duration
            };
        } else if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
            // Signature objet: show(message, options)
            options = typeOrOptions;
        } else {
            // Fallback par défaut
            options = { type: 'info' };
        }

        // Ajouter à la queue avec priorité
        return this._enqueue(message, options);
    }

    /**
     * Affiche une notification de succès
     * Support double signature:
     * - success(message, duration)
     * - success(message, options)
     *
     * @param {string} message - Message à afficher
     * @param {number|Object} [durationOrOptions] - Durée (ms) OU objet options
     *
     * @example
     * success("Sauvegarde réussie", 3000);
     * success("Sauvegarde réussie", { duration: 3000, persistent: false });
     */
    success(message, durationOrOptions) {
        if (typeof durationOrOptions === 'number') {
            return this.show(message, 'success', durationOrOptions);
        } else if (typeof durationOrOptions === 'object') {
            return this.show(message, { ...durationOrOptions, type: 'success' });
        } else {
            return this.show(message, 'success');
        }
    }

    /**
     * Affiche une notification d'erreur
     * Support double signature:
     * - error(message, duration)
     * - error(message, options)
     *
     * @param {string} message - Message à afficher
     * @param {number|Object} [durationOrOptions] - Durée (ms) OU objet options
     *
     * @example
     * error("Erreur réseau", 5000);
     * error("Erreur réseau", { duration: 5000, persistent: true });
     */
    error(message, durationOrOptions) {
        if (typeof durationOrOptions === 'number') {
            return this.show(message, 'error', durationOrOptions);
        } else if (typeof durationOrOptions === 'object') {
            return this.show(message, { ...durationOrOptions, type: 'error' });
        } else {
            return this.show(message, 'error');
        }
    }

    /**
     * Affiche une notification d'avertissement
     * Support double signature:
     * - warning(message, duration)
     * - warning(message, options)
     *
     * @param {string} message - Message à afficher
     * @param {number|Object} [durationOrOptions] - Durée (ms) OU objet options
     *
     * @example
     * warning("Connexion instable", 4000);
     * warning("Connexion instable", { duration: 4000 });
     */
    warning(message, durationOrOptions) {
        if (typeof durationOrOptions === 'number') {
            return this.show(message, 'warning', durationOrOptions);
        } else if (typeof durationOrOptions === 'object') {
            return this.show(message, { ...durationOrOptions, type: 'warning' });
        } else {
            return this.show(message, 'warning');
        }
    }

    /**
     * Affiche une notification d'information
     * Support double signature:
     * - info(message, duration)
     * - info(message, options)
     *
     * @param {string} message - Message à afficher
     * @param {number|Object} [durationOrOptions] - Durée (ms) OU objet options
     *
     * @example
     * info("Synchronisation en cours", 3000);
     * info("Synchronisation en cours", { persistent: true, dismissible: false });
     */
    info(message, durationOrOptions) {
        if (typeof durationOrOptions === 'number') {
            return this.show(message, 'info', durationOrOptions);
        } else if (typeof durationOrOptions === 'object') {
            return this.show(message, { ...durationOrOptions, type: 'info' });
        } else {
            return this.show(message, 'info');
        }
    }

    /**
     * Ajoute une notification à la queue avec priorité
     * @private
     * @param {string} message - Message
     * @param {Object} options - Options de la notification
     */
    _enqueue(message, options) {
        const type = options.type || 'info';
        const priority = PRIORITY[type.toUpperCase()] || PRIORITY.INFO;

        const item = {
            message,
            options: {
                type,
                duration: options.duration,
                persistent: options.persistent || false,
                dismissible: options.dismissible !== false, // true par défaut
                icon: options.icon,
                action: options.action
            },
            priority,
            timestamp: Date.now()
        };

        // Vérifier la limite de la queue
        if (this._queue.length >= this._maxQueueSize) {
            // Trouver l'élément de plus faible priorité (et plus ancien si égalité)
            const lowestPriorityIndex = this._queue.reduce((minIdx, item, idx, arr) => {
                const minItem = arr[minIdx];
                if (item.priority < minItem.priority ||
                    (item.priority === minItem.priority && item.timestamp < minItem.timestamp)) {
                    return idx;
                }
                return minIdx;
            }, 0);

            // Si le nouvel item est plus prioritaire que le moins prioritaire dans la queue
            if (item.priority > this._queue[lowestPriorityIndex].priority) {
                // Supprimer le moins prioritaire
                this._queue.splice(lowestPriorityIndex, 1);
                // Tracker la métrique
                this._recordMetric('notification.dropped', 1);

                const Log = GeoLeaf.Log;
                if (Log) Log.warn('[GeoLeaf Notifications] Queue pleine, notification droppée');
            } else {
                // Dropper le nouveau item
                this._recordMetric('notification.dropped', 1);
                const Log = GeoLeaf.Log;
                if (Log) Log.warn('[GeoLeaf Notifications] Queue pleine, notification rejetée');
                return;
            }
        }

        // Ajouter à la queue
        this._queue.push(item);
        this._recordMetric('notification.queued', 1);

        // Trier la queue par priorité (desc) puis timestamp (asc)
        this._queue.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority; // Priorité décroissante
            }
            return a.timestamp - b.timestamp; // Timestamp croissant (FIFO pour même priorité)
        });

        // Traiter la queue
        return this._processQueue();
    }

    /**
     * Traite la queue et affiche les notifications selon disponibilité
     * @private
     */
    _processQueue() {
        if (!this.container || !this.config.enabled || this._queue.length === 0) {
            return null;
        }

        // Compter les toasts actuellement visibles
        const visibleToasts = this.container.querySelectorAll('.gl-toast:not(.gl-toast--removing)');
        const temporaryToasts = Array.from(visibleToasts).filter(t => !t.dataset.persistent);
        const persistentToasts = Array.from(visibleToasts).filter(t => t.dataset.persistent);

        // Tant qu'il y a de la place et des items dans la queue
        let lastToast = null;
        while (this._queue.length > 0) {
            const nextItem = this._queue[0];
            const isPersistent = nextItem.options.persistent;

            // Vérifier si on peut afficher ce toast
            const canShow = isPersistent
                ? persistentToasts.length < this.maxPersistent
                : temporaryToasts.length < this.maxVisible;

            if (!canShow) {
                // Si c'est un toast prioritaire (error), retirer un toast existant moins prioritaire
                if (nextItem.priority === PRIORITY.ERROR && temporaryToasts.length > 0) {
                    // Trouver un toast info ou success à retirer
                    const toastToRemove = temporaryToasts.find(t =>
                        t.classList.contains('gl-toast--info') ||
                        t.classList.contains('gl-toast--success')
                    ) || temporaryToasts[0];

                    this._remove(toastToRemove, true); // true = reorganization
                    // Continuer pour afficher le toast prioritaire
                } else {
                    // Pas de place, arrêter le traitement
                    break;
                }
            }

            // Retirer de la queue et afficher
            const item = this._queue.shift();
            lastToast = this._showImmediate(item.message, item.options);

            // Mettre à jour les compteurs
            if (isPersistent) {
                persistentToasts.push(null); // Placeholder
            } else {
                temporaryToasts.push(null); // Placeholder
            }
        }

        return lastToast;
    }

    /**
     * Affiche une notification immédiatement (utilisée par la queue)
     * @private
     * @param {string} message - Message à afficher
     * @param {Object} options - Options de la notification
     */
    _showImmediate(message, options) {
        const type = options.type || 'info';
        const duration = options.duration || this.durations[type];
        const persistent = options.persistent || false;
        const dismissible = options.dismissible !== false;

        // Créer le toast
        const toast = $create('div', {
            className: `gl-toast gl-toast--${type}`,
            attributes: {
                'role': 'alert',
                // Utiliser assertive pour errors et toasts prioritaires
                'aria-live': (type === 'error' || options.priority === PRIORITY.ERROR) ? 'assertive' : 'polite'
            }
        });

        // Marquer si persistant
        if (persistent) {
            toast.dataset.persistent = 'true';
        }

        // Créer le message (textContent = sécurisé)
        const messageSpan = $create('span', {
            className: 'gl-toast__message',
            textContent: message
        });
        toast.appendChild(messageSpan);

        // Créer le bouton de fermeture (si dismissible)
        if (dismissible) {
            const closeBtn = $create('button', {
                className: 'gl-toast__close',
                attributes: {
                    'aria-label': 'Fermer la notification',
                    'title': 'Fermer'
                },
                textContent: '×',
                onClick: () => {
                    this._recordMetric('notification.dismissed.manual', 1);
                    this._remove(toast, false);
                }
            });
            toast.appendChild(closeBtn);
        }

        // Ajouter au DOM
        this.container.appendChild(toast);

        // Tracker métrique
        this._recordMetric(`notification.shown.${type}`, 1);

        // Animation d'entrée
        if (this.config.animations) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    toast.classList.add('gl-toast--visible');
                });
            });
        } else {
            toast.classList.add('gl-toast--visible');
        }

        // Planifier l'auto-suppression (seulement si non persistant)
        if (!persistent) {
            const autoRemove = setTimeout(() => {
                this._recordMetric('notification.dismissed.auto', 1);
                this._remove(toast, false);
            }, duration);

            if (this._timerManager) {
                toast.dataset.timerId = this._timerManager.setTimeout(() => {
                    this._recordMetric('notification.dismissed.auto', 1);
                    this._remove(toast, false);
                }, duration);
            } else {
                toast.dataset.timeoutId = autoRemove;
            }
        }

        return toast;
    }

    /**
     * Retire une notification
     * @private
     * @param {HTMLElement} toast - Élément toast à retirer
     * @param {boolean} isReorganization - Si true, c'est une réorganisation (animation différente)
     */
    _remove(toast, isReorganization = false) {
        if (!toast || toast.classList.contains('gl-toast--removing')) {
            return;
        }

        // Annuler le timeout auto si fermeture manuelle
        if (toast.dataset.timeoutId) {
            clearTimeout(parseInt(toast.dataset.timeoutId));
            delete toast.dataset.timeoutId;
        }
        if (toast.dataset.timerId && this._timerManager) {
            this._timerManager.clearTimeout(toast.dataset.timerId);
            delete toast.dataset.timerId;
        }

        // Animation de sortie
        toast.classList.add('gl-toast--removing');
        toast.classList.remove('gl-toast--visible');

        // Appliquer animation spécifique pour réorganisation
        if (isReorganization && this.config.animations) {
            toast.classList.add('gl-toast--sliding-up');
        }

        const removeDelay = this.config.animations ? 200 : 0;
        const removeTimer = setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
            // Traiter la queue après suppression
            this._processQueue();
        }, removeDelay);

        if (this._timerManager) {
            this._timerManager.setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
                this._processQueue();
            }, removeDelay);
        }
    }

    /**
     * Efface toutes les notifications
     */
    clearAll() {
        if (!this.container) return;

        const toasts = this.container.querySelectorAll('.gl-toast');
        toasts.forEach(toast => this._remove(toast, false));

        // Vider aussi la queue
        this._queue = [];
    }

    /**
     * Ferme une notification spécifique par sa référence DOM
     * @param {HTMLElement} toastEl - Élément toast retourné par show/info/success/etc.
     */
    dismiss(toastEl) {
        if (!toastEl) return;
        this._remove(toastEl, false);
    }

    /**
     * Désactive temporairement les notifications
     */
    disable() {
        this.config.enabled = false;
        const Log = GeoLeaf.Log;
        if (Log) Log.debug('[GeoLeaf Notifications] Système désactivé');
    }

    /**
     * Réactive les notifications
     */
    enable() {
        this.config.enabled = true;
        const Log = GeoLeaf.Log;
        if (Log) Log.debug('[GeoLeaf Notifications] Système activé');
        // Traiter la queue au cas où des items sont en attente
        this._processQueue();
    }

    /**
     * Enregistre une métrique Telemetry (avec buffer si module pas encore chargé)
     * @private
     * @param {string} name - Nom de la métrique
     * @param {number} value - Valeur
     */
    _recordMetric(name, value = 1) {
        // Vérifier si Telemetry est disponible
        if (GeoLeaf.Storage && GeoLeaf.Storage.Telemetry && typeof GeoLeaf.Storage.Telemetry.recordMetric === 'function') {
            // Telemetry disponible, enregistrer directement
            try {
                GeoLeaf.Storage.Telemetry.recordMetric(name, value);
                this._telemetryAvailable = true;
            } catch (error) {
                const Log = GeoLeaf.Log;
                if (Log) Log.warn('[GeoLeaf Notifications] Erreur enregistrement métrique:', error);
            }
        } else {
            // Telemetry pas encore disponible, ajouter au buffer
            this._metricsBuffer.push({ name, value, timestamp: Date.now() });
        }
    }

    /**
     * Vide le buffer de métriques vers Telemetry
     * @private
     */
    _flushMetricsBuffer() {
        if (this._metricsBuffer.length === 0) {
            return;
        }

        // Vérifier si Telemetry est maintenant disponible
        if (GeoLeaf.Storage && GeoLeaf.Storage.Telemetry && typeof GeoLeaf.Storage.Telemetry.recordMetric === 'function') {
            const Log = GeoLeaf.Log;
            if (Log) Log.debug(`[GeoLeaf Notifications] Flush de ${this._metricsBuffer.length} métriques vers Telemetry`);

            // Enregistrer toutes les métriques du buffer
            this._metricsBuffer.forEach(metric => {
                try {
                    GeoLeaf.Storage.Telemetry.recordMetric(metric.name, metric.value);
                } catch (error) {
                    if (Log) Log.warn('[GeoLeaf Notifications] Erreur flush métrique:', error);
                }
            });

            // Vider le buffer
            this._metricsBuffer = [];
            this._telemetryAvailable = true;

            // Annuler le timeout si actif
            if (this._metricsBufferTimeout) {
                clearTimeout(this._metricsBufferTimeout);
                this._metricsBufferTimeout = null;
            }
        }
    }

    /**
     * Démarre le timeout de 30s pour vider le buffer (éviter fuite mémoire)
     * @private
     */
    _startMetricsBufferTimeout() {
        // Timeout de 30s pour vider le buffer même si Telemetry ne charge pas
        this._metricsBufferTimeout = setTimeout(() => {
            if (this._metricsBuffer.length > 0) {
                const Log = GeoLeaf.Log;
                if (Log) Log.warn(`[GeoLeaf Notifications] Timeout buffer métriques (30s), ${this._metricsBuffer.length} métriques abandonnées`);
                this._metricsBuffer = [];
            }
            this._metricsBufferTimeout = null;
        }, 30000); // 30 secondes
    }

    /**
     * Échappe le HTML pour éviter les injections XSS
     * @private
     * @param {string} text - Texte à échapper
     * @returns {string} Texte échappé
     * @deprecated Utilisez textContent au lieu de innerHTML
     */
    _escapeHtml(text) {
        if (GeoLeaf.Security && typeof GeoLeaf.Security.escapeHtml === 'function') {
            return GeoLeaf.Security.escapeHtml(text);
        }
        // Fallback sécurisé si Security n'est pas chargé
        if (text == null) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * Détruit le système de notifications et nettoie toutes les ressources
     * Retire tous les event listeners et timers actifs
     */
    destroy() {
        const Log = GeoLeaf.Log;

        // Clear tous les timers actifs
        if (this._timerManager) {
            this._timerManager.destroy();
            this._timerManager = null;
        }

        // Retire tous les event listeners
        if (this._eventManager) {
            this._eventManager.destroy();
            this._eventManager = null;
        }

        // Clear le timeout du buffer
        if (this._metricsBufferTimeout) {
            clearTimeout(this._metricsBufferTimeout);
            this._metricsBufferTimeout = null;
        }

        // Vider le buffer de métriques (une dernière tentative)
        if (this._metricsBuffer.length > 0) {
            this._flushMetricsBuffer();
            // Si toujours pas vidé, abandonner
            this._metricsBuffer = [];
        }

        // Retire tous les toasts actifs
        if (this.container) {
            const toasts = this.container.querySelectorAll('.gl-toast');
            toasts.forEach(toast => toast.remove());
        }

        // Clear la queue
        this._queue = [];

        // Clear la map
        this._activeToasts.clear();

        // Reset les propriétés
        this.container = null;
        this.config.enabled = false;

        if (Log) Log.info('[GeoLeaf Notifications] Système détruit et nettoyé');
    }

    /**
     * Get current status of notification system
     * @returns {Object} Status information
     */
    getStatus() {
        const visibleToasts = this.container ? this.container.querySelectorAll('.gl-toast:not(.gl-toast--removing)') : [];
        const temporaryToasts = Array.from(visibleToasts).filter(t => !t.dataset.persistent);
        const persistentToasts = Array.from(visibleToasts).filter(t => t.dataset.persistent);

        return {
            enabled: this.config.enabled,
            initialized: !!this.container,
            activeToasts: visibleToasts.length,
            temporaryToasts: temporaryToasts.length,
            persistentToasts: persistentToasts.length,
            queued: this._queue.length,
            maxVisible: this.maxVisible,
            maxPersistent: this.maxPersistent,
            position: this.config.position,
            telemetryAvailable: this._telemetryAvailable,
            metricsBuffered: this._metricsBuffer.length
        };
    }
}

// Créer une instance singleton et l'exposer
GeoLeaf._UINotifications = new NotificationSystem();

})(window);
