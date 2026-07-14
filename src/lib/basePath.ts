/**
 * Deployment base path support. Vite injects BASE_URL from its `base`
 * option (set via the BASE_PATH env var at build time): "/" when the app
 * lives at a domain root, or e.g. "/gitshipdone/" under a subpath.
 */
export const basePath = import.meta.env.BASE_URL;

/** API prefix, e.g. "/api" or "/gitshipdone/api". */
export const apiBase = `${basePath}api`;

/** React Router basename — no trailing slash; "/" at the domain root. */
export const routerBasename = basePath.replace(/\/$/, "") || "/";
