/**
 * @fileoverview POI Add Form - Fields Renderer Module
 * @description Creates form fields from configuration: text, longtext, tags, lists, tables
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
   * Fields Renderer
   * Handles creation of individual form fields from configuration
   */
  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};
  if (!window.GeoLeaf.POI.AddForm.Renderers) window.GeoLeaf.POI.AddForm.Renderers = {};

  window.GeoLeaf.POI.AddForm.Renderers.Fields = {

    /**
     * Create form field from configuration
     * @param {Object} fieldConfig - Field configuration object
     * @param {Object} layer - Layer configuration object
     * @returns {HTMLElement|null} Form group element or null
     */
    createFieldFromConfig(fieldConfig, layer) {
      const group = document.createElement('div');
      group.className = 'gl-poi-form-group';

      const label = document.createElement('label');
      label.className = 'gl-poi-form-label';
      label.textContent = fieldConfig.label || fieldConfig.field;

      const fieldId = `poi-field-${fieldConfig.field.replace(/\./g, '-')}`;
      label.htmlFor = fieldId;

      group.appendChild(label);

      let input;

      switch (fieldConfig.type) {
        case 'text':
        case 'badge':
          input = document.createElement('input');
          input.type = 'text';
          input.id = fieldId;
          input.className = 'gl-poi-form-input';
          input.placeholder = fieldConfig.label || '';
          break;

        case 'longtext':
          input = document.createElement('textarea');
          input.id = fieldId;
          input.className = 'gl-poi-form-input';
          input.rows = 4;
          input.placeholder = fieldConfig.label || '';
          break;

        case 'list':
          const listContainer = this.createEditableList(fieldId, fieldConfig);
          listContainer.dataset.field = fieldConfig.field;
          group.appendChild(listContainer);
          return group;

        case 'tags':
          const tagsContainer = this.createTagsSelector(fieldId, fieldConfig, layer);
          tagsContainer.dataset.field = fieldConfig.field;
          group.appendChild(tagsContainer);
          return group;

        case 'table':
          const tableContainer = this.createEditableTable(fieldId, fieldConfig);
          tableContainer.dataset.field = fieldConfig.field;
          group.appendChild(tableContainer);
          return group;

        default:
          input = document.createElement('input');
          input.type = 'text';
          input.id = fieldId;
          input.className = 'gl-poi-form-input';
      }

      if (input) {
        input.dataset.field = fieldConfig.field;
        group.appendChild(input);
      }

      return group;
    },

    /**
     * Create tags selector (multi-select badges)
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration
     * @param {Object} layer - Layer configuration object
     * @returns {HTMLElement} Tags selector container
     */
    createTagsSelector(fieldId, fieldConfig, layer) {
      console.log('[Renderers.Fields.createTagsSelector] Creating tags selector for layer:', layer?.id);

      const container = document.createElement('div');
      container.className = 'gl-poi-tags-selector';
      container.id = fieldId;

      // Get available tags from current layer
      const layerId = layer?.id;
      const availableTags = window.GeoLeaf.POI.AddForm.FieldsManager && window.GeoLeaf.POI.AddForm.FieldsManager.getLayerTags && layerId
        ? window.GeoLeaf.POI.AddForm.FieldsManager.getLayerTags(layerId)
        : [];

      console.log('[Renderers.Fields.createTagsSelector] Available tags for layer', layerId, ':', availableTags);

      if (availableTags.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'gl-poi-tags-placeholder';
        placeholder.textContent = 'Aucun tag disponible dans cette couche';
        container.appendChild(placeholder);
        return container;
      }

      // Tags container
      const tagsWrapper = document.createElement('div');
      tagsWrapper.className = 'gl-poi-tags-wrapper';

      // Create badge for each available tag
      availableTags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'gl-poi-tag-badge';
        badge.textContent = tag;
        badge.dataset.tagValue = tag;

        // Toggle selection on click
        badge.addEventListener('click', () => {
          badge.classList.toggle('is-selected');
          console.log('[Renderers.Fields.createTagsSelector] Tag toggled:', tag, badge.classList.contains('is-selected'));
        });

        tagsWrapper.appendChild(badge);
      });

      container.appendChild(tagsWrapper);

      console.log('[Renderers.Fields.createTagsSelector] Created', availableTags.length, 'tag badges');
      return container;
    },

    /**
     * Create editable list widget
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration
     * @returns {HTMLElement} List editor container
     */
    createEditableList(fieldId, fieldConfig) {
      const container = document.createElement('div');
      container.className = 'gl-poi-list-editor';
      container.id = fieldId;

      // List container
      const listWrapper = document.createElement('div');
      listWrapper.className = 'gl-poi-list-wrapper';

      const list = document.createElement('ul');
      list.className = 'gl-poi-editable-list';

      // Add 2 default items
      for (let i = 0; i < 2; i++) {
        list.appendChild(this.createListItem());
      }

      listWrapper.appendChild(list);
      container.appendChild(listWrapper);

      // Add button
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'gl-poi-btn gl-poi-btn--secondary gl-poi-btn--small';
      addBtn.textContent = '+ Ajouter une ligne';
      addBtn.onclick = () => {
        list.appendChild(this.createListItem());
      };
      container.appendChild(addBtn);

      return container;
    },

    /**
     * Create a list item with input and delete button
     * @returns {HTMLElement} List item element
     */
    createListItem() {
      const li = document.createElement('li');
      li.className = 'gl-poi-list-item';

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `geoleaf-poi-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      input.name = input.id;
      input.className = 'gl-poi-list-input';
      input.placeholder = 'Élément de la liste';
      li.appendChild(input);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'gl-poi-list-delete';
      deleteBtn.textContent = '✕'; // Security: Use textContent instead of innerHTML to prevent XSS
      deleteBtn.title = 'Supprimer cet élément';
      deleteBtn.onclick = () => {
        li.remove();
      };
      li.appendChild(deleteBtn);

      return li;
    },

    /**
     * Create editable table widget
     * @param {string} fieldId - Field identifier
     * @param {Object} fieldConfig - Field configuration with columns
     * @returns {HTMLElement} Table editor container
     */
    createEditableTable(fieldId, fieldConfig) {
      const container = document.createElement('div');
      container.className = 'gl-poi-table-editor';
      container.id = fieldId;

      // Get column definitions from config
      const columns = fieldConfig.columns || [
        { key: 'col1', label: 'Colonne 1' },
        { key: 'col2', label: 'Colonne 2' }
      ];

      // Store columns data
      container.dataset.columns = JSON.stringify(columns);

      // Table wrapper
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'gl-poi-table-wrapper';

      // Create table
      const table = document.createElement('table');
      table.className = 'gl-poi-editable-table';

      // Create header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.dataset.key = col.key;
        headerRow.appendChild(th);
      });

      // Add column for delete row button
      const thDelete = document.createElement('th');
      thDelete.className = 'gl-poi-table-actions';
      thDelete.style.width = '40px';
      headerRow.appendChild(thDelete);

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create body with 2 default rows
      const tbody = document.createElement('tbody');
      for (let i = 0; i < 2; i++) {
        tbody.appendChild(this.createTableRow(columns));
      }
      table.appendChild(tbody);

      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      // Buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'gl-poi-table-buttons';

      // Add row button
      const addRowBtn = document.createElement('button');
      addRowBtn.type = 'button';
      addRowBtn.className = 'gl-poi-btn gl-poi-btn--secondary gl-poi-btn--small';
      addRowBtn.textContent = '+ Ajouter une ligne';
      addRowBtn.onclick = () => {
        const tbody = table.querySelector('tbody');
        tbody.appendChild(this.createTableRow(columns));
      };
      buttonsContainer.appendChild(addRowBtn);

      container.appendChild(buttonsContainer);

      return container;
    },

    /**
     * Create a table row with editable cells
     * @param {Array} columns - Column definitions array
     * @returns {HTMLElement} Table row element
     */
    createTableRow(columns) {
      const tr = document.createElement('tr');

      columns.forEach(col => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `geoleaf-poi-table-${col.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        input.name = input.id;
        input.className = 'gl-poi-table-cell-input';
        input.dataset.key = col.key;
        td.appendChild(input);
        tr.appendChild(td);
      });

      // Delete row button
      const tdDelete = document.createElement('td');
      tdDelete.className = 'gl-poi-table-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'gl-poi-table-delete-row';
      deleteBtn.textContent = '✕'; // Security: Use textContent instead of innerHTML to prevent XSS
      deleteBtn.title = 'Supprimer cette ligne';
      deleteBtn.onclick = () => {
        tr.remove();
      };
      tdDelete.appendChild(deleteBtn);
      tr.appendChild(tdDelete);

      return tr;
    }

  };

  Log.info('[Renderers.Fields] Module initialized');

})();
