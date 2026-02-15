/**
 * @fileoverview POI Add Form - Images Renderer Module
 * @description Handles image upload UI: main image and gallery with previews
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
   * Images Renderer
   * Handles image upload UI (main image and gallery)
   */
  // Ensure complete namespace exists
  if (!window.GeoLeaf) window.GeoLeaf = {};
  if (!window.GeoLeaf.POI) window.GeoLeaf.POI = {};
  if (!window.GeoLeaf.POI.AddForm) window.GeoLeaf.POI.AddForm = {};
  if (!window.GeoLeaf.POI.AddForm.Renderers) window.GeoLeaf.POI.AddForm.Renderers = {};

  window.GeoLeaf.POI.AddForm.Renderers.Images = {

    /**
     * Add images section with main image and gallery inputs
     * @param {HTMLElement} container - Parent container element
     */
    addImagesSection(container) {
      const imageUploadEnabled = window.GeoLeaf.Config?.get('imageUpload.enabled') !== false;

      if (!imageUploadEnabled) return;

      const section = document.createElement('div');
      section.className = 'gl-poi-form-section';

      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'gl-poi-form-section-title';
      sectionTitle.textContent = '📷 Images';
      section.appendChild(sectionTitle);

      // Main image
      const mainImageGroup = document.createElement('div');
      mainImageGroup.className = 'gl-poi-form-group';

      const mainImageLabel = document.createElement('label');
      mainImageLabel.htmlFor = 'poi-main-image';
      mainImageLabel.className = 'gl-poi-form-label';
      mainImageLabel.textContent = 'Image principale';
      mainImageGroup.appendChild(mainImageLabel);

      const mainImageInput = window.GeoLeaf.POI.ImageUpload
        ? window.GeoLeaf.POI.ImageUpload.createFileInput({ capture: true })
        : document.createElement('input');

      if (!window.GeoLeaf.POI.ImageUpload) {
        mainImageInput.type = 'file';
        mainImageInput.accept = 'image/*';
        mainImageInput.capture = 'environment';
      }

      mainImageInput.id = 'poi-main-image';
      mainImageInput.onchange = (e) => this.handleImageSelect(e, 'main');
      mainImageGroup.appendChild(mainImageInput);

      // Preview
      const mainImagePreview = document.createElement('div');
      mainImagePreview.id = 'poi-main-image-preview';
      mainImagePreview.className = 'gl-poi-image-preview';
      mainImageGroup.appendChild(mainImagePreview);

      section.appendChild(mainImageGroup);

      // Gallery
      const galleryGroup = document.createElement('div');
      galleryGroup.className = 'gl-poi-form-group';

      const galleryLabel = document.createElement('label');
      galleryLabel.htmlFor = 'poi-gallery-images';
      galleryLabel.className = 'gl-poi-form-label';
      galleryLabel.textContent = 'Galerie d\'images (plusieurs)';
      galleryGroup.appendChild(galleryLabel);

      const galleryInput = window.GeoLeaf.POI.ImageUpload
        ? window.GeoLeaf.POI.ImageUpload.createFileInput({ capture: true, multiple: true })
        : document.createElement('input');

      if (!window.GeoLeaf.POI.ImageUpload) {
        galleryInput.type = 'file';
        galleryInput.accept = 'image/*';
        galleryInput.capture = 'environment';
        galleryInput.multiple = true;
      }

      galleryInput.id = 'poi-gallery-images';
      galleryInput.onchange = (e) => this.handleImageSelect(e, 'gallery');
      galleryGroup.appendChild(galleryInput);

      // Preview
      const galleryPreview = document.createElement('div');
      galleryPreview.id = 'poi-gallery-preview';
      galleryPreview.className = 'gl-poi-image-preview gl-poi-image-gallery';
      galleryGroup.appendChild(galleryPreview);

      section.appendChild(galleryGroup);

      container.appendChild(section);
    },

    /**
     * Handle image selection and preview
     * @param {Event} event - Change event from file input
     * @param {string} type - Image type ('main' or 'gallery')
     */
    async handleImageSelect(event, type) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const previewId = type === 'main' ? 'poi-main-image-preview' : 'poi-gallery-preview';
      const preview = document.getElementById(previewId);
      if (!preview) return;

      // Clear preview
      GeoLeaf.DOMSecurity.clearElementFast(preview);

      // SECURITY: Validate files before processing (Phase 2)
      const validator = window.GeoLeaf.FileValidator;
      if (validator) {
        const validFiles = [];
        const errors = [];

        for (const file of Array.from(files)) {
          try {
            const result = await validator.validateFile(file, {
              maxSize: 10 * 1024 * 1024, // 10 MB for images
              allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
              checkMagicBytes: true
            });

            if (result.valid) {
              validFiles.push(file);
            } else {
              errors.push(`${file.name}: ${result.error}`);
              window.GeoLeaf.Log?.warn('[ImagesRenderer] File validation failed:', result.error);
            }
          } catch (err) {
            errors.push(`${file.name}: Erreur de validation`);
            window.GeoLeaf.Log?.error('[ImagesRenderer] File validation error:', err);
          }
        }

        // Show errors if any
        if (errors.length > 0) {
          const errorMsg = 'Certains fichiers sont invalides:\n' + errors.join('\n');
          if (window.GeoLeaf.UI && window.GeoLeaf.UI.notify) {
            window.GeoLeaf.UI.notify.error(errorMsg);
          } else {
            alert(errorMsg);
          }
        }

        // If no valid files, clear input and return
        if (validFiles.length === 0) {
          event.target.value = ''; // Clear input
          return;
        }

        // Store only valid files
        if (window.GeoLeaf.POI.AddForm.FieldsManager && window.GeoLeaf.POI.AddForm.FieldsManager.storeImageFiles) {
          window.GeoLeaf.POI.AddForm.FieldsManager.storeImageFiles(validFiles, type);
        }

        // Show previews for valid files only
        validFiles.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'gl-poi-image-preview-img';
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      } else {
        // Fallback: No validator available (should not happen in production)
        window.GeoLeaf.Log?.warn('[ImagesRenderer] FileValidator not available, skipping validation');

        // Store files - delegate to FieldsManager if available
        if (window.GeoLeaf.POI.AddForm.FieldsManager && window.GeoLeaf.POI.AddForm.FieldsManager.storeImageFiles) {
          window.GeoLeaf.POI.AddForm.FieldsManager.storeImageFiles(files, type);
        }

        // Show previews
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'gl-poi-image-preview-img';
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      }
    }

  };

  Log.info('[Renderers.Images] Module initialized');

})();
