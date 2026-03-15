/**
 * @module config/config-primitives
 * @description Re-export of the interface public de Config pour consommation
 * by the business modules (POI, Storage, UI, Labels, Themes…).
 *
 * Phase 10-C — Pattern B : remplace le couplage runtime par import ESM direct de Config.
 *
 * RECOMMENDED USAGE:
 *   import { Config } from '../config/config-primitives.js';
 *
 * DIRECT EQUIVALENT:
 *   import { Config } from '../config/geoleaf-config/config-core.js';
 */

export { Config } from "./geoleaf-config/config-core.js";
