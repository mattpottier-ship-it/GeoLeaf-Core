/**
 * @file state-manager.js
 * @description Centralized state management for POI Add/Edit Form modal
 *
 * Handles modal lifecycle, mode tracking, and form state with observer pattern.
 * v3.2: Enhanced state centralization for better debugging and performance.
 *
 * @version 3.2.0
 * @phase Phase 2 - Performance Optimization (State Centralization)
 *
 * STATE ARCHITECTURE:
 * ===================
 * All form state stored in single _centralState object:
 *   - mode: 'add' | 'edit' | 'delete' | null
 *   - poi: Current POI being edited or null
 *   - layer: Current layer configuration or null
 *   - coordinates: L.LatLng object or null
 *   - modal: HTML modal element or null
 *   - tempMarker: Temporary placement marker or null
 *   - imageFiles: Array of File objects
 *   - isDirty: Whether form has unsaved changes
 *   - isValid: Whether current form state is valid
 *
 * OBSERVER PATTERN:
 * =================
 * StateManager fires events when state changes:
 *   - 'stateChanged:mode' - Form mode changed
 *   - 'stateChanged:poi' - POI data changed
 *   - 'stateChanged:layer' - Layer selected changed
 *   - 'stateChanged:all' - Any state changed
 *
 * USAGE:
 * ======
 *   // Listen for state changes
 *   StateManager.onChange('stateChanged:mode', (newMode) => {
 *     console.log('Mode changed to:', newMode);
 *   });
 *
 *   // Change state (fires events)
 *   StateManager.setMode('edit');  // Fires 'stateChanged:mode'
 *
 *   // Get snapshot of entire state
 *   const state = StateManager.getState();  // Returns centralized object
 *
 * PERFORMANCE NOTES:
 * ==================
 * v3.2: Centralized state eliminates scattered state across modules.
 * - Before: State in StateManager + closures in Renderer, DataMapper, etc.
 * - After: Single source of truth in StateManager
 * - Benefit: Easier debugging, better memory management, clearer data flow
 */

