declare const __BUILD_ID__: string;
import { localizePlayerText } from './i18n/presentation';

/** Failed requests or SPA fallback HTML must never masquerade as a release. */
export async function findNewRelease(currentBuildId: string): Promise<string | null> {
  try {
    const cacheBust = Date.now().toString(36);
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${cacheBust}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null || !('buildId' in data)) return null;
    const id = data.buildId;
    return typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id) && id !== currentBuildId ? id : null;
  } catch {
    return null;
  }
}

/** Clears Cache Storage entries and Service Worker registrations scoped to this app. */
export async function clearScopedCachesAndWorkers(): Promise<void> {
  const basePath = new URL(import.meta.env.BASE_URL || '/', window.location.origin).pathname;

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await window.caches.open(cacheName);
        const requests = await cache.keys();
        const scoped = requests.filter((request) => {
          const url = new URL(request.url);
          return url.origin === window.location.origin && url.pathname.startsWith(basePath);
        });
        await Promise.all(scoped.map((request) => cache.delete(request)));
      })
    );
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const scoped = registrations.filter((registration) => {
      const scope = new URL(registration.scope);
      return scope.origin === window.location.origin && scope.pathname.startsWith(basePath);
    });
    await Promise.all(scoped.map((registration) => registration.unregister()));
  }
}

/**
 * Forces a cache-bypassing reload (clearing scoped caches/workers and navigating
 * with unique `?update=<buildId>&request=<token>` query params for Cloudflare Pages).
 */
export async function forceGameUpdate(): Promise<void> {
  const requestToken = Date.now().toString(36);
  let latestBuildId = requestToken;
  try {
    await clearScopedCachesAndWorkers();
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?update=${requestToken}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const data: unknown = await response.json();
      if (typeof data === 'object' && data !== null && 'buildId' in data && typeof data.buildId === 'string') {
        latestBuildId = data.buildId;
      }
    }
  } catch {
    // Continue with a unique reload token even if cache cleanup or manifest fetch fails.
  }

  const destination = new URL(window.location.href);
  destination.searchParams.set('update', latestBuildId);
  destination.searchParams.set('request', requestToken);
  window.location.replace(destination.href);
}

export function startUpdateMonitor(hasActiveRun: () => boolean): void {
  if (!import.meta.env.PROD) return;
  let checking = false;
  let notified = false;
  const check = async (): Promise<void> => {
    if (checking || notified || document.visibilityState === 'hidden') return;
    checking = true;
    const release = await findNewRelease(__BUILD_ID__);
    checking = false;
    if (!release) return;
    notified = true;
    // Outside #app so normal game renders cannot erase the notice.
    const notice = document.createElement('aside');
    notice.className = 'release-notice';
    notice.setAttribute('role', 'status');
    const message = document.createElement('span');
    message.textContent = localizePlayerText('A game update is available. Reload when you are ready.');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = localizePlayerText('Reload to update');
    button.addEventListener('click', () => {
      if (hasActiveRun() && !window.confirm(localizePlayerText('Reload to update? Your current adventure is auto-saved, and reloading will refresh the game.'))) return;
      void forceGameUpdate();
    });
    notice.append(message, button);
    document.body.append(notice);
  };
  void check();
  window.setInterval(() => { void check(); }, 60_000);
  window.addEventListener('focus', () => { void check(); });
  document.addEventListener('visibilitychange', () => { void check(); });
}
