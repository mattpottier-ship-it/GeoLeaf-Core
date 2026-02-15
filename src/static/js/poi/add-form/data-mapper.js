/**
 * @file data-mapper.js
 * @description Data mapping between POI objects and form fields
 * Handles population and collection of form data
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
   * FormDataMapper
   * Maps data between POI objects and form UI
   * Extracted from poi/add-form.js (Phase 4)
   */
  const FormDataMapper = {
    /**
     * Populate form fields with existing POI data
     * @param {Object} poi - POI object to populate from
     */
    populateForm(poi) {
      if (!poi) return;

      // Basic fields
      this.populateCoordinates(poi);
      this.populateTitle(poi);
      this.populateDescription(poi);
      this.populateCategory(poi);

      // Dynamic attributes
      if (poi.attributes) {
        this.populateDynamicFields(poi.attributes);
      }
    },

    /**
     * Populate coordinates inputs
     * @param {Object} poi - POI with latlng property
     */
    populateCoordinates(poi) {
      const latInput = document.getElementById('poi-lat');
      const lngInput = document.getElementById('poi-lng');

      if (latInput && lngInput && poi.latlng) {
        latInput.value = poi.latlng.lat.toFixed(6);
        lngInput.value = poi.latlng.lng.toFixed(6);
      }
    },

    /**
     * Populate title input
     * @param {Object} poi - POI with title property
     */
    populateTitle(poi) {
      const titleInput = document.getElementById('poi-title');
      if (titleInput && poi.title) {
        titleInput.value = poi.title;
      }
    },

    /**
     * Populate description input
     * @param {Object} poi - POI with description property
     */
    populateDescription(poi) {
      const descInput = document.getElementById('poi-description');
      if (descInput && poi.description) {
        descInput.value = poi.description;
      }
    },

    /**
     * Populate category/subcategory selects
     * @param {Object} poi - POI with attributes.categoryId and attributes.subCategoryId
     */
    populateCategory(poi) {
      const catInput = document.getElementById('poi-category');

      if (!catInput || !poi.attributes || !poi.attributes.categoryId) {
        return;
      }

      catInput.value = poi.attributes.categoryId;

      // Trigger change to populate subcategories
      const event = new Event('change');
      catInput.dispatchEvent(event);

      // Set subcategory after delay (subcategories need to populate first)
      setTimeout(() => {
        const subcatInput = document.getElementById('poi-subcategory');
        if (subcatInput && poi.attributes.subCategoryId) {
          subcatInput.value = poi.attributes.subCategoryId;
        }
      }, 100);
    },

    /**
     * Populate dynamic fields from attributes
     * @param {Object} attributes - POI attributes object
     */
    populateDynamicFields(attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        const fieldId = `poi-field-attributes-${key}`;
        const element = document.getElementById(fieldId);

        if (element) {
          // Handle table fields
          if (element.classList.contains('gl-poi-table-editor')) {
            this.populateTableData(element, value);
          }
          // Handle list fields
          else if (element.classList.contains('gl-poi-list-editor')) {
            this.populateListData(element, value);
          }
          // Handle tags selector
          else if (element.classList.contains('gl-poi-tags-selector')) {
            this.populateTagsData(element, value);
          }
          // Handle regular input fields
          else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (Array.isArray(value)) {
              element.value = value.join(', ');
            } else if (typeof value === 'object') {
              element.value = JSON.stringify(value);
            } else {
              element.value = value;
            }
          }
        }
      });
    },

    /**
     * Populate table widget with data
     * @param {HTMLElement} tableContainer - Table container element
     * @param {Array} data - Array of row objects
     */
    populateTableData(tableContainer, data) {
      if (!Array.isArray(data) || data.length === 0) return;

      const table = tableContainer.querySelector('table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      const columns = JSON.parse(tableContainer.dataset.columns || '[]');

      // Clear existing rows
      GeoLeaf.DOMSecurity.clearElementFast(tbody);

      // Add rows with data
      data.forEach(rowData => {
        const tr = this._createTableRow(columns);

        // Populate cells
        columns.forEach(col => {
          const input = tr.querySelector(`input[data-key="${col.key}"]`);
          if (input && rowData[col.key]) {
            input.value = rowData[col.key];
          }
        });

        tbody.appendChild(tr);
      });

      // Add at least one empty row if needed
      if (tbody.children.length === 0) {
        tbody.appendChild(this._createTableRow(columns));
      }
    },

    /**
     * Populate list widget with data
     * @param {HTMLElement} listContainer - List container element
     * @param {Array} data - Array of string values
     */
    populateListData(listContainer, data) {
      if (!Array.isArray(data) || data.length === 0) return;

      const list = listContainer.querySelector('ul');
      if (!list) return;

      // Clear existing items
      GeoLeaf.DOMSecurity.clearElementFast(list);

      // Add items with data
      data.forEach(item => {
        const li = this._createListItem();
        const input = li.querySelector('input');
        input.value = item;
        list.appendChild(li);
      });

      // Add at least one empty item if needed
      if (list.children.length === 0) {
        list.appendChild(this._createListItem());
      }
    },

    /**
     * Populate tags selector with data
     * @param {HTMLElement} tagsContainer - Tags container element
     * @param {Array} data - Array of selected tag values
     */
    populateTagsData(tagsContainer, data) {
      if (!Array.isArray(data) || data.length === 0) return;

      const badges = tagsContainer.querySelectorAll('.gl-poi-tag-badge');

      badges.forEach(badge => {
        const tagValue = badge.dataset.tagValue || badge.textContent.trim();
        if (data.includes(tagValue)) {
          badge.classList.add('is-selected');
        }
      });
    },

    /**
     * Collect all form data into POI object
     * CORRIGÉ V3: Structure de données cohérente avec POI existants
     * @param {string} mode - 'add' or 'edit'
     * @param {Object} currentPoi - Current POI (for edit mode)
     * @param {Object} currentLayer - Current layer config
     * @returns {Promise<Object>} POI data object
     */
    async collectFormData(mode, currentPoi, currentLayer) {
      // Get selected layer ID from layer selector
      const layerSelect = document.getElementById('poi-layer');
      const selectedLayerId = layerSelect ? layerSelect.value : null;

      // If no layer selected from form, try to get from currentLayer parameter
      const layerId = selectedLayerId || (currentLayer && currentLayer.id);

      window.GeoLeaf.Log?.info('[DataMapper] Collecting form data:');
      window.GeoLeaf.Log?.info('[DataMapper] - selectedLayerId:', selectedLayerId);
      window.GeoLeaf.Log?.info('[DataMapper] - currentLayer.id:', currentLayer && currentLayer.id);
      window.GeoLeaf.Log?.info('[DataMapper] - final layerId:', layerId);

      // ✅ CORRECTION V3: Créer une structure de données identique aux POI existants
      const data = {
        // Champs obligatoires compatibles avec POI existants
        id: mode === 'edit' && currentPoi ? currentPoi.id : `user-poi-${Date.now()}`,
        latlng: [
          parseFloat(document.getElementById('poi-lat').value),
          parseFloat(document.getElementById('poi-lng').value),
        ],
        title: document.getElementById('poi-title').value.trim(),
        description: document.getElementById('poi-description')?.value.trim() || '',
        attributes: {},

        // Métadonnées pour le système
        layerId: layerId,
        _layerConfig: currentLayer || null,

        // Horodatage pour traçabilité
        createdAt: mode === 'add' ? Date.now() : (currentPoi?.createdAt || Date.now()),
        updatedAt: Date.now(),
        userGenerated: true // Flag pour identifier les POI créés par l'utilisateur
      };

      // ✅ CORRECTION V3: Attacher toutes les configurations nécessaires depuis la couche
      if (currentLayer) {
        // Configurations spécialisées pour les différents modules
        if (currentLayer.popup) {
          data._popupConfig = currentLayer.popup;
        }
        if (currentLayer.sidepanel) {
          data._sidepanelConfig = currentLayer.sidepanel;
        }
        if (currentLayer.tooltip) {
          data._tooltipConfig = currentLayer.tooltip;
        }

        window.GeoLeaf.Log?.info('[DataMapper] ✅ Layer configurations attached:');
        window.GeoLeaf.Log?.info('[DataMapper] - Popup config:', !!data._popupConfig);
        window.GeoLeaf.Log?.info('[DataMapper] - Sidepanel config:', !!data._sidepanelConfig);
        window.GeoLeaf.Log?.info('[DataMapper] - Tooltip config:', !!data._tooltipConfig);
        window.GeoLeaf.Log?.info('[DataMapper] - Sidepanel detailLayout items:', currentLayer.sidepanel?.detailLayout?.length || 0);
      }

      // Category (obligatoire pour beaucoup de couches)
      const catInput = document.getElementById('poi-category');
      if (catInput && catInput.value) {
        data.attributes.categoryId = catInput.value;
      }

      // Subcategory
      const subcatInput = document.getElementById('poi-subcategory');
      if (subcatInput && subcatInput.value) {
        data.attributes.subCategoryId = subcatInput.value;
      }

      // Collect dynamic fields
      this.collectDynamicFields(data);

      // Handle images
      const imageFiles = window.GeoLeaf.POI.AddForm.StateManager.getImageFiles();
      await this.collectImages(data, imageFiles);

      window.GeoLeaf.Log?.info('[DataMapper] ✅ Final POI data structure:');
      window.GeoLeaf.Log?.info('[DataMapper] - ID:', data.id);
      window.GeoLeaf.Log?.info('[DataMapper] - Title:', data.title);
      window.GeoLeaf.Log?.info('[DataMapper] - Layer ID:', data.layerId);
      window.GeoLeaf.Log?.info('[DataMapper] - Has _layerConfig:', !!data._layerConfig);
      window.GeoLeaf.Log?.info('[DataMapper] - Attributes keys:', Object.keys(data.attributes));
      window.GeoLeaf.Log?.info('[DataMapper] - User generated:', data.userGenerated);

      return data;
    },

    /**
     * Collect dynamic fields from form
     * @param {Object} data - POI data object to populate
     */
    collectDynamicFields(data) {
      const modal = window.GeoLeaf.POI.AddForm.StateManager.getModal();
      if (!modal) return;

      const inputs = modal.querySelectorAll('[data-field]');
      inputs.forEach(input => {
        const field = input.dataset.field;
        let value = input.value;

        // Handle table fields
        if (input.classList.contains('gl-poi-table-editor')) {
          value = this.collectTableData(input);
        }
        // Handle list fields
        else if (input.classList.contains('gl-poi-list-editor')) {
          value = this.collectListData(input);
        }
        // Handle tags selector
        else if (input.classList.contains('gl-poi-tags-selector')) {
          value = this.collectTagsData(input);
        }
        // Parse arrays (comma-separated) - only for old-style inputs
        else if (value && (field.includes('tags') || field.includes('list'))) {
          value = value.split(',').map(v => v.trim()).filter(v => v);
        }

        // Skip empty values
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return;
        }

        // Set nested fields
        const parts = field.split('.');
        let target = data;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
      });
    },

    /**
     * Collect table widget data
     * @param {HTMLElement} tableContainer - Table container element
     * @returns {Array} Array of row objects
     */
    collectTableData(tableContainer) {
      const table = tableContainer.querySelector('table');
      if (!table) return [];

      const columns = JSON.parse(tableContainer.dataset.columns || '[]');
      const rows = table.querySelectorAll('tbody tr');
      const data = [];

      rows.forEach(row => {
        const rowData = {};
        let hasData = false;

        columns.forEach(col => {
          const input = row.querySelector(`input[data-key="${col.key}"]`);
          if (input && input.value.trim()) {
            rowData[col.key] = input.value.trim();
            hasData = true;
          }
        });

        // Only add row if it has at least one value
        if (hasData) {
          data.push(rowData);
        }
      });

      return data;
    },

    /**
     * Collect list widget data
     * @param {HTMLElement} listContainer - List container element
     * @returns {Array} Array of string values
     */
    collectListData(listContainer) {
      const items = listContainer.querySelectorAll('.gl-poi-list-input');
      const data = [];

      items.forEach(input => {
        if (input.value.trim()) {
          data.push(input.value.trim());
        }
      });

      return data;
    },

    /**
     * Collect tags selector data
     * @param {HTMLElement} tagsContainer - Tags container element
     * @returns {Array} Array of selected tag values
     */
    collectTagsData(tagsContainer) {
      const selectedBadges = tagsContainer.querySelectorAll('.gl-poi-tag-badge.is-selected');
      const data = [];

      selectedBadges.forEach(badge => {
        const tagValue = badge.dataset.tagValue || badge.textContent.trim();
        if (tagValue) {
          data.push(tagValue);
        }
      });

      return data;
    },

    /**
     * Collect and process image files
     * @param {Object} data - POI data object to populate
     * @param {Array} imageFiles - Array of {file: File, type: string}
     */
    async collectImages(data, imageFiles) {
      window.GeoLeaf.Log?.debug('Processing images:', imageFiles.length, 'files');

      if (imageFiles.length === 0 || !window.GeoLeaf.POI.ImageUpload) {
        return;
      }

      const mainImage = imageFiles.find(img => img.type === 'main');
      const galleryImages = imageFiles.filter(img => img.type === 'gallery');

      // Process main image
      if (mainImage) {
        window.GeoLeaf.Log?.debug('Processing main image:', mainImage.file.name, mainImage.file.size, 'bytes');
        const result = await window.GeoLeaf.POI.ImageUpload.processAndUpload(mainImage.file);
        window.GeoLeaf.Log?.debug('Main image upload result:', result.success, result.offline, result.local);

        if (result.success) {
          data.attributes.photo = result.url;
          window.GeoLeaf.Log?.debug('Main image URL length:', result.url.length, 'chars');
        } else {
          window.GeoLeaf.Log?.error('Main image upload failed:', result.error);
        }
      }

      // Process gallery images
      if (galleryImages.length > 0) {
        window.GeoLeaf.Log?.debug('Processing gallery:', galleryImages.length, 'images');
        const galleryUrls = [];

        for (const imgData of galleryImages) {
          window.GeoLeaf.Log?.debug('Processing gallery image:', imgData.file.name, '- Size:', imgData.file.size, 'bytes');
          try {
            const result = await window.GeoLeaf.POI.ImageUpload.processAndUpload(imgData.file);
            window.GeoLeaf.Log?.debug('Gallery image result:', result.success, result.error || '');

            if (result.success) {
              window.GeoLeaf.Log?.debug('Gallery image URL length:', result.url.length, 'chars');
              galleryUrls.push(result.url);
            } else {
              window.GeoLeaf.Log?.error('Gallery image failed:', imgData.file.name, '- Error:', result.error);
            }
          } catch (err) {
            window.GeoLeaf.Log?.error('Gallery image exception:', imgData.file.name, '- Exception:', err.message);
          }
        }

        if (galleryUrls.length > 0) {
          data.attributes.gallery = galleryUrls;
          window.GeoLeaf.Log?.debug('Gallery added with', galleryUrls.length, 'images');
        } else {
          window.GeoLeaf.Log?.warn('No gallery images were successfully processed');
        }
      }
    },

    /**
     * Helper: Create table row (delegates to renderer)
     * @private
     */
    _createTableRow(columns) {
      if (window.GeoLeaf.POI.AddForm.Renderer && window.GeoLeaf.POI.AddForm.Renderer.createTableRow) {
        return window.GeoLeaf.POI.AddForm.Renderer.createTableRow(columns);
      }
      throw new Error('Renderer.createTableRow not available');
    },

    /**
     * Helper: Create list item (delegates to renderer)
     * @private
     */
    _createListItem() {
      if (window.GeoLeaf.POI.AddForm.Renderer && window.GeoLeaf.POI.AddForm.Renderer.createListItem) {
        return window.GeoLeaf.POI.AddForm.Renderer.createListItem();
      }
      throw new Error('Renderer.createListItem not available');
    },
  };

  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  // Export to namespace
  window.GeoLeaf.POI.AddForm.DataMapper = FormDataMapper;

  window.GeoLeaf.Log?.debug('FormDataMapper module loaded');
})(window);
