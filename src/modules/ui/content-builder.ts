/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * GeoLeaf UI Module - Content Builder
 *
 * # SHIM LEGACY — backward compatibility paths plats
 * Re-exporte les sous-modules du folder content-builder/ depuis
 * le path plat ui/content-builder.js (ancienne structure).
 *
 * @module ui/content-builder
 * @see src/modules/ui/content-builder/
 */

export { ContentBuilderCore } from "./content-builder/core.js";
export { Helpers as ContentBuilderHelpers } from "./content-builder/helpers.js";
export { ContentBuilderShared } from "./content-builder/renderers-shared.js";
export { Templates as ContentBuilderTemplates } from "./content-builder/templates.js";
export { Assemblers as ContentBuilderAssemblers } from "./content-builder/assemblers.js";
