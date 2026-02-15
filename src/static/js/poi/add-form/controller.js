/**
 * @fileoverview POI Add Form - Main Controller
 * Sprint 4.1: Extracted from add-form-orchestrator.js
 *
 * Main coordination controller that manages form lifecycle
 * Coordinates all sub-modules with clean delegation pattern
 *
 * @version 1.0.0
 * @author GeoLeaf Team
 * @since 2026-01-17
 */

(function(global) {
    'use strict';

    // Ensure GeoLeaf namespace
    if (typeof global.GeoLeaf === 'undefined') global.GeoLeaf = {};
    if (typeof global.GeoLeaf.POI === 'undefined') global.GeoLeaf.POI = {};
    if (typeof global.GeoLeaf.POI.AddForm === 'undefined') global.GeoLeaf.POI.AddForm = {};

    /**
     * @class AddFormController
     * @description Main controller for POI add/edit form coordination
     */
    class AddFormController {
        constructor() {
            this.modules = new Map();
            this.isInitialized = false;
            this.activeOperations = new Set();
        }

        /**
         * Initialize controller and verify all modules
         * @returns {Promise<boolean>} Success status
         */
        async init() {
            try {
                // Wait for required modules to be available
                await this._ensureModulesLoaded();

                // Initialize all modules
                const initResults = await this._initializeModules();

                if (!initResults.every(result => result)) {
                    throw new Error('Some modules failed to initialize');
                }

                this.isInitialized = true;

                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[AddFormController] Controller initialized successfully');
                }

                return true;
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Initialization failed:', error);
                }
                return false;
            }
        }

        /**
         * Open form for adding new POI
         * @param {Object} coordinates - {lat, lng}
         * @param {string} layerId - Target layer ID
         * @returns {Promise<boolean>} Success status
         */
        async openAddForm(coordinates, layerId) {
            const operationId = this._generateOperationId('add');
            this.activeOperations.add(operationId);

            try {
                this._validateCoordinates(coordinates);

                const stateManager = this._getModule('StateManager');
                const renderer = this._getModule('Renderer');
                const validator = this._getModule('Validator');

                // Initialize state for add mode
                stateManager.reset();
                stateManager.setMode('add');
                stateManager.setCoordinates(coordinates);

                if (layerId) {
                    const layer = this._getLayerConfig(layerId);
                    stateManager.setLayer(layer, layerId);
                }

                // Validate initial state
                const validation = validator.validateAll(stateManager.getState());
                if (!validation.isValid) {
                    if (global.GeoLeaf.Log) {
                        global.GeoLeaf.Log.warn('[AddFormController] Initial state validation failed:', validation.errors);
                    }
                }

                // Render form
                await renderer.renderModal('add');

                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[AddFormController] Add form opened');
                }

                return true;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to open add form:', error);
                }
                return false;
            } finally {
                this.activeOperations.delete(operationId);
            }
        }

        /**
         * Open form for editing existing POI
         * @param {Object} poi - POI object to edit
         * @returns {Promise<boolean>} Success status
         */
        async openEditForm(poi) {
            const operationId = this._generateOperationId('edit');
            this.activeOperations.add(operationId);

            try {
                this._validatePoi(poi);

                const stateManager = this._getModule('StateManager');
                const renderer = this._getModule('Renderer');
                const dataMapper = this._getModule('DataMapper');
                const validator = this._getModule('Validator');

                // Initialize state for edit mode
                stateManager.reset();
                stateManager.setMode('edit');
                stateManager.setPoi(poi);

                if (poi.geometry && poi.geometry.coordinates) {
                    const [lng, lat] = poi.geometry.coordinates;
                    stateManager.setCoordinates({ lat, lng });
                }

                // Map POI data to form fields
                const formData = dataMapper.poiToForm(poi);
                stateManager.setFormData(formData);

                // Validate state
                const validation = validator.validateAll(stateManager.getState());
                if (!validation.isValid) {
                    if (global.GeoLeaf.Log) {
                        global.GeoLeaf.Log.warn('[AddFormController] Edit state validation failed:', validation.errors);
                    }
                }

                // Render form
                await renderer.renderModal('edit');

                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[AddFormController] Edit form opened for POI:', poi.id);
                }

                return true;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to open edit form:', error);
                }
                return false;
            } finally {
                this.activeOperations.delete(operationId);
            }
        }

        /**
         * Open form in view-only mode
         * @param {Object} poi - POI object to view
         * @returns {Promise<boolean>} Success status
         */
        async openViewForm(poi) {
            const operationId = this._generateOperationId('view');
            this.activeOperations.add(operationId);

            try {
                this._validatePoi(poi);

                const stateManager = this._getModule('StateManager');
                const renderer = this._getModule('Renderer');
                const dataMapper = this._getModule('DataMapper');

                // Initialize state for view mode
                stateManager.reset();
                stateManager.setMode('view');
                stateManager.setPoi(poi);

                if (poi.geometry && poi.geometry.coordinates) {
                    const [lng, lat] = poi.geometry.coordinates;
                    stateManager.setCoordinates({ lat, lng });
                }

                // Map POI data to form fields (read-only)
                const formData = dataMapper.poiToForm(poi);
                stateManager.setFormData(formData);

                // Render form in view mode
                await renderer.renderModal('view');

                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[AddFormController] View form opened for POI:', poi.id);
                }

                return true;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to open view form:', error);
                }
                return false;
            } finally {
                this.activeOperations.delete(operationId);
            }
        }

        /**
         * Close form and cleanup
         * @returns {Promise<boolean>} Success status
         */
        async closeForm() {
            try {
                const stateManager = this._getModule('StateManager');
                const renderer = this._getModule('Renderer');

                // Check for unsaved changes
                if (stateManager.isDirty()) {
                    const confirmed = await this._confirmUnsavedChanges();
                    if (!confirmed) {
                        return false;
                    }
                }

                // Close modal and cleanup
                await renderer.closeModal();
                stateManager.reset();

                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.info('[AddFormController] Form closed');
                }

                return true;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to close form:', error);
                }
                return false;
            }
        }

        /**
         * Submit form (add or update POI)
         * @returns {Promise<boolean>} Success status
         */
        async submitForm() {
            const operationId = this._generateOperationId('submit');
            this.activeOperations.add(operationId);

            try {
                const stateManager = this._getModule('StateManager');
                const validator = this._getModule('Validator');
                const submitHandler = this._getModule('SubmitHandler');
                const dataMapper = this._getModule('DataMapper');

                const state = stateManager.getState();

                // Validate form
                const validation = validator.validateAll(state);
                if (!validation.isValid) {
                    this._showValidationErrors(validation.errors);
                    return false;
                }

                // Prepare POI data
                const poiData = dataMapper.formToPoi(state.formData, state);

                // Submit based on mode
                let result;
                if (state.mode === 'add') {
                    result = await submitHandler.addPoi(poiData);
                } else if (state.mode === 'edit') {
                    result = await submitHandler.updatePoi(state.poi.id, poiData);
                } else {
                    throw new Error('Invalid mode for submission: ' + state.mode);
                }

                if (result.success) {
                    stateManager.markClean();
                    await this.closeForm();

                    if (global.GeoLeaf.Log) {
                        global.GeoLeaf.Log.info(`[AddFormController] POI ${state.mode}ed successfully:`, result.poi?.id);
                    }
                }

                return result.success;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Form submission failed:', error);
                }
                this._showError('Submission failed: ' + error.message);
                return false;
            } finally {
                this.activeOperations.delete(operationId);
            }
        }

        /**
         * Delete POI (edit mode only)
         * @returns {Promise<boolean>} Success status
         */
        async deletePoi() {
            const operationId = this._generateOperationId('delete');
            this.activeOperations.add(operationId);

            try {
                const stateManager = this._getModule('StateManager');
                const submitHandler = this._getModule('SubmitHandler');

                const state = stateManager.getState();

                if (state.mode !== 'edit' || !state.poi) {
                    throw new Error('Delete only available in edit mode');
                }

                // Confirm deletion
                const confirmed = await this._confirmDeletion(state.poi);
                if (!confirmed) {
                    return false;
                }

                // Delete POI
                const result = await submitHandler.deletePoi(state.poi.id);

                if (result.success) {
                    await this.closeForm();

                    if (global.GeoLeaf.Log) {
                        global.GeoLeaf.Log.info('[AddFormController] POI deleted successfully:', state.poi.id);
                    }
                }

                return result.success;

            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] POI deletion failed:', error);
                }
                this._showError('Deletion failed: ' + error.message);
                return false;
            } finally {
                this.activeOperations.delete(operationId);
            }
        }

        /**
         * Get current form state (for debugging)
         * @returns {Object} Current state
         */
        getState() {
            try {
                const stateManager = this._getModule('StateManager');
                return stateManager.getState();
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to get state:', error);
                }
                return null;
            }
        }

        /**
         * Export form data
         * @returns {Object} Exported data
         */
        exportData() {
            try {
                const stateManager = this._getModule('StateManager');
                return stateManager.export();
            } catch (error) {
                if (global.GeoLeaf.Log) {
                    global.GeoLeaf.Log.error('[AddFormController] Failed to export data:', error);
                }
                return null;
            }
        }

        /**
         * Check if controller is busy with operations
         * @returns {boolean} Is busy
         */
        isBusy() {
            return this.activeOperations.size > 0;
        }

        // Private methods

        /**
         * Ensure all required modules are loaded
         * @private
         */
        async _ensureModulesLoaded() {
            const required = [
                'StateManager', 'Renderer', 'Validator',
                'DataMapper', 'SubmitHandler', 'FieldsManager'
            ];

            const promises = required.map(async (moduleName) => {
                const module = global.GeoLeaf.POI.AddForm[moduleName];
                if (!module) {
                    // Try lazy loading if available
                    if (global.GeoLeaf.POI.AddForm.LazyLoader) {
                        await global.GeoLeaf.POI.AddForm.LazyLoader.loadModule(`add-form/${moduleName.toLowerCase()}.js`);
                    } else {
                        throw new Error(`Required module not loaded: ${moduleName}`);
                    }
                }

                this.modules.set(moduleName, global.GeoLeaf.POI.AddForm[moduleName]);
            });

            await Promise.all(promises);
        }

        /**
         * Initialize all modules
         * @private
         */
        async _initializeModules() {
            const initPromises = Array.from(this.modules.entries()).map(async ([name, module]) => {
                try {
                    if (module.init) {
                        const result = await module.init();
                        if (global.GeoLeaf.Log) {
                            global.GeoLeaf.Log.debug(`[AddFormController] ${name} initialized:`, result);
                        }
                        return result;
                    }
                    return true;
                } catch (error) {
                    if (global.GeoLeaf.Log) {
                        global.GeoLeaf.Log.error(`[AddFormController] Failed to initialize ${name}:`, error);
                    }
                    return false;
                }
            });

            return Promise.all(initPromises);
        }

        /**
         * Get module instance
         * @private
         */
        _getModule(name) {
            const module = this.modules.get(name) || global.GeoLeaf.POI.AddForm[name];
            if (!module) {
                throw new Error(`Module not available: ${name}`);
            }
            return module;
        }

        /**
         * Validate coordinates
         * @private
         */
        _validateCoordinates(coords) {
            if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
                throw new Error('Invalid coordinates format');
            }

            if (coords.lat < -90 || coords.lat > 90) {
                throw new Error('Invalid latitude: ' + coords.lat);
            }

            if (coords.lng < -180 || coords.lng > 180) {
                throw new Error('Invalid longitude: ' + coords.lng);
            }
        }

        /**
         * Validate POI object
         * @private
         */
        _validatePoi(poi) {
            if (!poi || !poi.id) {
                throw new Error('Invalid POI object');
            }
        }

        /**
         * Get layer configuration
         * @private
         */
        _getLayerConfig(layerId) {
            if (global.GeoLeaf.Layers && global.GeoLeaf.Layers.getLayerConfig) {
                return global.GeoLeaf.Layers.getLayerConfig(layerId);
            }

            // Fallback
            return { id: layerId };
        }

        /**
         * Generate operation ID for tracking
         * @private
         */
        _generateOperationId(operation) {
            return `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Show validation errors to user
         * @private
         */
        _showValidationErrors(errors) {
            // TODO(v3.2): Implement user-friendly error display with toast notifications
            if (global.GeoLeaf.UI && global.GeoLeaf.UI.showErrors) {
                global.GeoLeaf.UI.showErrors(errors);
            } else if (global.GeoLeaf.Log) {
                global.GeoLeaf.Log.warn('[AddFormController] Validation errors:', errors);
            }
        }

        /**
         * Show error message to user
         * @private
         */
        _showError(message) {
            if (global.GeoLeaf.UI && global.GeoLeaf.UI.showError) {
                global.GeoLeaf.UI.showError(message);
            } else if (global.console) {
                console.error('[AddFormController]', message);
            }
        }

        /**
         * Confirm unsaved changes
         * @private
         */
        async _confirmUnsavedChanges() {
            if (global.GeoLeaf.UI && global.GeoLeaf.UI.confirm) {
                return global.GeoLeaf.UI.confirm('You have unsaved changes. Are you sure you want to close?');
            }

            return confirm('You have unsaved changes. Are you sure you want to close?');
        }

        /**
         * Confirm POI deletion
         * @private
         */
        async _confirmDeletion(poi) {
            const message = `Are you sure you want to delete this POI? This action cannot be undone.`;

            if (global.GeoLeaf.UI && global.GeoLeaf.UI.confirm) {
                return global.GeoLeaf.UI.confirm(message);
            }

            return confirm(message);
        }
    }

    // Create global instance
    const controller = new AddFormController();

    // Export to GeoLeaf namespace
    global.GeoLeaf.POI.AddForm.Controller = AddFormController;
    global.GeoLeaf.POI.AddForm.controller = controller;

    // Main API methods (backwards compatibility)
    global.GeoLeaf.POI.AddForm.openAddForm = (coords, layerId) => controller.openAddForm(coords, layerId);
    global.GeoLeaf.POI.AddForm.openEditForm = (poi) => controller.openEditForm(poi);
    global.GeoLeaf.POI.AddForm.openViewForm = (poi) => controller.openViewForm(poi);
    global.GeoLeaf.POI.AddForm.closeForm = () => controller.closeForm();
    global.GeoLeaf.POI.AddForm.submitForm = () => controller.submitForm();
    global.GeoLeaf.POI.AddForm.deletePoi = () => controller.deletePoi();
    global.GeoLeaf.POI.AddForm.getState = () => controller.getState();
    global.GeoLeaf.POI.AddForm.exportData = () => controller.exportData();
    global.GeoLeaf.POI.AddForm.isBusy = () => controller.isBusy();

    // Initialize controller
    controller.init().then(success => {
        if (global.GeoLeaf.Log) {
            if (success) {
                global.GeoLeaf.Log.info('[AddFormController] Module loaded and initialized successfully');
            } else {
                global.GeoLeaf.Log.error('[AddFormController] Module loaded but initialization failed');
            }
        }
    });

})(typeof window !== 'undefined' ? window : this);