(function (global) {
  'use strict';

  // Initialize namespace
  window.GeoLeaf = window.GeoLeaf || {};
  window.GeoLeaf.POI = window.GeoLeaf.POI || {};
  window.GeoLeaf.POI.AddForm = window.GeoLeaf.POI.AddForm || {};

  /**
   * Centralized FormStateManager
   *
   * v3.2: All state stored in single _centralState object.
   * Observer callbacks track all state mutations.
   */
  const FormStateManager = {
    /**
     * Centralized state object (v3.2)
     * Single source of truth for all form state
     * @type {Object}
     * @private
     */
    _centralState: null,

    /**
     * State change observers/callbacks
     * @type {Object<string, Array<Function>>}
     * @private
     */
    _observers: {},

    /**
     * Initialize state with default values
     */
    init() {
      this._initializeCentralState();
      this._observers = {
        'stateChanged:mode': [],
        'stateChanged:poi': [],
        'stateChanged:layer': [],
        'stateChanged:all': []
      };
      window.GeoLeaf.Log?.debug('[StateManager] Centralized state initialized (v3.2)');
    },

    /**
     * Initialize central state object
     * @private
     */
    _initializeCentralState() {
      this._centralState = {
        mode: null,           // 'add' | 'edit' | 'delete'
        poi: null,            // Current POI being edited
        layer: null,          // Current layer config
        coordinates: null,    // L.LatLng
        modal: null,          // HTML element
        tempMarker: null,     // Leaflet marker
        imageFiles: [],       // Array<File>
        isDirty: false,       // Has unsaved changes
        isValid: false        // Form passes validation
      };
    },

    /**
     * Reset all state to defaults
     */
    reset() {
      this._initializeCentralState();
      this._notifyObservers('stateChanged:all', null);
    },

    /**
     * Register observer for state changes
     *
     * @param {string} event - Event name ('stateChanged:mode', 'stateChanged:poi', etc.)
     * @param {Function} callback - Function called when state changes: (newValue, oldValue) => {}
     *
     * @public
     *
     * @example
     *   // Listen for mode changes
     *   StateManager.onChange('stateChanged:mode', (newMode, oldMode) => {
     *     console.log(`Mode changed from ${oldMode} to ${newMode}`);
     *   });
     */
    onChange(event, callback) {
      if (!this._observers[event]) {
        this._observers[event] = [];
      }
      this._observers[event].push(callback);
      window.GeoLeaf.Log?.debug(`[StateManager] Observer registered for: ${event}`);
    },

    /**
     * Notify all observers of state change
     * @private
     */
    _notifyObservers(event, newValue, oldValue) {
      if (!this._observers[event]) return;

      for (const callback of this._observers[event]) {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          window.GeoLeaf.Log?.error(`[StateManager] Observer error for ${event}:`, error.message);
        }
      }

      // Also notify 'all changes' observers
      if (event !== 'stateChanged:all') {
        this._notifyObservers('stateChanged:all', newValue, oldValue);
      }
    },

    /**
     * Get current state snapshot (entire centralized state)
     *
     * @returns {Object} Current state object
     *
     * @public
     *
     * @example
     *   const state = StateManager.getState();
     *   console.log(state.mode, state.poi, state.layer);
     */
    getState() {
      return { ...this._centralState };
    },

    /**
     * Set specific state property and notify observers
     *
     * @param {string} key - Property name
     * @param {*} value - New value
     * @private (internal use)
     */
    _setStateProperty(key, value, eventName) {
      const oldValue = this._centralState[key];

      // Only update if value actually changed
      if (oldValue === value) return;

      this._centralState[key] = value;
      this._notifyObservers(eventName, value, oldValue);

      window.GeoLeaf.Log?.debug(`[StateManager] ${key} changed`);
    },

    /**
     * Set form mode
     *
     * @param {string} mode - 'add' | 'edit' | 'delete'
     *
     * @public
     */
    setMode(mode) {
      if (!['add', 'edit', 'delete'].includes(mode)) {
        window.GeoLeaf.Log?.warn('[StateManager] Invalid mode:', mode);
        return;
      }
      this._setStateProperty('mode', mode, 'stateChanged:mode');
    },

    /**
     * Get current form mode
     *
     * @returns {string|null} Current mode
     *
     * @public
     */
    getMode() {
      return this._centralState.mode;
    },

    /**
     * Set current POI being edited
     *
     * @param {Object|null} poi - POI object
     *
     * @public
     */
    setPoi(poi) {
      this._setStateProperty('poi', poi, 'stateChanged:poi');
    },

    /**
     * Get current POI
     *
     * @returns {Object|null} Current POI
     *
     * @public
     */
    getPoi() {
      return this._centralState.poi;
    },

    /**
     * Set current layer configuration
     *
     * @param {Object|null} layer - Layer config
     *
     * @public
     */
    setLayer(layer) {
      this._setStateProperty('layer', layer, 'stateChanged:layer');
    },

    /**
     * Get current layer
     *
     * @returns {Object|null} Current layer config
     *
     * @public
     */
    getLayer() {
      return this._centralState.layer;
    },

    /**
     * Set coordinates
     *
     * @param {L.LatLng|Object} coordinates - Coordinates object
     *
     * @public
     */
    setCoordinates(coordinates) {
      this._centralState.coordinates = coordinates;
    },

    /**
     * Get current coordinates
     *
     * @returns {L.LatLng|Object|null} Current coordinates
     *
     * @public
     */
    getCoordinates() {
      return this._centralState.coordinates;
    },

    /**
     * Set temporary marker reference
     *
     * @param {L.Marker|null} marker - Leaflet marker
     *
     * @public
     */
    setTempMarker(marker) {
      this._centralState.tempMarker = marker;
    },

    /**
     * Get temporary marker
     *
     * @returns {L.Marker|null} Temp marker
     *
     * @public
     */
    getTempMarker() {
      return this._centralState.tempMarker;
    },

    /**
     * Mark form as dirty (has unsaved changes)
     *
     * @param {boolean} isDirty - Dirty state
     *
     * @public
     */
    setDirty(isDirty) {
      this._centralState.isDirty = isDirty;
    },

    /**
     * Check if form has unsaved changes
     *
     * @returns {boolean} True if there are changes
     *
     * @public
     */
    isDirty() {
      return this._centralState.isDirty;
    },

    /**
     * Mark form as valid/invalid
     *
     * @param {boolean} isValid - Validation state
     *
     * @public
     */
    setValid(isValid) {
      this._centralState.isValid = isValid;
    },

    /**
     * Check if form is valid
     *
     * @returns {boolean} True if form passes validation
     *
     * @public
     */
    isValid() {
      return this._centralState.isValid;
    },

    /**
     * Set image files array
     *
     * @param {Array} files - Array of File objects
     *
     * @public
     */
    setImageFiles(files) {
      this._centralState.imageFiles = Array.isArray(files) ? [...files] : [];
    },

    /**
     * Add image file
     *
     * @param {File|Object} fileOrObj - File object or {file: File, type: string}
     *
     * @public
     */
    addImageFile(fileOrObj) {
      // Support both formats: File or {file, type}
      if (fileOrObj instanceof File) {
        this._centralState.imageFiles.push(fileOrObj);
      } else if (fileOrObj && fileOrObj.file instanceof File) {
        this._centralState.imageFiles.push(fileOrObj);
      }
      this._centralState.isDirty = true;
    },

    /**
     * Remove image file at index
     *
     * @param {number} index - File index
     *
     * @public
     */
    removeImageFile(index) {
      if (index >= 0 && index < this._centralState.imageFiles.length) {
        this._centralState.imageFiles.splice(index, 1);
        this._centralState.isDirty = true;
      }
    },

    /**
     * Get image files
     *
     * @returns {Array} Array of File objects
     *
     * @public
     */
    getImageFiles() {
      return [...this._centralState.imageFiles];
    },

    /**
     * Clear all image files
     *
     * @public
     */
    clearImageFiles() {
      this._centralState.imageFiles = [];
    },

    /**
     * Set modal DOM reference
     *
     * @param {HTMLElement|null} modal - Modal element
     *
     * @public
     */
    setModal(modal) {
      this._centralState.modal = modal;
    },

    /**
     * Get modal element
     *
     * @returns {HTMLElement|null} Modal element
     *
     * @public
     */
    getModal() {
      return this._centralState.modal;
    },

    /**
     * Show modal
     * Displays the modal and adds body class
     *
     * @public
     */
    showModal() {
      if (this._centralState.modal) {
        this._centralState.modal.style.display = 'flex';
        document.body.classList.add('gl-poi-modal-open');
        window.GeoLeaf.Log?.debug('[StateManager] Modal shown');
      } else {
        window.GeoLeaf.Log?.error('[StateManager] Cannot show modal: element is null');
      }
    },

    /**
     * Hide modal
     * Hides the modal and removes body class
     *
     * @param {number} [delay=300] - Cleanup delay in ms
     *
     * @public
     */
    hideModal(delay = 300) {
      if (this._centralState.modal) {
        this._centralState.modal.style.display = 'none';
        document.body.classList.remove('gl-poi-modal-open');

        // Schedule cleanup
        setTimeout(() => {
          if (this._centralState.modal && this._centralState.modal.parentNode) {
            document.body.removeChild(this._centralState.modal);
          }
          this.cleanup();
        }, delay);
      }
    },

    /**
     * Clean up state after modal close
     * Removes temporary marker and resets state
     *
     * @public
     */
    cleanup() {
      // Remove temporary marker
      if (this._centralState.tempMarker && window.GeoLeaf.POI.PlacementMode) {
        window.GeoLeaf.POI.PlacementMode.removeMarker();
      }

      // Reset all state
      this.reset();

      window.GeoLeaf.Log?.debug('[StateManager] State cleaned up');
    },

    /**
     * Check if form has unsaved changes (DOM-based check)
     *
     * @returns {boolean} True if there are changes
     *
     * @public
     */
    hasUnsavedChanges() {
      if (!this._centralState.modal) return false;

      // Check if any input has a value (excluding layer selector)
      const inputs = this._centralState.modal.querySelectorAll('input, textarea, select');
      for (const input of inputs) {
        if (input.value && input.id !== 'poi-layer-select') {
          return true;
        }
      }
      return false;
    },

    /**
     * Confirm close with user if there are unsaved changes
     *
     * @param {Function} [onConfirm] - Callback if user confirms close
     * @returns {boolean} True if should close, false if canceled
     *
     * @public
     */
    confirmClose(onConfirm) {
      const hasChanges = this.hasUnsavedChanges();

      if (hasChanges) {
        const confirmed = confirm(
          'Voulez-vous vraiment fermer ? Les modifications non enregistrées seront perdues.'
        );
        if (confirmed && typeof onConfirm === 'function') {
          onConfirm();
        }
        return confirmed;
      }

      // No changes, safe to close
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
      return true;
    },

    /**
     * Check if form is in edit mode
     *
     * @returns {boolean} True if editing
     *
     * @public
     */
    isEditMode() {
      return this._centralState.mode === 'edit';
    },

    /**
     * Check if form is in add mode
     *
     * @returns {boolean} True if adding
     *
     * @public
     */
    isAddMode() {
      return this._centralState.mode === 'add';
    },

    /**
     * Check if form is in delete mode
     *
     * @returns {boolean} True if deleting
     *
     * @public
     */
    isDeleteMode() {
      return this._centralState.mode === 'delete';
    },
  };

  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  // Export to namespace
  window.GeoLeaf.POI.AddForm.StateManager = FormStateManager;

  window.GeoLeaf.Log?.debug('[StateManager] Centralized FormStateManager loaded (v3.2)');
})(window);
