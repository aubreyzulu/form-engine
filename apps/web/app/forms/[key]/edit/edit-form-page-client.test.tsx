import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditFormPageClient } from '@/app/forms/[key]/edit/edit-form-page-client';
import { BUILDER_MODE_TOUR_STORAGE_KEY } from '@/app/forms/new/builder-mode-tour';

const refresh = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

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

function renderWithQueryClient(version: number) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EditFormPageClient formKey="supplier-check" version={version} />
    </QueryClientProvider>,
  );
}

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('EditFormPageClient', () => {
  beforeEach(() => {
    mockMatchMedia();
    mockResizeObserver();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
    window.localStorage.setItem(BUILDER_MODE_TOUR_STORAGE_KEY, 'seen');
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('field-id-1');
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

  it('shows an actionable error when the version query param is invalid', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient(Number.NaN);

    expect(screen.getByRole('alert')).toHaveTextContent('Draft version is missing');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads a draft version and hydrates the builder from its config', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        id: 'version-3',
        formId: 'form-1',
        version: 3,
        status: 'DRAFT',
        schema: {
          title: 'Supplier Check',
          description: 'Validate supplier details.',
          type: 'object',
          properties: {
            supplierName: { type: 'string' },
          },
          required: ['supplierName'],
          additionalProperties: false,
        },
        uiSchema: {
          order: ['supplierName'],
          fields: {
            supplierName: { widget: 'text', label: 'Supplier name' },
          },
        },
        publishedAt: null,
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient(3);

    expect(await screen.findByDisplayValue('Supplier Check')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Validate supplier details.')).toBeInTheDocument();
    expect(screen.getByText('Supplier name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms/supplier-check/versions/3',
      expect.any(Object),
    );
  });

  it('refuses to edit immutable published versions directly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        id: 'version-2',
        formId: 'form-1',
        version: 2,
        status: 'PUBLISHED',
        schema: {
          title: 'Supplier Check',
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        uiSchema: {},
        publishedAt: '2026-06-28T10:00:00.000Z',
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient(2);

    expect(await screen.findByRole('alert')).toHaveTextContent('Version is not editable');
    expect(screen.getByRole('link', { name: 'Back to form' })).toHaveAttribute(
      'href',
      '/forms/supplier-check',
    );
  });
});
