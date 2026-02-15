/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf POI Module - Side Panel
 * Gestion du panneau latéral d'affichage détaillé des POI
 * TODO Phase 4: Découper fonctions complexes en sous-fonctions <80 lignes
 */
(function (global) {
    "use strict";

    const GeoLeaf = (global.GeoLeaf = global.GeoLeaf || {});
    const Log = GeoLeaf.Log;

    /**
     * Shorthand for createElement
     */
    const $create = (tag, props, ...children) => {
        return GeoLeaf.Utils && GeoLeaf.Utils.createElement
            ? GeoLeaf.Utils.createElement(tag, props, ...children)
            : document.createElement(tag);
    };

    GeoLeaf._POISidePanel = GeoLeaf._POISidePanel || {};

    // Référence au module shared
    const getShared = () => GeoLeaf._POIShared;
    const getRenderers = () => GeoLeaf._POIRenderers;

    /**
     * Crée l'élément DOM du panneau latéral si non existant.
     */
    function createSidePanel() {
        const shared = getShared();
        if (!shared) return;
        const state = shared.state;

        if (state.sidePanelElement) return; // Déjà créé

        // Créer l'overlay
        const overlay = $create('div', {
            className: 'gl-poi-sidepanel-overlay',
            attributes: { 'aria-hidden': 'true' }
        });
        // Ajouter à .gl-main pour support du mode plein écran
        const glMain = document.querySelector('.gl-main');
        if (glMain) {
            glMain.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
        state.sidePanelOverlay = overlay;

        // Créer le panneau
        const panel = $create('aside', {
            className: 'gl-poi-sidepanel',
            attributes: {
                'aria-hidden': 'true',
                'role': 'complementary'
            }
        });

        // Créer le header avec bouton fermer
        const header = $create('div', { className: 'gl-poi-sidepanel__header' });
        const closeBtn = $create('button', {
            className: 'gl-poi-sidepanel__close',
            attributes: { 'aria-label': 'Fermer' },
            textContent: '×',
            onClick: closeSidePanel
        });
        header.appendChild(closeBtn);

        // Créer le content
        const content = $create('div', { className: 'gl-poi-sidepanel__content' });

        panel.appendChild(header);
        panel.appendChild(content);
        // Ajouter à .gl-main pour support du mode plein écran
        if (glMain) {
            glMain.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }
        state.sidePanelElement = panel;
        state.sidePanelContent = content;

        // Event listeners
        overlay.addEventListener('click', closeSidePanel);

        if (Log) Log.info('[POI] Side panel créé.');
    }

    /**
     * Ouvre le panneau latéral avec les infos complètes du POI.
     *
     * @param {object} poi - Données complètes du POI.
     * @param {object} customLayout - Layout personnalisé (optionnel).
     * @returns {Promise<void>}
     */
    async function openSidePanel(poi, customLayout) {
        console.log('[SIDEPANEL-OPEN] openSidePanel called for POI:', poi?.id || poi?.name);
        if (!poi) {
            console.log('[SIDEPANEL-OPEN] ERROR: POI is null/undefined');
            if (Log) Log.warn('[POI] openSidePanel() : POI invalide.');
            return;
        }

        if (Log) {
            Log.debug('[POI] openSidePanel:', poi.id || poi.name);
        }

        const shared = getShared();
        if (!shared) {
            console.log('[SIDEPANEL-OPEN] ERROR: shared is null');
            return;
        }
        const state = shared.state;

        // S'assurer que le panneau existe
        if (!state.sidePanelElement) {
            console.log('[SIDEPANEL-OPEN] Creating side panel element');
            createSidePanel();
        }

        if (!state.sidePanelElement) {
            console.log('[SIDEPANEL-OPEN] ERROR: sidePanelElement still null after creation');
            if (Log) Log.error('[POI] openSidePanel() : Impossible de créer le panneau latéral.');
            return;
        }

        state.currentPoiInPanel = poi;
        state.currentGalleryIndex = 0;

        // Peupler le panneau (la lightbox sera créée par renderers.js si nécessaire)
        const renderers = getRenderers();
        console.log('[SIDEPANEL-OPEN] renderers:', !!renderers, '- populateSidePanel:', typeof renderers?.populateSidePanel);
        if (renderers && typeof renderers.populateSidePanel === 'function') {
            console.log('[SIDEPANEL-OPEN] Calling renderers.populateSidePanel');
            await renderers.populateSidePanel(poi, customLayout);
            console.log('[SIDEPANEL-OPEN] populateSidePanel completed');
        } else {
            console.log('[SIDEPANEL-OPEN] ERROR: renderers.populateSidePanel not available');
        }

        // Afficher l'overlay et le panneau avec animation
        if (state.sidePanelOverlay) {
            state.sidePanelOverlay.classList.add('open');
        }
        state.sidePanelElement.classList.add('open');
        state.sidePanelElement.setAttribute('aria-hidden', 'false');

        // Ajouter classe au body pour décaler la carte
        document.body.classList.add('gl-poi-sidepanel-open');

        if (Log) Log.info('[POI] Panneau latéral ouvert pour :', poi.title || poi.name || poi.label);
    }

    /**
     * Ferme le panneau latéral.
     */
    function closeSidePanel() {
        const shared = getShared();
        if (!shared) return;
        const state = shared.state;

        if (!state.sidePanelElement) return;

        state.sidePanelElement.classList.remove('open');
        state.sidePanelElement.setAttribute('aria-hidden', 'true');

        if (state.sidePanelOverlay) {
            state.sidePanelOverlay.classList.remove('open');
        }

        // Retirer classe du body
        document.body.classList.remove('gl-poi-sidepanel-open');

        // Nettoyer la lightbox globale
        const lightbox = document.querySelector('.gl-poi-lightbox-global');
        if (lightbox) {
            lightbox.remove();
        }

        state.currentPoiInPanel = null;

        if (Log) Log.info('[POI] Panneau latéral fermé.');
    }

    /**
     * Alias pour fermer le panneau (API publique).
     */
    function hideSidePanel() {
        closeSidePanel();
    }

    // ========================================
    //   EXPORT
    // ========================================

    GeoLeaf._POISidePanel = {
        createSidePanel,
        openSidePanel,
        closeSidePanel,
        hideSidePanel
    };

})(typeof window !== "undefined" ? window : global);
