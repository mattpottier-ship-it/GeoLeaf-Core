/* eslint-disable security/detect-object-injection */
// @ts-nocheck — migration TS, typage progressif
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
 * @updated 2026-01-23 - Standardisation API, queue prioritaire, integration Telemetry
 */

import { Log } from "../log/index.js";
import { $create } from "../utils/dom-helpers.js";
import { events } from "../utils/event-listener-manager.js";
import { TimerManager } from "../utils/timer-manager.js";
import { getLabel } from "../i18n/i18n.js";

// Constantes for thes prioritys de la queue
const PRIORITY = {
    ERROR: 3,
    WARNING: 2,
    SUCCESS: 1,
    INFO: 1,
};

class NotificationSystem {
    constructor() {
        this.container = null;
        this.maxVisible = 3; // Max toasts temporaires visibles
        this.maxPersistent = 2; // Max toasts persistants visibles
        this.durations = {
            success: 3000,
            error: 5000,
            warning: 4000,
            info: 3000,
        };
        this.config = {
            enabled: true,
            position: "bottom-center",
            animations: true,
        };

        // Managers pour cleanup
        this._eventManager = null;
        this._timerManager = null;
        this._activeToasts = new Map();

        // Queue avec prioritys (limite: 15 max en attente)
        this._queue = [];
        this._maxQueueSize = 15;
    }

    /**
     * Initializes the system de notifications
     * @param {Object} config - Configuration
     * @param {string} config.container - Selector du container
     * @param {number} config.maxVisible - Nombre max de toasts visibles
     * @param {Object} config.durations - Durations par type
     * @param {string} config.position - Position ('bottom-center', 'top-right', etc.)
     * @param {boolean} config.animations - Activer les animations
     */
    init(config = {}) {
        // Fusionner la config
        this.config = { ...this.config, ...config };
        this.maxVisible = config.maxVisible || 3;
        this.durations = { ...this.durations, ...config.durations };

        // Retrieve le container
        this.container = document.querySelector(config.container || "#gl-notifications");

        if (!this.container) {
            if (Log) Log.warn("[GeoLeaf Notifications] Container introuvable:", config.container);
            return false;
        }

        // Appliesr la class de position
        if (config.position) {
            this.container.className = `gl-notifications gl-notifications--${config.position}`;
        }

        if (Log) Log.debug("[GeoLeaf Notifications] System initialized");

        // Initializesr les managers for the cleanup
        this._eventManager = events ? events.createManager("notifications") : null;
        this._timerManager = new TimerManager("notifications");

        return true;
    }

    /**
     * Displays a generic notification (standardized public method)
     * Support double signature:
     * - show(message, type, duration) : Appel positionnel classique
     * - show(message, options) : Appel avec object options
     *
     * @param {string} message - Message to display
     * @param {string|Object} typeOrOptions - Type ('success', 'error', 'warning', 'info') OU object options
     * @param {number} [duration] - Custom duration (ms) - ignored if typeOrOptions is an object
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
     *   dismissible: true,      // Button de fermeture
     *   icon: "✓",             // Icon custome (futur)
     *   action: {               // Action button (futur)
     *     label: "Annuler",
     *     callback: () => {}
     *   }
     * });
     */
    show(message, typeOrOptions = "info", duration) {
        // Parser les arguments based on the signature
        let options = {};

        if (typeof typeOrOptions === "string") {
            // Signature positionnelle: show(message, type, duration)
            options = {
                type: typeOrOptions,
                duration: duration,
            };
        } else if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
            // Signature object: show(message, options)
            options = typeOrOptions;
        } else {
            // Fallback by default
            options = { type: "info" };
        }

