/**
 * @fileoverview POI Add Form - Sections Renderer Module
 * @description Renders form sections: layer selector, coordinates, basic fields, categories
 * @author GeoLeaf Team
 * @version 3.0.0
 */

(function () {
  'use strict';

  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};
  if (!window.GeoLeaf.POI.AddForm.Renderers) window.GeoLeaf.POI.AddForm.Renderers = {};

  const Log = window.GeoLeaf.Log || console;

  /**
   * Sections Renderer
   * Handles rendering of form sections (layer selector, coordinates, basic fields, categories)
   */
  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};
  if (!window.GeoLeaf.POI.AddForm.Renderers) window.GeoLeaf.POI.AddForm.Renderers = {};

  window.GeoLeaf.POI.AddForm.Renderers.Sections = {

    /**
     * Populate layer selector dropdown
     * @param {Object} context - Form context
     * @param {Function} onLayerSelect - Callback when layer is selected
     * @param {Array} editableLayers - Array of editable layers
     */
    populateLayerSelector(context, onLayerSelect, editableLayers = []) {
      console.log('[Renderers.Sections.populateLayerSelector] Called with:', { context, editableLayers });

      const body = document.getElementById('gl-poi-modal-body');
      if (!body) {
        console.error('[Renderers.Sections.populateLayerSelector] Modal body not found!');
        return;
      }

      // Layer selection section
      const layerSection = document.createElement('div');
      layerSection.className = 'gl-poi-form-section';
      layerSection.id = 'poi-layer-section';

      const layerLabel = document.createElement('label');
      layerLabel.htmlFor = 'poi-layer-select';
      layerLabel.className = 'gl-poi-form-label required';
      layerLabel.textContent = 'Couche de destination';
      layerSection.appendChild(layerLabel);

      const layerSelect = document.createElement('select');
      layerSelect.id = 'poi-layer-select';
      layerSelect.className = 'gl-poi-form-input';
      layerSelect.required = true;

      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Sélectionnez une couche --';
      layerSelect.appendChild(defaultOption);

      // Use provided editable layers
      console.log('[Renderers.Sections.populateLayerSelector] Populating with layers:', editableLayers);
      const layers = editableLayers || [];

      layers.forEach((layer, index) => {
        console.log('[Renderers.Sections.populateLayerSelector] Adding layer option:', layer);
        const option = document.createElement('option');
        option.value = layer.id;
        option.textContent = layer.label;

        // Pre-select if editing
        if (context.mode === 'edit' && context.poi && layer.id === context.poi._layerConfig.id) {
          option.selected = true;
        }
        // Auto-select first layer in add mode
        else if (context.mode === 'add' && index === 0) {
          option.selected = true;
          layerSelect.value = layer.id; // Ensure select value is set
          console.log('[Renderers.Sections.populateLayerSelector] Auto-selected first layer:', layer.id);
        }

        layerSelect.appendChild(option);
      });

      layerSelect.onchange = (e) => {
        if (onLayerSelect) {
          onLayerSelect(e.target.value);
        }
      };

      layerSection.appendChild(layerSelect);

      // Add info message
      if (layers.length === 0) {
        const noLayersMsg = document.createElement('p');
        noLayersMsg.className = 'gl-poi-form-info warning';
        noLayersMsg.textContent = 'Aucune couche disponible pour l\'ajout de POI. Vérifiez la configuration.';
        layerSection.appendChild(noLayersMsg);
      }

      body.appendChild(layerSection);

      // Form container (will be populated when layer is selected)
      const formContainer = document.createElement('div');
      formContainer.id = 'poi-form-container';
      formContainer.className = 'gl-poi-form-container';
      body.appendChild(formContainer);
    },

    /**
     * Clear form container content
     */
    clearFormContainer() {
      const container = document.getElementById('poi-form-container');
      if (container) {
        GeoLeaf.DOMSecurity.clearElementFast(container);
      }
    },

    /**
     * Generate complete dynamic form based on layer configuration
     * @param {Object} layer - Layer configuration object
     * @param {Object} coordinates - Current coordinates {lat, lng}
     * @param {Function} onGeolocation - Geolocation button callback
     */
    generateForm(layer, coordinates, onGeolocation) {
      console.log('[Renderers.Sections.generateForm] Called with:', { layer, coordinates, onGeolocation });
      Log.debug('[Renderers.Sections] Generating form for layer:', layer.id);

      const container = document.getElementById('poi-form-container');
      if (!container) {
        console.error('[Renderers.Sections.generateForm] Container not found!');
        return;
      }

      GeoLeaf.DOMSecurity.clearElementFast(container);

      // Coordinates section (always present)
      console.log('[Renderers.Sections.generateForm] Adding coordinates section with:', coordinates);
      this.addCoordinatesSection(container, coordinates, onGeolocation);

      // Basic fields section
      console.log('[Renderers.Sections.generateForm] Adding basic fields section');
      this.addBasicFieldsSection(container);

      // Category/subcategory section (from taxonomy)
      console.log('[Renderers.Sections.generateForm] Adding category section');
      this.addCategorySection(container, layer);

      // Dynamic fields from sidepanelConfig
      console.log('[Renderers.Sections.generateForm] Layer received:', {
        id: layer?.id,
        name: layer?.name,
        hasSidepanel: !!layer?.sidepanel,
        hasSidepanelConfig: !!layer?.sidepanelConfig,
        hasDetailLayout: !!(layer?.sidepanel?.detailLayout || layer?.sidepanelConfig?.detailLayout),
        sidepanelKeys: layer?.sidepanel ? Object.keys(layer.sidepanel) : [],
        sidepanelConfigKeys: layer?.sidepanelConfig ? Object.keys(layer.sidepanelConfig) : [],
        layerStructure: Object.keys(layer || {})
      });

      // Try both sidepanel and sidepanelConfig for compatibility
      const sidepanelConfig = layer.sidepanel || layer.sidepanelConfig;

      if (sidepanelConfig && sidepanelConfig.detailLayout) {
        console.log('[Renderers.Sections.generateForm] Adding dynamic fields from sidepanel/sidepanelConfig');
        this.addDynamicFields(container, sidepanelConfig.detailLayout, layer);
      } else {
        console.warn('[Renderers.Sections.generateForm] No sidepanel.detailLayout or sidepanelConfig.detailLayout found in layer');
      }

      // Images section
      console.log('[Renderers.Sections.generateForm] Adding images section');
      this.addImagesSection(container);

      console.log('[Renderers.Sections.generateForm] Form generation complete');
    },

    /**
     * Add coordinates section with lat/lng inputs and geolocation button
     * @param {HTMLElement} container - Parent container element
     * @param {Object} coordinates - Current coordinates {lat, lng}
     * @param {Function} onGeolocation - Geolocation button callback
     */
    addCoordinatesSection(container, coordinates, onGeolocation) {
      console.log('[Renderers.Sections.addCoordinatesSection] Coordinates:', coordinates);

      const section = document.createElement('div');
      section.className = 'gl-poi-form-section';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'gl-poi-form-section-title';
      sectionTitle.textContent = 'Localisation';
      section.appendChild(sectionTitle);

      // Latitude
      const latGroup = document.createElement('div');
      latGroup.className = 'gl-poi-form-group';

      const latLabel = document.createElement('label');
      latLabel.htmlFor = 'poi-lat';
      latLabel.className = 'gl-poi-form-label required';
      latLabel.textContent = 'Latitude';
      latGroup.appendChild(latLabel);

      const latInput = document.createElement('input');
      latInput.type = 'number';
      latInput.id = 'poi-lat';
      latInput.className = 'gl-poi-form-input';
      latInput.step = 'any';
      latInput.required = true;
      latInput.value = coordinates ? coordinates.lat.toFixed(6) : '';
      console.log('[Renderers.Sections.addCoordinatesSection] Latitude input value:', latInput.value);
      latGroup.appendChild(latInput);

      section.appendChild(latGroup);

      // Longitude
      const lngGroup = document.createElement('div');
      lngGroup.className = 'gl-poi-form-group';

      const lngLabel = document.createElement('label');
      lngLabel.htmlFor = 'poi-lng';
      lngLabel.className = 'gl-poi-form-label required';
      lngLabel.textContent = 'Longitude';
      lngGroup.appendChild(lngLabel);

      const lngInput = document.createElement('input');
      lngInput.type = 'number';
      lngInput.id = 'poi-lng';
      lngInput.className = 'gl-poi-form-input';
      lngInput.step = 'any';
      lngInput.required = true;
      lngInput.value = coordinates ? coordinates.lng.toFixed(6) : '';
      console.log('[Renderers.Sections.addCoordinatesSection] Longitude input value:', lngInput.value);
      lngGroup.appendChild(lngInput);

      section.appendChild(lngGroup);

      // Geolocation button
      const geoBtn = document.createElement('button');
      geoBtn.type = 'button';
      geoBtn.className = 'gl-poi-btn gl-poi-btn--secondary';
      geoBtn.textContent = '📍 Utiliser ma position';
      geoBtn.onclick = () => {
        if (onGeolocation) {
          onGeolocation();
        }
      };
      section.appendChild(geoBtn);

      container.appendChild(section);
    },

    /**
     * Add basic fields section (title, description)
     * @param {HTMLElement} container - Parent container element
     */
    addBasicFieldsSection(container) {
      const section = document.createElement('div');
      section.className = 'gl-poi-form-section';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'gl-poi-form-section-title';
      sectionTitle.textContent = 'Informations de base';
      section.appendChild(sectionTitle);

      // Title
      const titleGroup = document.createElement('div');
      titleGroup.className = 'gl-poi-form-group';

      const titleLabel = document.createElement('label');
      titleLabel.htmlFor = 'poi-title';
      titleLabel.className = 'gl-poi-form-label required';
      titleLabel.textContent = 'Titre';
      titleGroup.appendChild(titleLabel);

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.id = 'poi-title';
      titleInput.className = 'gl-poi-form-input';
      titleInput.required = true;
      titleInput.placeholder = 'Nom du POI';
      titleGroup.appendChild(titleInput);

      section.appendChild(titleGroup);

      // Description
      const descGroup = document.createElement('div');
      descGroup.className = 'gl-poi-form-group';

      const descLabel = document.createElement('label');
      descLabel.htmlFor = 'poi-description';
      descLabel.className = 'gl-poi-form-label';
      descLabel.textContent = 'Description courte';
      descGroup.appendChild(descLabel);

      const descInput = document.createElement('textarea');
      descInput.id = 'poi-description';
      descInput.className = 'gl-poi-form-input';
      descInput.rows = 3;
      descInput.placeholder = 'Description courte du POI';
      descGroup.appendChild(descInput);

      section.appendChild(descGroup);

      container.appendChild(section);
    },

    /**
     * Add category/subcategory section from taxonomy
     * @param {HTMLElement} container - Parent container element
     * @param {Object} layer - Layer configuration
     */
    addCategorySection(container, layer) {
      const profile = window.GeoLeaf.Config ? window.GeoLeaf.Config.getActiveProfile() : null;
      if (!profile || !profile.taxonomy || !profile.taxonomy.categories) return;

      const section = document.createElement('div');
      section.className = 'gl-poi-form-section';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'gl-poi-form-section-title';
      sectionTitle.textContent = 'Catégorie';
      section.appendChild(sectionTitle);

      // Category select
      const catGroup = document.createElement('div');
      catGroup.className = 'gl-poi-form-group';

      const catLabel = document.createElement('label');
      catLabel.htmlFor = 'poi-category';
      catLabel.className = 'gl-poi-form-label';
      catLabel.textContent = 'Catégorie';
      catGroup.appendChild(catLabel);

      const catSelect = document.createElement('select');
      catSelect.id = 'poi-category';
      catSelect.className = 'gl-poi-form-input';

      const catDefault = document.createElement('option');
      catDefault.value = '';
      catDefault.textContent = '-- Sélectionnez --';
      catSelect.appendChild(catDefault);

      Object.entries(profile.taxonomy.categories).forEach(([key, category]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = category.label || key;
        catSelect.appendChild(option);
      });

      catSelect.onchange = () => {
        if (window.GeoLeaf.POI.AddForm.FieldsManager && window.GeoLeaf.POI.AddForm.FieldsManager.updateSubcategories) {
          window.GeoLeaf.POI.AddForm.FieldsManager.updateSubcategories(profile.taxonomy);
        }
      };
      catGroup.appendChild(catSelect);
      section.appendChild(catGroup);

      // Subcategory select
      const subcatGroup = document.createElement('div');
      subcatGroup.className = 'gl-poi-form-group';
      subcatGroup.id = 'poi-subcategory-group';
      subcatGroup.style.display = 'none';

      const subcatLabel = document.createElement('label');
      subcatLabel.htmlFor = 'poi-subcategory';
      subcatLabel.className = 'gl-poi-form-label';
      subcatLabel.textContent = 'Sous-catégorie';
      subcatGroup.appendChild(subcatLabel);

      const subcatSelect = document.createElement('select');
      subcatSelect.id = 'poi-subcategory';
      subcatSelect.className = 'gl-poi-form-input';
      subcatGroup.appendChild(subcatSelect);

      section.appendChild(subcatGroup);
      container.appendChild(section);
    },

    /**
     * Add dynamic fields from layer sidepanel configuration
     * @param {HTMLElement} container - Parent container
     * @param {Array} detailLayout - Array of field configurations
     * @param {Object} layer - Layer configuration object
     */
    addDynamicFields(container, detailLayout, layer) {
      // Check if Fields renderer is available
      if (!window.GeoLeaf.POI.AddForm.Renderers.Fields) {
        Log.warn('[Renderers.Sections] Fields renderer not available');
        return;
      }

      const section = document.createElement('div');
      section.className = 'gl-poi-form-section';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'gl-poi-form-section-title';
      sectionTitle.textContent = 'Informations complémentaires';
      section.appendChild(sectionTitle);

      // Filter fields we want in the form (skip title, basic description, coordinates, category)
      const formFields = detailLayout.filter(field => {
        if (!field.field) return false;
        if (field.field === 'title') return false;
        if (field.field === 'description') return false;
        if (field.field === 'latlng') return false;
        if (field.field === 'category') return false;
        if (field.field === 'subcategory') return false;
        if (field.field === 'attributes.categoryId') return false;
        if (field.field === 'attributes.subCategoryId') return false;
        if (field.type === 'coordinates') return false;
        if (field.type === 'image') return false; // Skip image fields (handled separately)
        if (field.field === 'attributes.photo') return false; // Skip photo field
        if (field.field === 'attributes.mainImage') return false; // Skip mainImage field
        if (field.field === 'attributes.gallery') return false; // Skip gallery field
        return true;
      });

      formFields.forEach(field => {
        const fieldGroup = window.GeoLeaf.POI.AddForm.Renderers.Fields.createFieldFromConfig(field, layer);
        if (fieldGroup) {
          section.appendChild(fieldGroup);
        }
      });

      if (formFields.length > 0) {
        container.appendChild(section);
      }
    },

    /**
     * Add images section with main image and gallery inputs
     * @param {HTMLElement} container - Parent container element
     */
    addImagesSection(container) {
      // Check if Images renderer is available
      if (!window.GeoLeaf.POI.AddForm.Renderers.Images) {
        Log.warn('[Renderers.Sections] Images renderer not available');
        return;
      }

      // Delegate to Images renderer
      window.GeoLeaf.POI.AddForm.Renderers.Images.addImagesSection(container);
    }

  };

  Log.info('[Renderers.Sections] Module initialized');

})();
