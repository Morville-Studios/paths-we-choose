/**
 * Resolve a file from Vite's public directory against the deployed app base.
 *
 * Production hosts the game below /games/the-paths-we-choose/, while tests and
 * local development commonly use /. Keeping this rule here prevents cards,
 * icons, audio, and brand assets from silently pointing at the website root.
 */
export function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\/+/, '')}`;
}
