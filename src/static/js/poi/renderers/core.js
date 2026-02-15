/**
 * GeoLeaf POI Module - Renderers Core
 * Orchestrateur principal pour le rendu du side panel POI
 * Phase 6.2 - Version refactorisée (837 LOC → ~140 LOC)
 *
 * Architecture modulaire:
 * - lightbox-manager.js: Gestion lightbox
 * - ui-behaviors.js: Comportements UI (accordéons, galerie)
 * - component-renderers.js: Renderers composants (badges, links, lists, tables, tags)
 * - section-orchestrator.js: Dispatcher de sections + extraction valeurs
 * - field-renderers-v2.js: Renderers texte
 * - media-renderers-v2.js: Renderers media
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    GeoLeaf._POIRenderers = GeoLeaf._POIRenderers || {};

    // Référence aux modules POI
    const getShared = () => GeoLeaf._POIShared;
    const getNormalizers = () => GeoLeaf._POINormalizers;

    // Initialiser les nouveaux modules
    let sectionOrchestrator = null;
    let lightboxManager = null;
    let uiBehaviors = null;

    /**
     * Initialise les modules (lazy loading)
     * @private
     */
    function _initModules() {
        if (!sectionOrchestrator && GeoLeaf.SectionOrchestrator) {
            sectionOrchestrator = new GeoLeaf.SectionOrchestrator();
        }
        if (!lightboxManager) {
            lightboxManager = GeoLeaf._lightboxManager || (GeoLeaf.LightboxManager ? new GeoLeaf.LightboxManager() : null);
        }
        if (!uiBehaviors) {
            uiBehaviors = GeoLeaf._POIUIBehaviors;
        }
    }

    /**
     * Peuple le side panel avec les données du POI en utilisant le layout JSON.
     *
     * @param {object} poi - POI normalisé.
     * @param {object} customLayout - Layout personnalisé (optionnel).
     * @returns {Promise<void>}
     */
    async function populateSidePanel(poi, customLayout) {
        console.log('[SIDEPANEL] populateSidePanel called for POI:', poi?.title || poi?.label);
        // Initialiser les modules
        _initModules();

        const shared = getShared();
        if (!shared) {
            console.log('[SIDEPANEL] ERROR: shared is null');
            return;
        }
        const state = shared.state;

        if (!state.sidePanelElement) {
            console.log('[SIDEPANEL] ERROR: sidePanelElement not found');
            return;
        }

        const contentDiv = state.sidePanelElement.querySelector('.gl-poi-sidepanel__content');
        if (!contentDiv) return;

        // Clear contenu précédent
        GeoLeaf.DOMSecurity.clearElementFast(contentDiv);

        // Normaliser le POI
        const normalizers = getNormalizers();
        const normalized = normalizers ? normalizers.normalizePoi(poi) : poi;

        if (Log) {
            Log.debug('[POI] POI normalisé:', normalized.title || normalized.label);
            Log.debug('[POI] Champs attributes disponibles:', Object.keys(normalized.attributes || {}));
        }

        // Récupérer le layout depuis la config du profile
        let layout = customLayout;

        // ✅ PRIORITÉ 1: Vérifier si le POI a une configuration sidepanel attachée (depuis sa couche)
        if (!layout && normalized._sidepanelConfig && normalized._sidepanelConfig.detailLayout) {
            layout = normalized._sidepanelConfig.detailLayout;
            if (Log) Log.info('[POI] Layout récupéré depuis la configuration de couche attachée au POI');
        }

        // ✅ PRIORITÉ 2: Essayer de récupérer depuis le profil actif
        if (!layout) {
            const Config = GeoLeaf.Config;
            if (Config && typeof Config.getActiveProfile === 'function') {
                const activeProfile = Config.getActiveProfile();
                if (activeProfile && activeProfile.panels && activeProfile.panels.detail) {
                    layout = activeProfile.panels.detail.layout;
                    if (Log) Log.info('[POI] Layout récupéré depuis le profil actif:', activeProfile.id || 'unknown');
                }
            }
        }

        // Fallback sur poiConfig si disponible
        if (!layout && state.poiConfig?.panels?.detail?.layout) {
            layout = state.poiConfig.panels.detail.layout;
        }

        // Si toujours pas de layout, utiliser le layout par défaut
        if (!layout || layout.length === 0) {
            if (Log) Log.warn('[POI] Aucun layout trouvé, utilisation du layout par défaut');
            layout = _getDefaultLayout();
        }

        // ✅ IMPORTANT: Trier les sections par leur propriété 'order' (si définie)
        const sortedLayout = [...layout].sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : 999;
            const orderB = typeof b.order === 'number' ? b.order : 999;
            return orderA - orderB;
        });

        if (Log) Log.info('[POI] Génération du side panel avec', sortedLayout.length, 'sections');

        // Body du panneau
        const body = document.createElement('div');
        body.className = 'gl-poi-sidepanel__body';
        console.log('[SIDEPANEL] Body created, will process', sortedLayout.length, 'sections');

        // Générer chaque section selon le layout trié (déléguer à SectionOrchestrator)
        for (const section of sortedLayout) {
            try {
                const element = sectionOrchestrator
                    ? await sectionOrchestrator.renderSection(section, normalized, state)
                    : null;

                if (element) {
                    body.appendChild(element);
                    console.log('[SIDEPANEL] ✓ Section added:', section.label || section.type);
                    if (Log) Log.info('[POI] ✓ Section ajoutée:', section.label || section.type);
                } else {
                    console.log('[SIDEPANEL] ✗ Section NULL:', section.label || section.type, '- field:', section.field);
                    if (Log) Log.warn('[POI] ✗ Section ignorée (element null):', section.label || section.type, '- field:', section.field);
                }
            } catch (error) {
                console.error('[SIDEPANEL] ERROR rendering section:', section.label, error);
                if (Log) Log.error('[POI] Erreur lors du rendu de la section:', section.label, error);
            }
        }

        console.log('[SIDEPANEL] Appending body to contentDiv. Body has', body.children.length, 'children');
        contentDiv.appendChild(body);
        console.log('[SIDEPANEL] Body appended. ContentDiv now has', contentDiv.children.length, 'children');

        // Gérer le comportement singleAccordion si configuré
        const singleAccordion = normalized._sidepanelConfig?.singleAccordion;
        if (singleAccordion === true && uiBehaviors) {
            uiBehaviors.attachSingleAccordionBehavior(body);
        }

        // Attacher les événements après le rendu
        if (uiBehaviors) {
            uiBehaviors.attachGalleryEvents(state.sidePanelElement, lightboxManager);
        }
    }

    /**
     * Retourne un layout par défaut si aucun n'est configuré.
     * @private
     */
    function _getDefaultLayout() {
        return [
            { type: 'text', field: 'title', style: 'title', accordion: false },
            { type: 'image', field: 'attributes.mainImage', variant: 'hero', accordion: false },
            { type: 'text', field: 'attributes.shortDescription', variant: 'short', accordion: false },
            { type: 'text', label: 'Informations', field: 'attributes.longDescription', variant: 'multiline', accordion: true, defaultOpen: true },
            { type: 'text', label: 'Description', field: 'attributes.description_long', variant: 'multiline', accordion: true, defaultOpen: true },
            { type: 'gallery', label: 'Galerie photos', field: 'attributes.gallery', accordion: true, defaultOpen: true },
            { type: 'list', label: 'Prix', field: 'attributes.price', accordion: true, defaultOpen: false },
            { type: 'reviews', label: 'Avis récents', field: 'attributes.reviews.recent', maxCount: 5, accordion: true, defaultOpen: false },
            { type: 'tags', label: 'Tags', field: 'attributes.tags', accordion: false },
            { type: 'link', label: 'Visiter le site web →', field: 'attributes.website', accordion: false }
        ];
    }

    // Export public dans un namespace séparé pour éviter d'écraser l'agrégateur
    GeoLeaf._POIRenderersCore = {
        populateSidePanel
    };

})(typeof window !== "undefined" ? window : global);
