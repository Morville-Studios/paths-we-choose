import { afterEach, describe, expect, it, vi } from 'vitest';
import { findNewRelease } from '../updates';

const current = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const next = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
afterEach(() => { vi.unstubAllGlobals(); });

describe('release checks', () => {
  it('detects a new deployment or rollback without using the browser cache', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildId: next }) });
    vi.stubGlobal('fetch', request);
    expect(await findNewRelease(current)).toBe(next);
    expect(request).toHaveBeenCalledWith('/version.json', expect.objectContaining({ cache: 'no-store' }));
  });

  it.each([null, {}, { buildId: current }, { buildId: 123 }, { buildId: '<html>' }])('ignores an unchanged or invalid manifest: %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    expect(await findNewRelease(current)).toBeNull();
  });

  it('leaves the game alone on network failures, HTTP errors, or fallback HTML', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('HTML'); } });
    vi.stubGlobal('fetch', request);
    for (let i = 0; i < 3; i++) expect(await findNewRelease(current)).toBeNull();
  });
});
