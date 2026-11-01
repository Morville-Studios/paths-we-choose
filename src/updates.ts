declare const __BUILD_ID__: string;

/** Failed requests or SPA fallback HTML must never masquerade as a release. */
export async function findNewRelease(currentBuildId: string): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
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
    message.textContent = 'A game update is available. Reload when you are ready.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Reload to update';
    button.addEventListener('click', () => {
      if (hasActiveRun() && !window.confirm('Reload to update? Your current adventure is not saved and will be lost. You can cancel and finish playing first.')) return;
      window.location.reload();
    });
    notice.append(message, button);
    document.body.append(notice);
  };
  void check();
  window.setInterval(() => { void check(); }, 60_000);
  window.addEventListener('focus', () => { void check(); });
  document.addEventListener('visibilitychange', () => { void check(); });
}
