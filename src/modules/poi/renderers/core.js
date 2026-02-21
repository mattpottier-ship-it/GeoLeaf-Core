/**
 * GeoLeaf POI Module - Renderers Core
 * Orchestrateur principal pour le rendu du side panel POI
 * Phase 6.2 - Version refactorisÃƒÂ©e (837 LOC Ã¢â€ â€™ ~140 LOC)
 *
 * Architecture modulaire:
 * - lightbox-manager.js: Gestion lightbox
 * - ui-behaviors.js: Comportements UI (accordÃƒÂ©ons, galerie)
 * - component-renderers.js: Renderers composants (badges, links, lists, tables, tags)
 * - section-orchestrator.js: Dispatcher de sections + extraction valeurs
 * - field-renderers-v2.js: Renderers texte
 * - media-renderers-v2.js: Renderers media
 */
import { Log } from '../../log/index.js';
import { Config } from '../../config/config-primitives.js';
import { POIShared } from '../shared.js';
import { POINormalizers } from '../normalizers.js';
import { compareByOrder } from '../../utils/general-utils.js';
import { SectionOrchestrator } from './section-orchestrator.js';
import { LightboxManager } from './lightbox-manager.js';
import { UIBehaviors } from './ui-behaviors.js';
import { DOMSecurity } from '../../utils/dom-security.js';

// Initialiser les nouveaux modules
let sectionOrchestrator = null;
let lightboxManager = null;
let uiBehaviors = null;

/**
 * Initialise les modules (lazy loading)
 * @private
 */
function _initModules() {
    if (!sectionOrchestrator) {
        sectionOrchestrator = new SectionOrchestrator();
    }
    if (!lightboxManager) {
        lightboxManager = new LightboxManager();
    }
    if (!uiBehaviors) {
        uiBehaviors = UIBehaviors;
    }
}

/**
 * Peuple le side panel avec les donnÃƒÂ©es du POI en utilisant le layout JSON.
 *
 * @param {object} poi - POI normalisÃƒÂ©.
 * @param {object} customLayout - Layout personnalisÃƒÂ© (optionnel).
 * @returns {Promise<void>}
 */
