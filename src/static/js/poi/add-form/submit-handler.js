/**
 * @file submit-handler.js
 * @description Form submission and POI operations handler
 * Handles add/edit/delete operations and sync queue integration
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
   * FormSubmitHandler
   * Handles form submission logic and POI CRUD operations
   * Extracted from poi/add-form.js (Phase 4)
   */
  const FormSubmitHandler = {
    /**
     * Handle form submission (main entry point)
     * Validates, collects data, and triggers add/update
     * @param {string} mode - 'add' or 'edit'
     * @param {Object} currentPoi - Current POI (for edit mode)
     * @param {Object} currentLayer - Current layer config
     */
    async handleSubmit(mode, currentPoi, currentLayer) {
      const Log = GeoLeaf.Log || console;
      Log.debug('[SubmitHandler] Called with:', { mode, currentPoi, currentLayer });

      try {
        // Disable save button
        const saveBtn = document.getElementById('gl-poi-save-btn');

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Enregistrement...';
        }

        // Step 1: Validate form
        const validation = window.GeoLeaf.POI.AddForm.Validator.validateForm();

        if (!validation.valid) {
          if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
            window.GeoLeaf.UI.notify.error(validation.error);
          }
          return;
        }

        // Step 2: Collect form data
        const poiData = await window.GeoLeaf.POI.AddForm.DataMapper.collectFormData(mode, currentPoi, currentLayer);
        Log.debug('[SubmitHandler] Collected POI data');

        // Step 3: Add timestamp and user info
        poiData.lastModified = Date.now();
        poiData.modifiedBy = 'current-user'; // TODO(auth): Integrate with authentication system to get actual user ID

        // Step 4: Handle based on mode
        if (mode === 'add') {
          Log.debug('[SubmitHandler] Adding new POI...');
          await this.addNewPoi(poiData);
        } else if (mode === 'edit') {
          Log.debug('[SubmitHandler] Updating existing POI...');
          await this.updateExistingPoi(poiData);
        }

        // Step 5: Close modal on success
        window.GeoLeaf.POI.AddForm.StateManager.hideModal();

        Log.debug('[SubmitHandler] Submit completed successfully');

      } catch (error) {
        console.error('[SubmitHandler.handleSubmit] Error:', error);
        window.GeoLeaf.Log?.error('[SubmitHandler] Submit error:', error);
        if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
          window.GeoLeaf.UI.notify.error('Erreur: ' + error.message);
        }
      } finally {
        // Re-enable button
        const saveBtn = document.getElementById('gl-poi-save-btn');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = mode === 'edit' ? 'Enregistrer' : 'Ajouter le POI';
        }
      }
    },

    /**
     * Add new POI to map and sync queue
     * @param {Object} poiData - POI data object
     */
    async addNewPoi(poiData) {
      window.GeoLeaf.Log?.info('[SubmitHandler] Adding POI:', poiData.title);
      window.GeoLeaf.Log?.info('[SubmitHandler] POI data layerId:', poiData.layerId);
      window.GeoLeaf.Log?.info('[SubmitHandler] POI data has _layerConfig:', !!poiData._layerConfig);

      // Ensure POI has layer configuration reference for popup/tooltip/sidepanel
      if (poiData.layerId && (!poiData._layerConfig || poiData._layerConfig.id !== poiData.layerId)) {
        window.GeoLeaf.Log?.info('[SubmitHandler] Attempting to get layer config for:', poiData.layerId);
        const layerConfig = await this._getLayerConfigById(poiData.layerId);
        if (layerConfig) {
          // CORRECTION V3: Attacher la configuration layer directement sans transformation
          // Les modules POI s'attendent à la structure V3 native
          poiData._layerConfig = layerConfig;

          // Aussi attacher les configurations spécialisées pour rétro-compatibilité
          if (layerConfig.popup) {
            poiData._popupConfig = layerConfig.popup;
          }
          if (layerConfig.sidepanel) {
            poiData._sidepanelConfig = layerConfig.sidepanel;
          }
          if (layerConfig.tooltip) {
            poiData._tooltipConfig = layerConfig.tooltip;
          }

          window.GeoLeaf.Log?.info('[SubmitHandler] ✅ Layer config attached to POI:', poiData.layerId);
          window.GeoLeaf.Log?.info('[SubmitHandler] - Has popup config:', !!layerConfig.popup);
          window.GeoLeaf.Log?.info('[SubmitHandler] - Has sidepanel config:', !!layerConfig.sidepanel);
          window.GeoLeaf.Log?.info('[SubmitHandler] - Has tooltip config:', !!layerConfig.tooltip);
          window.GeoLeaf.Log?.info('[SubmitHandler] - Sidepanel detailLayout items:', layerConfig.sidepanel?.detailLayout?.length || 0);
        } else {
          window.GeoLeaf.Log?.warn('[SubmitHandler] Could not find layer config for:', poiData.layerId);
        }
      }

      window.GeoLeaf.Log?.info('[SubmitHandler] Final POI data _layerConfig type:', typeof poiData._layerConfig);
      window.GeoLeaf.Log?.info('[SubmitHandler] Final POI data _layerConfig:', !!poiData._layerConfig);
      if (poiData._layerConfig && typeof poiData._layerConfig === 'object') {
        window.GeoLeaf.Log?.info('[SubmitHandler] _layerConfig keys:', Object.keys(poiData._layerConfig));
        window.GeoLeaf.Log?.info('[SubmitHandler] _layerConfig has popup:', !!poiData._layerConfig.popup);
        window.GeoLeaf.Log?.info('[SubmitHandler] _layerConfig has detailPopup:', !!poiData._layerConfig.detailPopup);
        window.GeoLeaf.Log?.info('[SubmitHandler] _layerConfig has sidepanel:', !!poiData._layerConfig.sidepanel);
        window.GeoLeaf.Log?.info('[SubmitHandler] _layerConfig has layout:', !!poiData._layerConfig.layout);
      }

      // Add to map via POI module
      if (window.GeoLeaf.POI && window.GeoLeaf.POI.addPoi) {
        const marker = window.GeoLeaf.POI.addPoi(poiData);
        window.GeoLeaf.Log?.info('[SubmitHandler] POI added to map with marker:', !!marker);

        if (marker && marker._geoleafPoiData) {
          window.GeoLeaf.Log?.info('[SubmitHandler] Marker POI data has _layerConfig:', !!marker._geoleafPoiData._layerConfig);
        }
      } else {
        window.GeoLeaf.Log?.warn('window.GeoLeaf.POI.addPoi not available');
      }

      // Add to sync queue (safe — works without Storage plugin)
      if (window.GeoLeaf.POI.SyncHandler) {
        try {
          await window.GeoLeaf.POI.SyncHandler.queueOperation('add_poi', poiData);
          window.GeoLeaf.Log?.debug('POI added to sync queue');
        } catch (syncErr) {
          window.GeoLeaf.Log?.warn('SyncHandler.queueOperation failed (Storage plugin missing?) :', syncErr);
        }
      } else {
        window.GeoLeaf.Log?.warn('SyncHandler not available - POI not queued for sync');
      }

      // Notify user
      if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
        window.GeoLeaf.UI.notify.success('POI ajouté avec succès !');
      }

      window.GeoLeaf.Log?.info('[SubmitHandler] POI added successfully');
    },

    /**
     * Update existing POI on map and sync queue
     * @param {Object} poiData - Updated POI data object
     */
    async updateExistingPoi(poiData) {
      window.GeoLeaf.Log?.info('[SubmitHandler] Updating POI:', poiData.id);

      // Update in map
      if (window.GeoLeaf.POI && window.GeoLeaf.POI.updatePoi) {
        window.GeoLeaf.POI.updatePoi(poiData);
        window.GeoLeaf.Log?.debug('POI updated on map');
      } else {
        window.GeoLeaf.Log?.warn('window.GeoLeaf.POI.updatePoi not available');
      }

      // Add to sync queue (safe — works without Storage plugin)
      if (window.GeoLeaf.POI.SyncHandler) {
        try {
          await window.GeoLeaf.POI.SyncHandler.queueOperation('update_poi', poiData);
          window.GeoLeaf.Log?.debug('POI update added to sync queue');
        } catch (syncErr) {
          window.GeoLeaf.Log?.warn('SyncHandler.queueOperation failed (Storage plugin missing?) :', syncErr);
        }
      } else {
        window.GeoLeaf.Log?.warn('SyncHandler not available - POI update not queued for sync');
      }

      // Notify user
      if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
        window.GeoLeaf.UI.notify.success('POI modifié avec succès !');
      }

      window.GeoLeaf.Log?.info('[SubmitHandler] POI updated successfully');
    },

    /**
     * Handle POI deletion with confirmation
     * @param {Object} currentPoi - POI to delete
     */
    async handleDelete(currentPoi) {
      if (!currentPoi) {
        window.GeoLeaf.Log?.warn('No POI to delete');
        return;
      }

      const confirmed = confirm(
        `Voulez-vous vraiment supprimer le POI "${currentPoi.title}" ?\n\nCette action sera synchronisée avec le serveur.`
      );

      if (!confirmed) {
        window.GeoLeaf.Log?.debug('Deletion canceled by user');
        return;
      }

      try {
        window.GeoLeaf.Log?.info('[SubmitHandler] Deleting POI:', currentPoi.id);

        // Remove from map
        if (window.GeoLeaf.POI && window.GeoLeaf.POI.removePoi) {
          window.GeoLeaf.POI.removePoi(currentPoi.id);
          window.GeoLeaf.Log?.debug('POI removed from map');
        } else {
          window.GeoLeaf.Log?.warn('window.GeoLeaf.POI.removePoi not available');
        }

        // Add to sync queue (safe — works without Storage plugin)
        if (window.GeoLeaf.POI.SyncHandler) {
          try {
            await window.GeoLeaf.POI.SyncHandler.queueOperation('delete_poi', {
              id: currentPoi.id,
              layerId: currentPoi._layerConfig.id,
            });
            window.GeoLeaf.Log?.debug('POI deletion added to sync queue');
          } catch (syncErr) {
            window.GeoLeaf.Log?.warn('SyncHandler.queueOperation failed (Storage plugin missing?) :', syncErr);
          }
        } else {
          window.GeoLeaf.Log?.warn('SyncHandler not available - POI deletion not queued for sync');
        }

        // Notify user
        if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
          window.GeoLeaf.UI.notify.success('POI supprimé');
        }

        // Close modal
        window.GeoLeaf.POI.AddForm.StateManager.hideModal();

        window.GeoLeaf.Log?.info('[SubmitHandler] POI deleted successfully');

      } catch (error) {
        window.GeoLeaf.Log?.error('[SubmitHandler] Delete error:', error);
        if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
          window.GeoLeaf.UI.notify.error('Erreur lors de la suppression');
        }
      }
    },

    /**
     * Check if layer allows deletion
     * @param {Object} layer - Layer config
     * @returns {boolean} True if deletion is allowed
     */
    canDelete(layer) {
      if (!layer) return false;
      return layer.enableEditionFull === true;
    },

    /**
     * Validate POI operation permissions
     * @param {string} operation - 'add' | 'edit' | 'delete'
     * @param {Object} layer - Layer configuration
     * @returns {Object} { allowed: boolean, reason?: string }
     */
    validatePermissions(operation, layer) {
      if (!layer) {
        return {
          allowed: false,
          reason: 'Aucune couche sélectionnée',
        };
      }

      switch (operation) {
        case 'add':
          if (layer.enableEdition !== true) {
            return {
              allowed: false,
              reason: 'La couche n\'autorise pas l\'ajout de POI',
            };
          }
          break;

        case 'edit':
          if (layer.enableEdition !== true && layer.enableEditionFull !== true) {
            return {
              allowed: false,
              reason: 'La couche n\'autorise pas la modification de POI',
            };
          }
          break;

        case 'delete':
          if (layer.enableEditionFull !== true) {
            return {
              allowed: false,
              reason: 'La couche n\'autorise pas la suppression de POI',
            };
          }
          break;

        default:
          return {
            allowed: false,
            reason: 'Opération inconnue',
          };
      }

      return { allowed: true };
    },

    /**
     * Get layer configuration by ID (for _layerConfig reference)
     * CORRIGÉ V3: Support amélioré pour la structure des profils V3
     * @param {string} layerId - Layer ID
     * @returns {Object|null} Layer configuration
     * @private
     */
    async _getLayerConfigById(layerId) {
      try {
        window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Looking for layer: ${layerId}`);

        // PRIORITÉ 1: Essayer d'abord de récupérer depuis le profil actif
        if (window.GeoLeaf?.Config?.getActiveProfile) {
          const profile = window.GeoLeaf.Config.getActiveProfile();
          window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Profile found:`, !!profile);

          if (profile?.layers && Array.isArray(profile.layers)) {
            window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Profile has ${profile.layers.length} layers`);

            // Dans la V3, les couches peuvent être définies de deux façons :
            // 1. Directement avec toute la config
            // 2. Avec référence à un fichier configFile
            const layer = profile.layers.find(l => l.id === layerId);
            if (layer) {
              // Si la couche a un configFile, la charger
              if (layer.configFile) {
                window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Layer ${layerId} has configFile:`, layer.configFile);
                const fullConfig = await this._loadLayerConfigFromFile(layer.configFile, profile);
                if (fullConfig) {
                  window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] ✅ Loaded layer config from file for: ${layerId}`);
                  window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Config has popup:`, !!fullConfig.popup);
                  window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] Config has sidepanel:`, !!fullConfig.sidepanel);
                  return fullConfig;
                }
              } else {
                // Configuration directe dans le profil
                window.GeoLeaf.Log?.info(`[SubmitHandler._getLayerConfigById] ✅ Found direct layer config for: ${layerId}`);
                return layer;
              }
            } else {
              window.GeoLeaf.Log?.warn(`[SubmitHandler._getLayerConfigById] Layer ${layerId} not found in profile layers`);
            }
          } else {
            window.GeoLeaf.Log?.warn(`[SubmitHandler._getLayerConfigById] Profile has no layers array`);
          }
        } else {
          window.GeoLeaf.Log?.warn(`[SubmitHandler._getLayerConfigById] GeoLeaf.Config.getActiveProfile not available`);
        }

        // PRIORITÉ 2: Fallback - essayer de charger directement depuis le système de fichiers
        window.GeoLeaf.Log?.warn(`[SubmitHandler._getLayerConfigById] Fallback: direct file loading for: ${layerId}`);
        return this._loadLayerConfigFromFile(`${layerId}/${layerId}_config.json`, null);

      } catch (error) {
        window.GeoLeaf.Log?.error(`[SubmitHandler._getLayerConfigById] Error getting layer config:`, error.message);
        return null;
      }
    },

    /**
     * Load layer configuration directly from the file system
     * CORRIGÉ V3: Support flexible des chemins de fichiers pour structure V3
     * @param {string} configPath - Chemin relatif vers le fichier de config (ex: "tourism_poi_all/tourism_poi_config.json")
     * @param {Object} profile - Profil actif (optionnel)
     * @returns {Promise<Object>|Object} Layer configuration or null
     */
    async _loadLayerConfigFromFile(configPath, profile) {
      try {
        window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Loading config from path: ${configPath}`);

        // Déterminer le nom du profil
        const profileName = profile?.id || window.GeoLeaf?.Config?.getActiveProfile()?.id || 'tourism';

        // Construire l'URL complète
        let configUrl;
        if (configPath.startsWith('layers/') || configPath.startsWith('profiles/')) {
          // Chemin absolu depuis la racine
          configUrl = configPath;
        } else if (configPath.includes('/')) {
          // Chemin relatif avec dossier (ex: "tourism_poi_all/tourism_poi_config.json")
          configUrl = `profiles/${profileName}/layers/${configPath}`;
        } else {
          // Juste un nom de fichier
          configUrl = `profiles/${profileName}/layers/${configPath}`;
        }

        window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Final URL: ${configUrl}`);

        const response = await fetch(configUrl);
        if (response.ok) {
          const layerConfig = await response.json();
          window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] ✅ Successfully loaded config from: ${configUrl}`);
          window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Config keys:`, Object.keys(layerConfig));
          window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Has popup config:`, !!layerConfig.popup);
          window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Has sidepanel config:`, !!layerConfig.sidepanel);
          window.GeoLeaf.Log?.info(`[SubmitHandler._loadLayerConfigFromFile] Has tooltip config:`, !!layerConfig.tooltip);
          return layerConfig;
        } else {
          window.GeoLeaf.Log?.warn(`[SubmitHandler._loadLayerConfigFromFile] Failed to load config: HTTP ${response.status} for ${configUrl}`);
          return null;
        }
      } catch (error) {
        window.GeoLeaf.Log?.error(`[SubmitHandler._loadLayerConfigFromFile] Error loading config from ${configPath}:`, error.message);
        return null;
      }
    }
  };

  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};

  // Export to namespace
  window.GeoLeaf.POI.AddForm.SubmitHandler = FormSubmitHandler;

  window.GeoLeaf.Log?.debug('FormSubmitHandler module loaded');
})(window);
