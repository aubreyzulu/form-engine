import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormsPageClient } from '@/app/forms/forms-page-client';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

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

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FormsPageClient />
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

function errorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: { message } }),
  } as unknown as Response;
}

const apiForms = [
  {
    id: 'form-1',
    key: 'beneficial-ownership-declaration',
    name: 'Beneficial Ownership Declaration',
    description: null,
    status: 'PUBLISHED',
    latestVersion: 3,
    publishedVersion: 3,
    publishedAt: '2026-06-28T10:00:00.000Z',
    submissionCount: 128,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-28T10:00:00.000Z',
  },
  {
    id: 'form-2',
    key: 'director-details-update',
    name: 'Director Details Update',
    description: null,
    status: 'DRAFT',
    latestVersion: 1,
    publishedVersion: null,
    publishedAt: null,
    submissionCount: 0,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
  },
];

describe('FormsPageClient', () => {
  beforeEach(() => {
    mockMatchMedia();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it('shows a loading state while forms are being fetched', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );

    renderWithQueryClient();

    expect(screen.getByRole('status', { name: 'Loading forms' })).toBeInTheDocument();
  });

  it('renders API forms and filters them by status', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse(apiForms));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    expect(await screen.findByText('Beneficial Ownership Declaration')).toBeInTheDocument();
    expect(screen.getByText('Director Details Update')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open live form' })).toHaveAttribute(
      'href',
      '/f/beneficial-ownership-declaration',
    );
    expect(screen.getByText('No live form')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms',
      expect.any(Object),
    );

    await user.click(screen.getByRole('button', { name: 'Published' }));

    expect(screen.getByText('Beneficial Ownership Declaration')).toBeInTheDocument();
    expect(screen.queryByText('Director Details Update')).not.toBeInTheDocument();
  });

  it('shows an error state and retries the forms query', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(500, 'Could not load forms.'))
      .mockResolvedValueOnce(okResponse(apiForms));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load forms.');
    expect(screen.queryByText('No matching forms')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Adjust your search or status filter to find a form.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Beneficial Ownership Declaration')).toBeInTheDocument();
  });
});
