/**
 * src/ui/index.js — Shim: aggregates UI + Notifications for legacy test paths
 * @see src/modules/geoleaf.ui.js
 * @see src/modules/ui/notifications.js
 */
export { UI } from '../modules/geoleaf.ui.js';
export { NotificationSystem as Notifications, _UINotifications } from '../modules/ui/notifications.js';