async function populateSidePanel(poi, customLayout) {
    // Initialiser les modules
    _initModules();

    const shared = POIShared;
    if (!shared) {
        if (Log) Log.error('[POI] populateSidePanel : shared is null');
        return;
    }
    const state = shared.state;

    if (!state.sidePanelElement) {
        if (Log) Log.error('[POI] populateSidePanel : sidePanelElement not found');
        return;
    }

    const contentDiv = state.sidePanelElement.querySelector('.gl-poi-sidepanel__content');
    if (!contentDiv) return;

    // Clear contenu précédent + réinitialiser le flag de galerie pour que les
    // événements soient bien rattachés aux nouveaux éléments DOM
    DOMSecurity.clearElementFast(contentDiv);
    delete state.sidePanelElement._galleryEventsAttached;

    // Normaliser le POI
    const normalizers = POINormalizers;
    const normalized = normalizers ? normalizers.normalizePoi(poi) : poi;

    if (Log) {
        Log.debug('[POI] POI normalisÃƒÂ©:', normalized.title || normalized.label);
        Log.debug('[POI] Champs attributes disponibles:', Object.keys(normalized.attributes || {}));
    }

    // RÃƒÂ©cupÃƒÂ©rer le layout depuis la config du profile
    let layout = customLayout;

    // Ã¢Å“â€¦ PRIORITÃƒâ€° 1: VÃƒÂ©rifier si le POI a une configuration sidepanel attachÃƒÂ©e (depuis sa couche)
    if (!layout && normalized._sidepanelConfig && normalized._sidepanelConfig.detailLayout) {
        layout = normalized._sidepanelConfig.detailLayout;
        if (Log) Log.info('[POI] Layout rÃƒÂ©cupÃƒÂ©rÃƒÂ© depuis la configuration de couche attachÃƒÂ©e au POI');
    }

    // Ã¢Å“â€¦ PRIORITÃƒâ€° 2: Essayer de rÃƒÂ©cupÃƒÂ©rer depuis le profil actif
    if (!layout) {
        if (Config && typeof Config.getActiveProfile === 'function') {
            const activeProfile = Config.getActiveProfile();
            if (activeProfile && activeProfile.panels && activeProfile.panels.detail) {
                layout = activeProfile.panels.detail.layout;
                if (Log) Log.info('[POI] Layout rÃƒÂ©cupÃƒÂ©rÃƒÂ© depuis le profil actif:', activeProfile.id || 'unknown');
            }
        }
    }

    // Fallback sur poiConfig si disponible
    if (!layout && state.poiConfig?.panels?.detail?.layout) {
        layout = state.poiConfig.panels.detail.layout;
    }

    // Si toujours pas de layout, utiliser le layout par dÃƒÂ©faut
    if (!layout || layout.length === 0) {
        if (Log) Log.warn('[POI] Aucun layout trouvÃƒÂ©, utilisation du layout par dÃƒÂ©faut');
        layout = _getDefaultLayout();
    }

    // Ã¢Å“â€¦ IMPORTANT: Trier les sections par 'order' (Phase 4 dedup)
    const sortedLayout = [...layout].sort(compareByOrder);

    if (Log) Log.info('[POI] GÃƒÂ©nÃƒÂ©ration du side panel avec', sortedLayout.length, 'sections');

    // Body du panneau
    const body = document.createElement('div');
    body.className = 'gl-poi-sidepanel__body';

    // GÃƒÂ©nÃƒÂ©rer chaque section selon le layout triÃƒÂ© (dÃƒÂ©lÃƒÂ©guer ÃƒÂ  SectionOrchestrator)
    for (const section of sortedLayout) {
        try {
            const element = sectionOrchestrator
                ? await sectionOrchestrator.renderSection(section, normalized, state)
                : null;

            if (element) {
                body.appendChild(element);
                if (Log) Log.info('[POI] Ã¢Å“â€œ Section ajoutÃƒÂ©e:', section.label || section.type);
            } else {
                if (Log) Log.warn('[POI] Ã¢Å“â€” Section ignorÃƒÂ©e (element null):', section.label || section.type, '- field:', section.field);
            }
        } catch (error) {
            console.error('[SIDEPANEL] ERROR rendering section:', section.label, error);
            if (Log) Log.error('[POI] Erreur lors du rendu de la section:', section.label, error);
        }
    }

    contentDiv.appendChild(body);

    // GÃƒÂ©rer le comportement singleAccordion si configurÃƒÂ©
    const singleAccordion = normalized._sidepanelConfig?.singleAccordion;
    if (singleAccordion === true && uiBehaviors) {
        uiBehaviors.attachSingleAccordionBehavior(body);
    }

    // Attacher les ÃƒÂ©vÃƒÂ©nements aprÃƒÂ¨s le rendu
    if (uiBehaviors) {
        uiBehaviors.attachGalleryEvents(state.sidePanelElement, lightboxManager);
    }
}

/**
 * Retourne un layout par dÃƒÂ©faut si aucun n'est configurÃƒÂ©.
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
        { type: 'reviews', label: 'Avis rÃƒÂ©cents', field: 'attributes.reviews.recent', maxCount: 5, accordion: true, defaultOpen: false },
        { type: 'tags', label: 'Tags', field: 'attributes.tags', accordion: false },
        { type: 'link', label: 'Visiter le site web Ã¢â€ â€™', field: 'attributes.website', accordion: false }
    ];
}

const RendererCore = {
    populateSidePanel
};

// Ã¢â€â‚¬Ã¢â€â‚¬ ESM Export Ã¢â€â‚¬Ã¢â€â‚¬
export { RendererCore };
