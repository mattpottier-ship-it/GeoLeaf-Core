/**
 * @file fields-manager.js
 * @description Dynamic form fields management for POI Add/Edit Form
 * Handles layer selection, category/subcategory, custom fields, geolocation
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
   * FormFieldsManager
   * Manages dynamic fields, layer logic, and categories
   * Extracted from poi/add-form.js (Phase 4)
   */
  const FormFieldsManager = {
    /**
     * Get list of layers with edition permissions
     * Filters layers by geometryType=point and enableEdition flags
     * @param {string} mode - 'add' or 'edit'
     * @returns {Array} Filtered layer configs
     */
    getEditableLayers(mode) {
      const profile = window.GeoLeaf.Config ? window.GeoLeaf.Config.getActiveProfile() : null;
      if (!profile || !profile.layers) return [];

      return profile.layers.filter(layer => {
        // Must be point geometry
        if (layer.geometryType !== 'point') return false;

        // Check permissions
        if (mode === 'add') {
          return layer.enableEdition === true;
        } else if (mode === 'edit') {
          return layer.enableEditionFull === true || layer.enableEdition === true;
        }

        return false;
      });
    },

    /**
     * Get layer configuration by ID
     * @param {string} layerId - Layer ID
     * @returns {Object|null} Layer config or null
     */
    getLayerConfig(layerId) {
      const profile = window.GeoLeaf.Config ? window.GeoLeaf.Config.getActiveProfile() : null;
      if (!profile || !profile.layers) return null;

      return profile.layers.find(l => l.id === layerId) || null;
    },

    /**
     * Update subcategories dropdown based on selected category
     * Modifies UI directly by showing/hiding subcategory group
     * @param {Object} taxonomy - Taxonomy configuration
     */
    updateSubcategories(taxonomy) {
      const catSelect = document.getElementById('poi-category');
      const subcatGroup = document.getElementById('poi-subcategory-group');
      const subcatSelect = document.getElementById('poi-subcategory');

      if (!catSelect || !subcatGroup || !subcatSelect) return;

      const selectedCat = catSelect.value;

      if (!selectedCat) {
        subcatGroup.style.display = 'none';
        return;
      }

      const category = taxonomy.categories[selectedCat];
      if (!category || !category.subcategories) {
        subcatGroup.style.display = 'none';
        return;
      }

      // Clear and populate subcategories
      GeoLeaf.DOMSecurity.clearElementFast(subcatSelect);

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Sélectionnez --';
      subcatSelect.appendChild(defaultOption);

      Object.entries(category.subcategories).forEach(([key, subcat]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = subcat.label || key;
        subcatSelect.appendChild(option);
      });

      subcatGroup.style.display = 'block';
    },

    /**
     * Get all unique tags from layer's POIs
     * Searches through POI and GeoJSON data stores
     * @param {string} layerId - Layer ID
     * @returns {Array<string>} Sorted array of unique tags
     */
    getLayerTags(layerId) {
      const tagSet = new Set();

      // Try POI module data first
      if (window.GeoLeaf._POIShared && window.GeoLeaf._POIShared.state && window.GeoLeaf._POIShared.state.allPois) {
        const allPois = window.GeoLeaf._POIShared.state.allPois;
        const layerPois = allPois.filter(poi => {
          // Check both layerId and _layerConfig.id
          return poi.layerId === layerId || poi._layerConfig?.id === layerId;
        });

        layerPois.forEach(poi => {
          const tags = poi.attributes?.tags || poi.tags;
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              if (tag && typeof tag === 'string') {
                tagSet.add(tag.trim());
              }
            });
          }
        });
      }

      // Try GeoJSON feature cache
      if (window.GeoLeaf._GeoJSONShared && window.GeoLeaf._GeoJSONShared.state && window.GeoLeaf._GeoJSONShared.state.featureCache) {
        const cache = window.GeoLeaf._GeoJSONShared.state.featureCache.get(layerId);
        if (cache && Array.isArray(cache.features)) {
          cache.features.forEach(feature => {
            // Check properties.attributes.tags or properties.tags
            const props = feature.properties || {};
            const attrs = props.attributes || {};
            const tags = attrs.tags || props.tags;

            if (Array.isArray(tags)) {
              tags.forEach(tag => {
                if (tag && typeof tag === 'string') {
                  tagSet.add(tag.trim());
                }
              });
            }
          });
        }
      }

      // Convert to sorted array
      const tagsArray = Array.from(tagSet);
      tagsArray.sort();
      return tagsArray;
    },

    /**
     * Use geolocation to populate coordinates fields
     * Calls PlacementMode.useGeolocation and updates inputs
     * @param {Function} [onSuccess] - Success callback
     * @param {Function} [onError] - Error callback
     */
    useGeolocation(onSuccess, onError) {
      if (!window.GeoLeaf.POI.PlacementMode) {
        window.GeoLeaf.Log?.error('PlacementMode not available');
        if (typeof onError === 'function') {
          onError(new Error('PlacementMode indisponible'));
        }
        return;
      }

      window.GeoLeaf.POI.PlacementMode.useGeolocation(
        (result) => {
          const latInput = document.getElementById('poi-lat');
          const lngInput = document.getElementById('poi-lng');

          if (latInput && lngInput) {
            latInput.value = result.latlng.lat.toFixed(6);
            lngInput.value = result.latlng.lng.toFixed(6);
            window.GeoLeaf.Log?.info('Géolocalisation appliquée:', result.latlng);
          }

          if (typeof onSuccess === 'function') {
            onSuccess(result);
          }
        },
        (error) => {
          window.GeoLeaf.Log?.error('Erreur de géolocalisation:', error);
          if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
            window.GeoLeaf.UI.notify.error('Impossible d\'obtenir votre position: ' + error.message);
          }

          if (typeof onError === 'function') {
            onError(error);
          }
        }
      );
    },

    /**
     * Filter fields to include in form
     * Excludes basic fields already handled separately
     * @param {Array} detailLayout - SidepanelConfig detail layout
     * @returns {Array} Filtered field configs
     */
    filterFormFields(detailLayout) {
      if (!Array.isArray(detailLayout)) return [];

      return detailLayout.filter(field => {
        if (!field.field) return false;

        // Exclude basic fields handled separately
        const excludedFields = [
          'title',
          'description',
          'latlng',
          'category',
          'subcategory',
          'attributes.categoryId',
          'attributes.subCategoryId',
          'attributes.photo',
          'attributes.mainImage',
          'attributes.gallery',
        ];

        if (excludedFields.includes(field.field)) return false;

        // Exclude certain types
        const excludedTypes = ['coordinates', 'image'];
        if (excludedTypes.includes(field.type)) return false;

        return true;
      });
    },

    /**
     * Get field type for rendering
     * Maps field config to input type
     * @param {Object} fieldConfig - Field configuration
     * @returns {string} Field type ('text' | 'longtext' | 'list' | 'tags' | 'table')
     */
    getFieldType(fieldConfig) {
      if (!fieldConfig || !fieldConfig.type) return 'text';

      // Map types
      const typeMap = {
        text: 'text',
        badge: 'text',
        longtext: 'longtext',
        list: 'list',
        tags: 'tags',
        table: 'table',
        link: 'text',
        html: 'longtext',
      };

      return typeMap[fieldConfig.type] || 'text';
    },

    /**
     * Get taxonomy configuration from profile
     * @returns {Object|null} Taxonomy config
     */
    getTaxonomy() {
      const profile = window.GeoLeaf.Config ? window.GeoLeaf.Config.getActiveProfile() : null;
      if (!profile || !profile.taxonomy) return null;
      return profile.taxonomy;
    },

    /**
     * Check if taxonomy is available
     * @returns {boolean} True if taxonomy exists
     */
    hasTaxonomy() {
      const taxonomy = this.getTaxonomy();
      return taxonomy && taxonomy.categories && Object.keys(taxonomy.categories).length > 0;
    },

    /**
     * Store image files in StateManager
     * @param {FileList} files - Files from input
     * @param {string} type - Image type ('main' or 'gallery')
     */
    storeImageFiles(files, type) {
      console.log('[FieldsManager.storeImageFiles] Storing', files.length, 'file(s) as type:', type);

      if (!window.GeoLeaf.POI.AddForm.StateManager) {
        console.error('[FieldsManager.storeImageFiles] StateManager not available');
        return;
      }

      Array.from(files).forEach(file => {
        console.log('[FieldsManager.storeImageFiles] Adding file:', file.name, 'Size:', file.size, 'Type:', file.type);
        // Store as object with file and type properties (expected by DataMapper)
        window.GeoLeaf.POI.AddForm.StateManager.addImageFile({ file, type });
      });

      const currentFiles = window.GeoLeaf.POI.AddForm.StateManager.getImageFiles();
      console.log('[FieldsManager.storeImageFiles] Total files in state:', currentFiles.length);
    },
  };

  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  // Export to namespace
  window.GeoLeaf.POI.AddForm.FieldsManager = FormFieldsManager;

  window.GeoLeaf.Log?.debug('FormFieldsManager module loaded');
})(window);
