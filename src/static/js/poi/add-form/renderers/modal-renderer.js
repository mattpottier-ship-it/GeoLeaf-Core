/**
 * GeoLeaf POI Add/Edit Form - Modal Structure Renderer
 * Handles modal container, header, and footer creation.
 *
 * @module window.GeoLeaf.POI.AddForm.Renderers.Modal
 * @version 2.0.0
 * @phase Phase 3 - UI Refactoring
 */

(function () {
  'use strict';

  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};
  if (!window.GeoLeaf.POI.AddForm.Renderers) window.GeoLeaf.POI.AddForm.Renderers = {};

  const Log = window.GeoLeaf.Log || console;

  /**
   * Modal Structure Renderer
   */
  window.GeoLeaf.POI.AddForm.Renderers.Modal = {

    /**
     * Create complete modal structure with overlay, header, body, and footer
     * @param {Object} context - Form context with modal reference and state
     * @param {Function} onClose - Close handler callback
     * @param {Function} onSubmit - Submit handler callback
     * @param {Function} onDelete - Delete handler callback
     * @returns {HTMLElement} Modal element
     */
    createModal(context, onClose, onSubmit, onDelete) {
      console.log('[ModalRenderer.createModal] Creating modal structure');
      Log.debug('[ModalRenderer] Creating modal structure');

      // Remove existing modal
      const existingModal = document.getElementById('gl-poi-add-modal');
      if (existingModal) {
        console.log('[ModalRenderer.createModal] Removing existing modal');
        document.body.removeChild(existingModal);
      }

      const modal = document.createElement('div');
      modal.id = 'gl-poi-add-modal';
      modal.className = 'gl-poi-modal';

      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'gl-poi-modal__overlay';
      overlay.onclick = () => onClose();
      modal.appendChild(overlay);

      // Content container
      const content = document.createElement('div');
      content.className = 'gl-poi-modal__content';

      // Header
      const header = this.createHeader(context.mode, onClose);
      content.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'gl-poi-modal__body';
      body.id = 'gl-poi-modal-body';
      content.appendChild(body);

      // Footer
      const footer = this.createFooter(context, onClose, onSubmit, onDelete);
      content.appendChild(footer);

      modal.appendChild(content);
      document.body.appendChild(modal);

      console.log('[ModalRenderer.createModal] Modal created and appended to body');

      return modal;
    },

    /**
     * Create modal header with title and close button
     * @param {string} mode - Current mode ('add' or 'edit')
     * @param {Function} onClose - Close handler callback
     * @returns {HTMLElement} Header element
     */
    createHeader(mode, onClose) {
      const header = document.createElement('div');
      header.className = 'gl-poi-modal__header';

      const title = document.createElement('h2');
      title.className = 'gl-poi-modal__title';

      const icon = mode === 'edit' ? '✏️' : '📍';
      const text = mode === 'edit' ? 'Modifier le POI' : 'Ajouter un nouveau POI';

      const iconSpan = document.createElement('span');
      iconSpan.style.marginRight = '8px';
      iconSpan.textContent = icon;
      title.appendChild(iconSpan);
      title.appendChild(document.createTextNode(text));
      header.appendChild(title);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'gl-poi-modal__close';
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.title = 'Fermer';
      closeBtn.onclick = () => onClose();
      header.appendChild(closeBtn);

      return header;
    },

    /**
     * Create modal footer with action buttons
     * @param {Object} context - Form context with mode, POI, and layer info
     * @param {Function} onClose - Close handler callback
     * @param {Function} onSubmit - Submit handler callback
     * @param {Function} onDelete - Delete handler callback (optional)
     * @returns {HTMLElement} Footer element
     */
    createFooter(context, onClose, onSubmit, onDelete) {
      const footer = document.createElement('div');
      footer.className = 'gl-poi-modal__footer';

      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'gl-poi-btn gl-poi-btn--secondary';
      cancelBtn.textContent = 'Annuler';
      cancelBtn.onclick = () => onClose();
      footer.appendChild(cancelBtn);

      // Delete button (only in edit mode with delete handler)
      if (context.mode === 'edit' && context.poi && onDelete) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'gl-poi-btn gl-poi-btn--danger';
        deleteBtn.textContent = '🗑️ Supprimer';
        deleteBtn.onclick = () => {
          console.log('[ModalRenderer.createFooter] Delete button clicked');
          onDelete();
        };
        footer.appendChild(deleteBtn);
      }

      // Save button
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.id = 'gl-poi-save-btn';
      saveBtn.className = 'gl-poi-btn gl-poi-btn--primary';
      saveBtn.textContent = context.mode === 'edit' ? 'Enregistrer' : 'Ajouter le POI';
      saveBtn.onclick = () => {
        console.log('[ModalRenderer.createFooter] Save button clicked');
        if (onSubmit) {
          onSubmit();
        } else {
          console.error('[ModalRenderer.createFooter] No onSubmit callback provided!');
        }
      };
      footer.appendChild(saveBtn);

      return footer;
    }
  };

  if (Log.debug) {
    Log.debug('[POI.AddForm.Renderers.Modal] Module chargé');
  }

})();
