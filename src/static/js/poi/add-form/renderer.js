/**
 * @fileoverview POI Add Form - Renderer Orchestrator (Refactored v3.0.0)
 * @description Delegates rendering tasks to specialized sub-modules
 * @author GeoLeaf Team
 * @version 3.0.0
 *
 * ARCHITECTURE:
 * This is the main API entry point that maintains backward compatibility
 * while delegating to specialized renderer modules:
 * - Modal: createModal, createHeader, createFooter
 * - Sections: layer selector, coordinates, basic fields, categories, dynamic fields, images
 * - Fields: createFieldFromConfig, tags, lists, tables
 * - Images: image upload UI with previews
 *
 * SUB-MODULES (must be loaded before this file):
 * - renderers/modal-renderer.js
 * - renderers/sections-renderer.js
 * - renderers/fields-renderer.js
 * - renderers/images-renderer.js
 */

(function () {
  'use strict';

  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  const Log = window.GeoLeaf.Log || console;

  /**
   * Check if all required sub-modules are loaded
   * @returns {boolean} True if all modules available
   */
  function checkDependencies() {
    const required = [
      'window.GeoLeaf.POI.AddForm.Renderers.Modal',
      'window.GeoLeaf.POI.AddForm.Renderers.Sections',
      'window.GeoLeaf.POI.AddForm.Renderers.Fields',
      'window.GeoLeaf.POI.AddForm.Renderers.Images'
    ];

    const missing = required.filter(path => {
      const parts = path.split('.');
      let obj = window;
      for (const part of parts) {
        if (!obj[part]) return true;
        obj = obj[part];
      }
      return false;
    });

    if (missing.length > 0) {
      Log?.error?.('[FormRenderer] Missing dependencies:', missing);
      return false;
    }

    return true;
  }

  /**
   * FormRenderer (Orchestrator)
   * Delegates all rendering tasks to specialized sub-modules
   */
  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  window.GeoLeaf.POI.AddForm.Renderer = {

    // ============================================================
    // MODAL METHODS (delegate to Modal module)
    // ============================================================

    /**
     * Create modal structure with overlay, header, body, and footer
     * @param {Object} context - Form context with modal reference and state
     * @param {Function} onClose - Close handler callback
     * @param {Function} onSubmit - Submit handler callback
     * @param {Function} onDelete - Delete handler callback
     */
    createModal(context, onClose, onSubmit, onDelete) {
      if (!checkDependencies()) {
        Log?.error?.('[FormRenderer] Cannot create modal - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Modal.createModal(context, onClose, onSubmit, onDelete);
    },

    /**
     * Create modal header
     * @param {Object} context - Form context
     * @param {Function} onClose - Close handler
     * @returns {HTMLElement} Header element
     */
    createHeader(context, onClose) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create header - dependencies not loaded');
        return document.createElement('div');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Modal.createHeader(context, onClose);
    },

    /**
     * Create modal footer
     * @param {Object} context - Form context
     * @param {Function} onSubmit - Submit handler
     * @param {Function} onDelete - Delete handler
     * @returns {HTMLElement} Footer element
     */
    createFooter(context, onSubmit, onDelete) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create footer - dependencies not loaded');
        return document.createElement('div');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Modal.createFooter(context, onSubmit, onDelete);
    },

    // ============================================================
    // SECTIONS METHODS (delegate to Sections module)
    // ============================================================

    /**
     * Populate layer selector dropdown
     * @param {Object} context - Form context
     * @param {Function} onLayerSelect - Callback when layer is selected
     * @param {Array} editableLayers - Array of editable layers
     */
    populateLayerSelector(context, onLayerSelect, editableLayers = []) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot populate layer selector - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.populateLayerSelector(context, onLayerSelect, editableLayers);
    },

    /**
     * Clear form container content
     */
    clearFormContainer() {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot clear form container - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.clearFormContainer();
    },

    /**
     * Generate complete dynamic form based on layer configuration
     * @param {Object} layer - Layer configuration object
     * @param {Object} coordinates - Current coordinates {lat, lng}
     * @param {Function} onGeolocation - Geolocation button callback
     */
    generateForm(layer, coordinates, onGeolocation) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot generate form - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.generateForm(layer, coordinates, onGeolocation);
    },

    /**
     * Add coordinates section with lat/lng inputs and geolocation button
     * @param {HTMLElement} container - Parent container element
     * @param {Object} coordinates - Current coordinates {lat, lng}
     * @param {Function} onGeolocation - Geolocation button callback
     */
    addCoordinatesSection(container, coordinates, onGeolocation) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot add coordinates section - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.addCoordinatesSection(container, coordinates, onGeolocation);
    },

    /**
     * Add basic fields section (title, description)
     * @param {HTMLElement} container - Parent container element
     */
    addBasicFieldsSection(container) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot add basic fields section - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.addBasicFieldsSection(container);
    },

    /**
     * Add category/subcategory section from taxonomy
     * @param {HTMLElement} container - Parent container element
     * @param {Object} layer - Layer configuration
     */
    addCategorySection(container, layer) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot add category section - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.addCategorySection(container, layer);
    },

    /**
     * Add dynamic fields from layer sidepanel configuration
     * @param {HTMLElement} container - Parent container
     * @param {Array} detailLayout - Array of field configurations
     * @param {Object} layer - Layer configuration object
     */
    addDynamicFields(container, detailLayout, layer) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot add dynamic fields - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Sections.addDynamicFields(container, detailLayout, layer);
    },

    // ============================================================
    // FIELDS METHODS (delegate to Fields module)
    // ============================================================

    /**
     * Create form field from configuration
     * @param {Object} fieldConfig - Field configuration object
     * @param {Object} layer - Layer configuration object
     * @returns {HTMLElement|null} Form group element or null
     */
    createFieldFromConfig(fieldConfig, layer) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create field from config - dependencies not loaded');
        return null;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createFieldFromConfig(fieldConfig, layer);
    },

    /**
     * Create tags selector (multi-select badges)
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration
     * @param {Object} layer - Layer configuration object
     * @returns {HTMLElement} Tags selector container
     */
    createTagsSelector(fieldId, fieldConfig, layer) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create tags selector - dependencies not loaded');
        return document.createElement('div');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createTagsSelector(fieldId, fieldConfig, layer);
    },

    /**
     * Create editable list widget
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration
     * @returns {HTMLElement} List editor container
     */
    createEditableList(fieldId, fieldConfig) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create editable list - dependencies not loaded');
        return document.createElement('div');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createEditableList(fieldId, fieldConfig);
    },

    /**
     * Create a list item with input and delete button
     * @returns {HTMLElement} List item element
     */
    createListItem() {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create list item - dependencies not loaded');
        return document.createElement('li');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createListItem();
    },

    /**
     * Create editable table widget
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration with columns
     * @returns {HTMLElement} Table editor container
     */
    createEditableTable(fieldId, fieldConfig) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create editable table - dependencies not loaded');
        return document.createElement('div');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createEditableTable(fieldId, fieldConfig);
    },

    /**
     * Create a table row with editable cells
     * @param {Array} columns - Column definitions array
     * @returns {HTMLElement} Table row element
     */
    createTableRow(columns) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot create table row - dependencies not loaded');
        return document.createElement('tr');
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Fields.createTableRow(columns);
    },

    // ============================================================
    // IMAGES METHODS (delegate to Images module)
    // ============================================================

    /**
     * Add images section with main image and gallery inputs
     * @param {HTMLElement} container - Parent container element
     */
    addImagesSection(container) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot add images section - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Images.addImagesSection(container);
    },

    /**
     * Handle image selection and preview
     * @param {Event} event - Change event from file input
     * @param {string} type - Image type ('main' or 'gallery')
     */
    handleImageSelect(event, type) {
      if (!checkDependencies()) {
        Log?.error('[FormRenderer] Cannot handle image select - dependencies not loaded');
        return;
      }
      return window.GeoLeaf.POI.AddForm.Renderers.Images.handleImageSelect(event, type);
    }

  };

  // Verify dependencies on load
  if (checkDependencies()) {
    Log?.info('[FormRenderer] Orchestrator initialized - all sub-modules loaded');
  } else {
    Log?.warn('[FormRenderer] Orchestrator initialized - some sub-modules missing');
  }

})();
