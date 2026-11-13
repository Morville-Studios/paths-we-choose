declare const __BUILD_ID__: string;

/**
 * Resolve a file from Vite's public directory against the deployed app base.
 *
 * Production hosts the game below /games/the-paths-we-choose/, while tests and
 * local development commonly use /. Keeping this rule here prevents cards,
 * icons, audio, and brand assets from silently pointing at the website root.
 * In production builds, appends `?v=<buildId>` so updated media busts Cloudflare
 * and browser caches automatically on new deployments.
 */
export function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const resolved = `${base}${path.replace(/^\/+/, '')}`;
  if (import.meta.env.PROD && typeof __BUILD_ID__ === 'string' && __BUILD_ID__) {
    const sep = resolved.includes('?') ? '&' : '?';
    return `${resolved}${sep}v=${encodeURIComponent(__BUILD_ID__)}`;
  }
  return resolved;
}
