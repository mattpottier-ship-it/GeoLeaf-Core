/**
 * @file realtime-validator.js
 * @namespace window.GeoLeaf.POI.AddForm.RealtimeValidator
 * @description Real-time field validation with live error feedback
 *
 * Validates form fields as user types and displays inline error messages.
 * Improves UX by giving immediate feedback instead of waiting until submit.
 *
 * @version 3.2.0
 * @phase Phase 2.4 - Real-Time Field Validation
 *
 * FEATURES:
 * =========
 * - Per-field validation as user types
 * - Inline error message display
 * - Visual field state indicator (valid/invalid)
 * - Real-time form validity tracking
 * - Debounced validation for performance
 * - Custom validation rules per field type
 *
 * VALIDATION RULES:
 * =================
 * - text: Non-empty (if required), max length per config
 * - longtext: Non-empty (if required), max length
 * - list: At least one item (if required)
 * - tags: At least one tag (if required)
 * - number: Valid number format, within range (if specified)
 * - email: Valid email format (if type === 'email')
 * - url: Valid URL format (if type === 'url')
 *
 * USAGE:
 * ======
 *   // Initialize with form state
 *   RealtimeValidator.init(StateManager);
 *
 *   // Listen for form validity changes
 *   StateManager.onChange('stateChanged:all', (newValue) => {
 *     if (StateManager.isValid()) {
 *       enableSubmitButton();
 *     } else {
 *       disableSubmitButton();
 *     }
 *   });
 *
 * PERFORMANCE:
 * ============
 * - Debounce interval: 300ms (adjustable)
 * - Only re-validates changed field
 * - Lazy DOM queries (cached)
 * - No unnecessary re-renders
 */

