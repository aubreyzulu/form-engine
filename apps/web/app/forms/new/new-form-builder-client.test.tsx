import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewFormBuilderClient } from '@/app/forms/new/new-form-builder-client';
import { BUILDER_MODE_TOUR_STORAGE_KEY } from '@/app/forms/new/builder-mode-tour';
import { fieldType } from '@/app/forms/new/field-types';
import { formsKeys } from '@/lib/query-keys';

const refresh = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
}));

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockResizeObserver() {
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = vi.fn();
}

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithQueryClient(
  props: ComponentProps<typeof NewFormBuilderClient> = {},
  queryClient = createTestQueryClient(),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <NewFormBuilderClient {...props} />
    </QueryClientProvider>,
  );
}

function okResponse(body: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function errorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ message }),
  } as unknown as Response;
}

describe('NewFormBuilderClient', () => {
  beforeEach(() => {
    mockMatchMedia();
    mockResizeObserver();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
    window.localStorage.setItem(BUILDER_MODE_TOUR_STORAGE_KEY, 'seen');
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-4234-9234-123456789abc');
    refresh.mockClear();
    push.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it('saves a draft through the forms API and disables repeated saves after success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"key":"ownership-declaration-12345678"'),
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '"Ownership Declaration" was saved as a draft.',
    );
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('publishes after creating the draft', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/forms/ownership-declaration-12345678/versions/1/publish',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('"Ownership Declaration" was published.');
    expect(push).toHaveBeenCalledWith('/forms');
  });

  it('updates an existing draft before publishing after draft edits', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('Form description'), 'Updated disclosure form');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/forms/ownership-declaration-12345678/versions/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      name: 'Ownership Declaration',
      description: 'Updated disclosure form',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:4000/api/v1/forms/ownership-declaration-12345678/versions/1/publish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retries publishing an already-created draft without creating a duplicate form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(errorResponse(500, 'Publish failed'))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/forms',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/forms/ownership-declaration-12345678/versions/1/publish',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:4000/api/v1/forms/ownership-declaration-12345678/versions/1/publish',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('previews the current builder fields without saving', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(screen.getByLabelText('Form name'), 'Supplier Check');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    await user.click(screen.getByRole('button', { name: 'Live preview' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Supplier Check');
    expect(screen.getByRole('dialog')).toHaveTextContent('Short Text');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves edits to a hydrated draft without creating a duplicate form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const versionKey = formsKeys.version('supplier-check', 3);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(versionKey, {
      id: 'version-3',
      updatedAt: '2026-06-28T10:00:00.000Z',
    });

    renderWithQueryClient(
      {
        draftIdentity: { key: 'supplier-check', version: 3 },
        initialValue: {
          name: 'Supplier Check',
          description: '',
          fields: [
            {
              id: 'field-1',
              key: 'supplierName',
              label: 'Supplier name',
              type: fieldType('short-text'),
              required: true,
            },
          ],
        },
      },
      queryClient,
    );

    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();

    await user.type(screen.getByLabelText('Form description'), 'Updated draft');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms/supplier-check/versions/3',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(queryClient.getQueryState(versionKey)?.isInvalidated).toBe(true);
  });
});
