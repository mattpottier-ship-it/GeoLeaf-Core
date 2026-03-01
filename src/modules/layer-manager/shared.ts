/**
 * Module partagé pour LayerManager
 * État et utilitaires communs entre les sous-modules
 *
 * DÉPENDANCES:
 * - GeoLeaf.Log (optionnel)
 *
 * EXPOSE:
 * - GeoLeaf._LayerManagerShared
 */

export interface LMSharedOptions {
    position: string;
    title: string;
    collapsible: boolean;
    collapsed: boolean;
    sections: unknown[];
}

/**
 * État partagé pour LayerManager (privé interne)
 */
const _LayerManagerShared: any = {
    map: null,
    control: null,
    options: {
        position: "bottomright",
        title: "Légende",
        collapsible: true,
        collapsed: false,
        sections: [],
    },
};

const LMShared = _LayerManagerShared;
export { LMShared };