(function (global) {
  'use strict';

  // Initialize namespace
  window.GeoLeaf = window.GeoLeaf || {};
  window.GeoLeaf.POI = window.GeoLeaf.POI || {};
  window.GeoLeaf.POI.AddForm = window.GeoLeaf.POI.AddForm || {};

  /**
   * Real-time validator with live error feedback
   * @namespace window.GeoLeaf.POI.AddForm.RealtimeValidator
   */
  const RealtimeValidator = {
    /**
     * State manager reference
     * @type {Object}
     * @private
     */
    _stateManager: null,

    /**
     * Validation rules per field
     * @type {Object<string, Object>}
     * @private
     */
    _fieldErrors: {},

    /**
     * Debounce timers for field validation
     * @type {Object<string, number>}
     * @private
     */
    _debounceTimers: {},

    /**
     * Debounce interval in milliseconds
     * @type {number}
     * @private
     */
    _debounceInterval: 300,

    /**
     * Initialize real-time validator
     *
     * Attaches change listeners to all form fields.
     * Must be called after form is rendered.
     *
     * @param {Object} stateManager - StateManager instance
     *
     * @public
     *
     * @example
     *   // Called after form is created
     *   RealtimeValidator.init(window.GeoLeaf.POI.AddForm.StateManager);
     */
    init(stateManager) {
      this._stateManager = stateManager;
      this._fieldErrors = {};
      this._debounceTimers = {};

      const state = stateManager.getState();
      if (!state.modal) {
        window.GeoLeaf.Log?.warn('[RealtimeValidator] No modal found, skipping initialization');
        return;
      }

      // Attach listeners to all form fields
      const inputs = state.modal.querySelectorAll('input, textarea, select');
      for (const input of inputs) {
        // Skip read-only mode and non-form inputs
        if (input.disabled || input.id === 'poi-layer-select') continue;

        const fieldId = input.id || input.name || input.dataset.field;
        if (!fieldId) continue;

        // Add change listener with debounce
        input.addEventListener('change', () => this._onFieldChange(fieldId, input));
        input.addEventListener('input', () => this._debounceValidate(fieldId, input));
        input.addEventListener('blur', () => this._onFieldBlur(fieldId, input));
      }

      window.GeoLeaf.Log?.debug('[RealtimeValidator] Initialized with listeners');
    },

    /**
     * Handle field change event
     *
     * Validates field and updates error state.
     * Called on change event (non-debounced).
     *
     * @param {string} fieldId - Field identifier
     * @param {HTMLElement} input - Input element
     *
     * @private
     */
    _onFieldChange(fieldId, input) {
      this._validateField(fieldId, input);
    },

    /**
     * Handle field blur event
     *
     * Validates field on blur for better UX.
     * User sees error after leaving field, not while typing.
     *
     * @param {string} fieldId - Field identifier
     * @param {HTMLElement} input - Input element
     *
     * @private
     */
    _onFieldBlur(fieldId, input) {
      // Clear debounce timer if pending
      if (this._debounceTimers[fieldId]) {
        clearTimeout(this._debounceTimers[fieldId]);
      }

      // Validate immediately on blur
      this._validateField(fieldId, input);
    },

    /**
     * Debounce field validation
     *
     * Prevents excessive validation while user is typing.
     * Waits 300ms after last keystroke before validating.
     *
     * @param {string} fieldId - Field identifier
     * @param {HTMLElement} input - Input element
     *
     * @private
     */
    _debounceValidate(fieldId, input) {
      // Clear previous timer
      if (this._debounceTimers[fieldId]) {
        clearTimeout(this._debounceTimers[fieldId]);
      }

      // Set new timer
      this._debounceTimers[fieldId] = setTimeout(() => {
        this._validateField(fieldId, input);
      }, this._debounceInterval);
    },

    /**
     * Validate a single field
     *
     * Checks field value against validation rules.
     * Updates error display and form validity.
     *
     * @param {string} fieldId - Field identifier
     * @param {HTMLElement} input - Input element
     *
     * @private
     */
    _validateField(fieldId, input) {
      let error = null;

      // Get field configuration
      const fieldConfig = this._getFieldConfig(fieldId);
      if (!fieldConfig) {
        return; // Skip unknown fields
      }

      // Run validation rules
      error = this._runValidationRules(input, fieldConfig);

      // Update error state
      this._setFieldError(fieldId, error);

      // Update visual indicator
      this._updateFieldIndicator(input, !error);

      // Update overall form validity
      this._updateFormValidity();
    },

    /**
     * Get field configuration from form
     *
     * Finds config by field ID or name.
     *
     * @param {string} fieldId - Field identifier
     * @returns {Object|null} Field config or null
     *
     * @private
     */
    _getFieldConfig(fieldId) {
      const state = this._stateManager.getState();
      if (!state.layer || !state.layer.fields) return null;

      // Extract field name from ID
      const fieldName = fieldId
        .replace('poi-field-', '')
        .replace(/-/g, '.');

      return state.layer.fields.find(
        f => f.field === fieldName || f.id === fieldName
      );
    },

    /**
     * Run validation rules on field value
     *
     * Applies type-specific validation rules.
     * Returns error message if validation fails, null if valid.
     *
     * @param {HTMLElement} input - Input element
     * @param {Object} fieldConfig - Field configuration
     * @returns {string|null} Error message or null if valid
     *
     * @private
     */
    _runValidationRules(input, fieldConfig) {
      const value = input.value ? input.value.trim() : '';
      const isRequired = fieldConfig.required !== false;

      // Check required
      if (isRequired && !value) {
        return `${fieldConfig.label || fieldConfig.field} is required`;
      }

      // Skip other validations if empty and not required
      if (!value) return null;

      // Type-specific validation
      switch (fieldConfig.type) {
        case 'email':
          if (!this._isValidEmail(value)) {
            return 'Invalid email format';
          }
          break;

        case 'url':
          if (!this._isValidUrl(value)) {
            return 'Invalid URL format';
          }
          break;

        case 'number':
          if (!this._isValidNumber(value)) {
            return 'Must be a valid number';
          }
          if (fieldConfig.min !== undefined && Number(value) < fieldConfig.min) {
            return `Minimum value: ${fieldConfig.min}`;
          }
          if (fieldConfig.max !== undefined && Number(value) > fieldConfig.max) {
            return `Maximum value: ${fieldConfig.max}`;
          }
          break;

        case 'text':
        case 'badge':
          if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
            return `Maximum ${fieldConfig.maxLength} characters`;
          }
          break;

        case 'longtext':
          if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
            return `Maximum ${fieldConfig.maxLength} characters`;
          }
          break;
      }

      return null; // Valid
    },

    /**
     * Check if email is valid
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     * @private
     */
    _isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Check if URL is valid
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     * @private
     */
    _isValidUrl(url) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Check if value is valid number
     * @param {string} value - Value to check
     * @returns {boolean} True if valid number
     * @private
     */
    _isValidNumber(value) {
      return !isNaN(value) && value !== '';
    },

    /**
     * Set error message for field
     *
     * Stores error in _fieldErrors and displays to user.
     *
     * @param {string} fieldId - Field identifier
     * @param {string|null} error - Error message or null
     *
     * @private
     */
    _setFieldError(fieldId, error) {
      this._fieldErrors[fieldId] = error;

      // Find input element
      const input = document.getElementById(fieldId);
      if (!input) return;

      // Find or create error message element
      let errorEl = input.parentElement?.querySelector('.gl-poi-error-message');
      if (!errorEl && error) {
        errorEl = document.createElement('div');
        errorEl.className = 'gl-poi-error-message';
        input.parentElement?.appendChild(errorEl);
      }

      // Update or remove error message
      if (errorEl) {
        if (error) {
          errorEl.textContent = error;
          errorEl.style.display = 'block';
        } else {
          errorEl.style.display = 'none';
        }
      }

      window.GeoLeaf.Log?.debug(`[RealtimeValidator] ${fieldId}: ${error || 'valid'}`);
    },

    /**
     * Update visual field indicator
     *
     * Adds/removes CSS classes to show valid/invalid state.
     *
     * @param {HTMLElement} input - Input element
     * @param {boolean} isValid - Validation state
     *
     * @private
     */
    _updateFieldIndicator(input, isValid) {
      if (isValid) {
        input.classList.remove('gl-poi-field-invalid');
        input.classList.add('gl-poi-field-valid');
      } else {
        input.classList.remove('gl-poi-field-valid');
        input.classList.add('gl-poi-field-invalid');
      }
    },

    /**
     * Update overall form validity
     *
     * Checks all fields and updates StateManager.isValid().
     * Called after each field validation.
     *
     * @private
     */
    _updateFormValidity() {
      // Form is valid if no errors
      const hasErrors = Object.values(this._fieldErrors).some(e => e !== null);
      const isValid = !hasErrors;

      this._stateManager.setValid(isValid);

      // Enable/disable submit button based on validity
      const submitBtn = document.querySelector('[type="submit"], [class*="submit"]');
      if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.5';
      }
    },

    /**
     * Get all current field errors
     *
     * @returns {Object} Field ID -> error message mapping
     *
     * @public
     */
    getErrors() {
      return { ...this._fieldErrors };
    },

    /**
     * Check if form is valid
     *
     * @returns {boolean} True if no field errors
     *
     * @public
     */
    isFormValid() {
      return Object.values(this._fieldErrors).every(e => e === null);
    },

    /**
     * Clear all validation state
     *
     * Resets errors and visual indicators.
     * Called when form is closed or reset.
     *
     * @public
     */
    clear() {
      this._fieldErrors = {};

      // Clear all error messages
      const errorEls = document.querySelectorAll('.gl-poi-error-message');
      for (const el of errorEls) {
        el.remove();
      }

      // Remove all valid/invalid indicators
      const inputs = document.querySelectorAll('.gl-poi-field-valid, .gl-poi-field-invalid');
      for (const input of inputs) {
        input.classList.remove('gl-poi-field-valid', 'gl-poi-field-invalid');
      }

      window.GeoLeaf.Log?.debug('[RealtimeValidator] Cleared');
    },
  };

  // Export to namespace
  window.GeoLeaf.POI.AddForm.RealtimeValidator = RealtimeValidator;

  window.GeoLeaf.Log?.debug('[RealtimeValidator] Module loaded');
})(window);
