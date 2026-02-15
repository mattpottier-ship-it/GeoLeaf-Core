/**
 * @file validator.js
 * @description Form validation logic for POI Add/Edit Form
 * Validates coordinates, layer selection, required fields
 * @version 2.0.0
 * @phase Phase 4 - Large File Refactoring
 */

(function (global) {
  'use strict';

  // Initialize namespace
  window.GeoLeaf = window.GeoLeaf || {};
  window.GeoLeaf.POI = window.GeoLeaf.POI || {};
  window.GeoLeaf.POI.AddForm = window.GeoLeaf.POI.AddForm || {};

  /**
   * FormValidator
   * Validates form inputs and data constraints
   * Extracted from poi/add-form.js (Phase 4)
   */
  const FormValidator = {
    /**
     * Validation rules configuration
     */
    rules: {
      coordinates: {
        latMin: -90,
        latMax: 90,
        lngMin: -180,
        lngMax: 180,
      },
      title: {
        minLength: 1,
        maxLength: 200,
      },
      description: {
        maxLength: 2000,
      },
    },

    /**
     * Validate complete form data
     * @param {Object} [options] - Validation options
     * @param {boolean} [options.strict=false] - Enable strict validation
     * @returns {Object} Validation result { valid: boolean, error?: string, errors?: Array }
     */
    validateForm(options = {}) {
      const errors = [];
      const { strict = false } = options;

      // 1. Validate layer selection
      const layerValidation = this.validateLayerSelection();
      if (!layerValidation.valid) {
        errors.push(layerValidation.error);
      }

      // 2. Validate coordinates
      const coordsValidation = this.validateCoordinates();
      if (!coordsValidation.valid) {
        errors.push(coordsValidation.error);
      }

      // 3. Validate title (required)
      const titleValidation = this.validateTitle();
      if (!titleValidation.valid) {
        errors.push(titleValidation.error);
      }

      // 4. Optional: Validate description length
      if (strict) {
        const descValidation = this.validateDescription();
        if (!descValidation.valid) {
          errors.push(descValidation.error);
        }
      }

      // Return result
      if (errors.length === 0) {
        return { valid: true };
      }

      return {
        valid: false,
        error: errors[0], // Main error (backward compatibility)
        errors, // All errors
      };
    },

    /**
     * Validate layer selection
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateLayerSelection() {
      const layerSelect = document.getElementById('poi-layer-select');

      if (!layerSelect) {
        return {
          valid: false,
          error: 'Sélecteur de couche introuvable',
        };
      }

      if (!layerSelect.value || layerSelect.value === '') {
        return {
          valid: false,
          error: 'Veuillez sélectionner une couche',
        };
      }

      return { valid: true };
    },

    /**
     * Validate coordinates fields
     * @returns {Object} { valid: boolean, error?: string, lat?: number, lng?: number }
     */
    validateCoordinates() {
      const latInput = document.getElementById('poi-lat');
      const lngInput = document.getElementById('poi-lng');

      // Check existence
      if (!latInput || !lngInput) {
        return {
          valid: false,
          error: 'Champs de coordonnées introuvables',
        };
      }

      // Check values present
      if (!latInput.value || !lngInput.value) {
        return {
          valid: false,
          error: 'Coordonnées invalides',
        };
      }

      // Parse numbers
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);

      // Check valid numbers
      if (isNaN(lat) || isNaN(lng)) {
        return {
          valid: false,
          error: 'Coordonnées doivent être des nombres',
        };
      }

      // Check ranges
      const { latMin, latMax, lngMin, lngMax } = this.rules.coordinates;

      if (lat < latMin || lat > latMax) {
        return {
          valid: false,
          error: `Latitude hors limites (${latMin} à ${latMax})`,
        };
      }

      if (lng < lngMin || lng > lngMax) {
        return {
          valid: false,
          error: `Longitude hors limites (${lngMin} à ${lngMax})`,
        };
      }

      return {
        valid: true,
        lat,
        lng,
      };
    },

    /**
     * Validate title field (required)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateTitle() {
      const titleInput = document.getElementById('poi-title');

      if (!titleInput) {
        return {
          valid: false,
          error: 'Champ titre introuvable',
        };
      }

      const title = titleInput.value.trim();
      const { minLength, maxLength } = this.rules.title;

      if (title.length < minLength) {
        return {
          valid: false,
          error: 'Le titre est obligatoire',
        };
      }

      if (title.length > maxLength) {
        return {
          valid: false,
          error: `Le titre est trop long (max ${maxLength} caractères)`,
        };
      }

      return { valid: true };
    },

    /**
     * Validate description field (optional)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateDescription() {
      const descInput = document.getElementById('poi-description');

      if (!descInput) {
        return { valid: true }; // Optional field
      }

      const description = descInput.value.trim();
      const { maxLength } = this.rules.description;

      if (description.length > maxLength) {
        return {
          valid: false,
          error: `La description est trop longue (max ${maxLength} caractères)`,
        };
      }

      return { valid: true };
    },

    /**
     * Validate category selection (if field exists)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateCategory() {
      const catInput = document.getElementById('poi-category');

      if (!catInput) {
        return { valid: true }; // Optional field
      }

      // If category field exists and is required
      if (catInput.hasAttribute('required') && !catInput.value) {
        return {
          valid: false,
          error: 'La catégorie est obligatoire',
        };
      }

      return { valid: true };
    },

    /**
     * Validate a single field by ID
     * @param {string} fieldId - Field DOM ID
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateField(fieldId) {
      switch (fieldId) {
        case 'poi-layer-select':
          return this.validateLayerSelection();
        case 'poi-lat':
        case 'poi-lng':
          return this.validateCoordinates();
        case 'poi-title':
          return this.validateTitle();
        case 'poi-description':
          return this.validateDescription();
        case 'poi-category':
          return this.validateCategory();
        default:
          return { valid: true }; // Unknown field, skip validation
      }
    },

    /**
     * Validate custom field value based on type
     * @param {string} value - Field value
     * @param {Object} fieldConfig - Field configuration from layer
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateCustomField(value, fieldConfig) {
      if (!fieldConfig) {
        return { valid: true };
      }

      const { type, required, label } = fieldConfig;

      // Check required
      if (required && (!value || value.trim() === '')) {
        return {
          valid: false,
          error: `Le champ "${label || 'sans nom'}" est obligatoire`,
        };
      }

      // Type-specific validation
      switch (type) {
        case 'number':
          if (value && isNaN(parseFloat(value))) {
            return {
              valid: false,
              error: `"${label}" doit être un nombre`,
            };
          }
          break;

        case 'email':
          if (value && !this._isValidEmail(value)) {
            return {
              valid: false,
              error: `"${label}" doit être un email valide`,
            };
          }
          break;

        case 'url':
          if (value && !this._isValidUrl(value)) {
            return {
              valid: false,
              error: `"${label}" doit être une URL valide`,
            };
          }
          break;

        case 'date':
          if (value && !this._isValidDate(value)) {
            return {
              valid: false,
              error: `"${label}" doit être une date valide`,
            };
          }
          break;
      }

      return { valid: true };
    },

    /**
     * Helper: Validate email format
     * @private
     */
    _isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Helper: Validate URL format
     * @private
     */
    _isValidUrl(url) {
      // Déléguer à l'implémentation centralisée
      if (window.GeoLeaf.Validators && typeof window.GeoLeaf.Validators.validateUrl === 'function') {
        const result = window.GeoLeaf.Validators.validateUrl(url);
        return result.valid;
      }
      // Fallback simple
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Helper: Validate date format
     * @private
     */
    _isValidDate(dateString) {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    },

    /**
     * Show validation error in UI
     * @param {string} error - Error message
     */
    showError(error) {
      if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
        window.GeoLeaf.UI.notify.error(error);
      } else {
        alert(error);
      }
    },

    /**
     * Clear validation error display
     */
    clearErrors() {
      // Could implement visual error clearing here
      window.GeoLeaf.Log?.debug('Validation errors cleared');
    },

    /**
     * Update validation rules
     * @param {Object} newRules - New rules to merge
     */
    updateRules(newRules) {
      Object.assign(this.rules, newRules);
    },
  };

  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  // Export to namespace
  window.GeoLeaf.POI.AddForm.Validator = FormValidator;

  window.GeoLeaf.Log?.debug('FormValidator module loaded');
})(window);
