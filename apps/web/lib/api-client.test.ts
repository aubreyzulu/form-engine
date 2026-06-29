import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest, getApiUrl } from '@/lib/api-client';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

describe('getApiUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it('removes all trailing slashes from NEXT_PUBLIC_API_URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1///';

    expect(getApiUrl()).toBe('http://localhost:4000/api/v1');
  });

  it('preserves Headers instances when adding JSON content type', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/forms', {
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer token' }),
      body: JSON.stringify({ data: {} }),
    });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
