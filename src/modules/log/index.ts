/*!
 * GeoLeaf Core
 * © 2026 Mattieu Pottier
 * Released under the MIT License
 * https://geoleaf.dev
 */

/**
 * @module log
 * @description Barl — Log module public API
 */

export { Log, LEVELS } from "./logger.js";
export { configureLogging } from "./log-config.js";
// Types LogLevelName, LogImplInterface, LogConfigOptions: import from './logger.js' / './log-config.js' (avoid export type for Rollup compatibility when consumed by plugins)