        // Addsr to the queue avec priority
        return this._enqueue(message, options);
    }

    /**
     * Displays une notification de success
     * Support double signature:
     * - success(message, duration)
     * - success(message, options)
     *
     * @param {string} message - Message to display
     * @param {number|Object} [durationOrOptions] - Duration (ms) OU object options
     *
     * @example
     * success("Save successful", 3000);
     * success("Save successful", { duration: 3000, persistent: false });
     */
    success(message, durationOrOptions) {
        if (typeof durationOrOptions === "number") {
            return this.show(message, "success", durationOrOptions);
        } else if (typeof durationOrOptions === "object") {
            return this.show(message, { ...durationOrOptions, type: "success" });
        } else {
            return this.show(message, "success");
        }
    }

    /**
     * Displays une notification d'error
     * Support double signature:
     * - error(message, duration)
     * - error(message, options)
     *
     * @param {string} message - Message to display
     * @param {number|Object} [durationOrOptions] - Duration (ms) OU object options
     *
     * @example
     * error("Error network", 5000);
     * error("Error network", { duration: 5000, persistent: true });
     */
    error(message, durationOrOptions) {
        if (typeof durationOrOptions === "number") {
            return this.show(message, "error", durationOrOptions);
        } else if (typeof durationOrOptions === "object") {
            return this.show(message, { ...durationOrOptions, type: "error" });
        } else {
            return this.show(message, "error");
        }
    }

    /**
     * Displays une notification d'warning
     * Support double signature:
     * - warning(message, duration)
     * - warning(message, options)
     *
     * @param {string} message - Message to display
     * @param {number|Object} [durationOrOptions] - Duration (ms) OU object options
     *
     * @example
     * warning("Connexion instable", 4000);
     * warning("Connexion instable", { duration: 4000 });
     */
    warning(message, durationOrOptions) {
        if (typeof durationOrOptions === "number") {
            return this.show(message, "warning", durationOrOptions);
        } else if (typeof durationOrOptions === "object") {
            return this.show(message, { ...durationOrOptions, type: "warning" });
        } else {
            return this.show(message, "warning");
        }
    }

    /**
     * Displays une notification d'information
     * Support double signature:
     * - info(message, duration)
     * - info(message, options)
     *
     * @param {string} message - Message to display
     * @param {number|Object} [durationOrOptions] - Duration (ms) OU object options
     *
     * @example
     * info("Synchronization en cours", 3000);
     * info("Synchronization en cours", { persistent: true, dismissible: false });
     */
    info(message, durationOrOptions) {
        if (typeof durationOrOptions === "number") {
            return this.show(message, "info", durationOrOptions);
        } else if (typeof durationOrOptions === "object") {
            return this.show(message, { ...durationOrOptions, type: "info" });
        } else {
            return this.show(message, "info");
        }
    }

    /**
     * Adds ae notification to the queue avec priority
     * @private
     * @param {string} message - Message
     * @param {Object} options - Options de la notification
     */
    _enqueue(message, options) {
        const type = options.type || "info";
        const priority = PRIORITY[type.toUpperCase()] || PRIORITY.INFO;

        const item = {
            message,
            options: {
                type,
                duration: options.duration,
                persistent: options.persistent || false,
                dismissible: options.dismissible !== false, // true by default
                icon: options.icon,
                action: options.action,
            },
            priority,
            timestamp: Date.now(),
        };

        // Check la limite de la queue
        if (this._queue.length >= this._maxQueueSize) {
            // Find the lowest priority element (and oldest if tie)
            const lowestPriorityIndex = this._queue.reduce((minIdx, item, idx, arr) => {
                const minItem = arr[minIdx];
                if (
                    item.priority < minItem.priority ||
                    (item.priority === minItem.priority && item.timestamp < minItem.timestamp)
                ) {
                    return idx;
                }
                return minIdx;
            }, 0);

            // If the nouvel item est plus prioritaire que le moins prioritaire in the queue
            if (item.priority > this._queue[lowestPriorityIndex].priority) {
                // Removesr le moins prioritaire
                this._queue.splice(lowestPriorityIndex, 1);

                if (Log) Log.warn("[GeoLeaf Notifications] Queue full, notification dropped");
            } else {
                // Dropper le nouveau item
                if (Log) Log.warn("[GeoLeaf Notifications] Queue full, notification rejected");
                return;
            }
        }

        // Addsr to the queue
        this._queue.push(item);

        // Trier la queue par priority (desc) puis timestamp (asc)
        this._queue.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority; // Descending priority
            }
            return a.timestamp - b.timestamp; // Timestamp croissant (FIFO pour same priority)
        });

        // Processesr la queue
        return this._processQueue();
    }

    _makeSpaceForPriority(nextItem, temporaryToasts) {
        if (nextItem.priority === PRIORITY.ERROR && temporaryToasts.length > 0) {
            const toastToRemove =
                temporaryToasts.find(
                    (t) =>
                        t.classList.contains("gl-toast--info") ||
                        t.classList.contains("gl-toast--success")
                ) || temporaryToasts[0];
            this._remove(toastToRemove, true);
            return true; // space was made, continue
        }
        return false; // no space could be made
    }

    /**
     * Processes the queue and displays notifications based on availability
     * @private
     */
    _processQueue() {
        if (!this.container || !this.config.enabled || this._queue.length === 0) {
            return null;
        }

        // Compter les toasts currentlement visibles
        const visibleToasts = this.container.querySelectorAll(".gl-toast:not(.gl-toast--removing)");
        const temporaryToasts = Array.from(visibleToasts).filter((t) => !t.dataset.persistent);
        const persistentToasts = Array.from(visibleToasts).filter((t) => t.dataset.persistent);

        // Tant qu'il y a de la place et des items in the queue
        let lastToast = null;
        while (this._queue.length > 0) {
            const nextItem = this._queue[0];
            const isPersistent = nextItem.options.persistent;

            // Check si on peut display ce toast
            const canShow = isPersistent
                ? persistentToasts.length < this.maxPersistent
                : temporaryToasts.length < this.maxVisible;

            if (!canShow) {
                // If priority toast, try to make room; otherwise stop processing
                if (!this._makeSpaceForPriority(nextItem, temporaryToasts)) {
                    break;
                }
            }

            // Retirer de la queue et display
            const item = this._queue.shift();
            lastToast = this._showImmediate(item.message, item.options);

            // Mettre up to date les compteurs
            if (isPersistent) {
                persistentToasts.push(null); // Placeholder
            } else {
                temporaryToasts.push(null); // Placeholder
            }
        }

        return lastToast;
    }

    /**
     * Displays une notification immediately (used par la queue)
     * @private
     * @param {string} message - Message to display
     * @param {Object} options - Options de la notification
     */
    _showImmediate(message, options) {
        const type = options.type || "info";
        const duration = options.duration || this.durations[type];
        const persistent = !!options.persistent;
        const dismissible = options.dismissible !== false;

        // Createsr le toast
        const toast = $create("div", {
            className: `gl-toast gl-toast--${type}`,
            attributes: {
                role: "alert",
                // Utiliser assertive pour errors et toasts prioritaires
                "aria-live":
                    type === "error" || options.priority === PRIORITY.ERROR
                        ? "assertive"
                        : "polite",
            },
        });

        // Marquer si persistant
        if (persistent) {
            toast.dataset.persistent = "true";
        }

        // Creates the message (textContent = secure)
        const messageSpan = $create("span", {
            className: "gl-toast__message",
            textContent: message,
        });
        toast.appendChild(messageSpan);

        if (dismissible) this._appendCloseButton(toast);

        // Addsr au DOM
        this.container.appendChild(toast);

        // Animation d'input
        if (this.config.animations) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    toast.classList.add("gl-toast--visible");
                });
            });
        } else {
            toast.classList.add("gl-toast--visible");
        }

        // Planifier l'auto-removal (only si non persistant)
        // Perf 6.2.6: Un seul timer — timerManager si available, sinon setTimeout nu
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

    _appendCloseButton(toast) {
        const closeBtn = $create("button", {
            className: "gl-toast__close",
            attributes: {
                "aria-label": getLabel("aria.notification.close_label"),
                title: getLabel("aria.notification.close_title"),
            },
            textContent: getLabel("ui.notification.close_char"),
            onClick: () => {
                this._remove(toast, false);
            },
        });
        toast.appendChild(closeBtn);
    }

    /**
     * Retire une notification
     * @private
     * @param {HTMLElement} toast - Element toast to retirer
     * @param {boolean} isReorganization - If true, this is a reorganization (different animation)
     */
    _remove(toast, isReorganization = false) {
        if (!toast || toast.classList.contains("gl-toast--removing")) {
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

        // Animation de output
        toast.classList.add("gl-toast--removing");
        toast.classList.remove("gl-toast--visible");

        // Applies specific animation for reorganization
        if (isReorganization && this.config.animations) {
            toast.classList.add("gl-toast--sliding-up");
        }

        const removeDelay = this.config.animations ? 200 : 0;
        // Perf 6.2.6: Un seul timer — timerManager si available, sinon setTimeout nu
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

        const toasts = this.container.querySelectorAll(".gl-toast");
        toasts.forEach((toast) => this._remove(toast, false));

        // Emptyr aussi la queue
        this._queue = [];
    }

    /**
     * Ferme une notification specific par sa reference DOM
     * @param {HTMLElement} toastEl - Toast element returned by show/info/success/etc.
     */
    dismiss(toastEl) {
        if (!toastEl) return;
        this._remove(toastEl, false);
    }

    /**
     * Temporarily disables notifications
     */
    disable() {
        this.config.enabled = false;
        if (Log) Log.debug("[GeoLeaf Notifications] System disabled");
    }

    /**
     * Re-enables notifications
     */
    enable() {
        this.config.enabled = true;
        if (Log) Log.debug("[GeoLeaf Notifications] System enabled");
        // Processes the queue in case items are waiting
        this._processQueue();
    }

    /**
     * Destroyed the system de notifications et nettoie toutes les ressources
     * Retire tous les event listners et timers actives
     */
    destroy() {
        // Clear tous les timers actives
        if (this._timerManager) {
            this._timerManager.destroy();
            this._timerManager = null;
        }

        // Retire tous les event listners
        if (this._eventManager) {
            this._eventManager.destroy();
            this._eventManager = null;
        }

        // Retire tous les toasts actives
        if (this.container) {
            const toasts = this.container.querySelectorAll(".gl-toast");
            toasts.forEach((toast) => toast.remove());
        }

        // Clear la queue
        this._queue = [];

        // Clear la map
        this._activeToasts.clear();

        // Reset les properties
        this.container = null;
        this.config.enabled = false;

        if (Log) Log.info("[GeoLeaf Notifications] System destroyed and cleaned up");
    }

    /**
     * Get current status of notification system
     * @returns {Object} Status information
     */
    getStatus() {
        const visibleToasts = this.container
            ? this.container.querySelectorAll(".gl-toast:not(.gl-toast--removing)")
            : [];
        const temporaryToasts = Array.from(visibleToasts).filter((t) => !t.dataset.persistent);
        const persistentToasts = Array.from(visibleToasts).filter((t) => t.dataset.persistent);

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
        };
    }
}

// Createsr an instance singleton et l'exposer
const _UINotifications = new NotificationSystem();

// ── ESM Export ──
export { NotificationSystem, _UINotifications };
