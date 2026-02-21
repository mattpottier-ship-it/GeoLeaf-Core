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

import { Log } from '../log/index.js';
import { $create } from '../utils/dom-helpers.js';
import { events } from '../utils/event-listener-manager.js';
import { TimerManager } from '../utils/timer-manager.js';

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
            if (Log) Log.warn('[GeoLeaf Notifications] Container introuvable:', config.container);
            return false;
        }

        // Appliquer la classe de position
        if (config.position) {
            this.container.className = `gl-notifications gl-notifications--${config.position}`;
        }

        if (Log) Log.debug('[GeoLeaf Notifications] Système initialisé');

        // Initialiser les managers pour le cleanup
        this._eventManager = events ? events.createManager('notifications') : null;
        this._timerManager = new TimerManager('notifications');

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

                if (Log) Log.warn('[GeoLeaf Notifications] Queue pleine, notification droppée');
            } else {
                // Dropper le nouveau item
                if (Log) Log.warn('[GeoLeaf Notifications] Queue pleine, notification rejetée');
                return;
            }
        }

        // Ajouter à la queue
        this._queue.push(item);

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
                    this._remove(toast, false);
                }
            });
            toast.appendChild(closeBtn);
        }

        // Ajouter au DOM
        this.container.appendChild(toast);

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
        // Perf 6.2.6: Un seul timer — timerManager si disponible, sinon setTimeout nu
        if (!persistent) {
            if (this._timerManager) {
                toast.dataset.timerId = this._timerManager.setTimeout(() => {
                    this._remove(toast, false);
                }, duration);
            } else {
                const autoRemove = setTimeout(() => {
                    this._remove(toast, false);
                }, duration);
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
        // Perf 6.2.6: Un seul timer — timerManager si disponible, sinon setTimeout nu
        const _doRemove = () => {
            if (toast.parentNode) {
                toast.remove();
            }
            this._processQueue();
        };
        if (this._timerManager) {
            this._timerManager.setTimeout(_doRemove, removeDelay);
        } else {
            setTimeout(_doRemove, removeDelay);
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
        if (Log) Log.debug('[GeoLeaf Notifications] Système désactivé');
    }

    /**
     * Réactive les notifications
     */
    enable() {
        this.config.enabled = true;
        if (Log) Log.debug('[GeoLeaf Notifications] Système activé');
        // Traiter la queue au cas où des items sont en attente
        this._processQueue();
    }

    /**
     * Détruit le système de notifications et nettoie toutes les ressources
     * Retire tous les event listeners et timers actifs
     */
    destroy() {

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
            position: this.config.position
        };
    }
}

// Créer une instance singleton et l'exposer
const _UINotifications = new NotificationSystem();

// ── ESM Export ──
export { NotificationSystem, _UINotifications };
