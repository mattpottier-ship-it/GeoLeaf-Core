/**
 * @module config/config-primitives
 * @description Re-export de l'interface publique de Config pour consommation
 * par les modules métier (POI, Storage, UI, Labels, Themes…).
 *
 * Phase 10-C — Pattern B : remplace le couplage runtime par import ESM direct de Config.
 *
 * UTILISATION RECOMMANDÉE :
 *   import { Config } from '../config/config-primitives.js';
 *
 * ÉQUIVALENT DIRECT :
 *   import { Config } from '../config/geoleaf-config/config-core.js';
 */

export { Config } from './geoleaf-config/config-core.js';
