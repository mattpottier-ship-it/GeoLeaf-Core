/**
 * @module config/config-primitives
 * @description Re-export de l'interface publique de Config pour consommation
 * par les modules métier (POI, Storage, UI, Labels, Themes…).
 *
 * Phase 10-C — Pattern B : remplace le couplage runtime par import ESM direct de Config.
 *
 * POURQUOI ce fichier ?
 * La roadmap Phase 10-C prévoyait d'extraire des constantes de config (dbName,
 * version…) ici pour briser un cycle Config ↔ Storage. L'analyse statique a
 * confirmé qu'aucun cycle réel n'existe dans la base de code actuelle
 * (storage/cache/downloader.js importe déjà Config de façon statique sans cycle).
 *
 * Ce fichier est un thin re-export qui formalise le point d'entrée conseillé
 * pour les consommateurs externes, évitant de traverser deux niveaux de répertoire.
 *
 * UTILISATION RECOMMANDÉE :
 *   import { Config } from '../config/config-primitives.js';
 *
 * ÉQUIVALENT DIRECT :
 *   import { Config } from '../config/geoleaf-config/config-core.js';
 */
"use strict";

export { Config } from "./geoleaf-config/config-core.js";
