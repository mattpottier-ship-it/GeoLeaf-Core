/**
 * Module shared pour LayerManager
 * STATE et utilitaires communs entre les sous-modules
 *
 * DEPENDENCIES:
 * - GeoLeaf.Log (optional)
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
 * Shared state for LayerManager (private internal)
 */
const _LayerManagerShared: any = {
    map: null,
    control: null,
    options: {
        position: "bottomright",
        title: "Legend",
        collapsible: true,
        collapsed: false,
        sections: [],
    },
};

const LMShared = _LayerManagerShared;
export { LMShared };
