// Single entry point the rest of the app imports for filesystem/workspace
// access. Resolves to the real Electron bridge (window.api, from preload.cjs)
// when running inside Electron, or an in-memory mock when previewed as a
// plain web page.
export { getApi } from './mockApi.js'
