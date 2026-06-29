import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPageClient } from '@/app/dashboard/dashboard-page-client';

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
      <DashboardPageClient />
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
  {
    id: 'form-3',
    key: 'company-change',
    name: 'Company Ownership Change',
    description: null,
    status: 'PUBLISHED',
    latestVersion: 2,
    publishedVersion: 2,
    publishedAt: '2026-06-26T10:00:00.000Z',
    submissionCount: 42,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-26T10:00:00.000Z',
  },
];

describe('DashboardPageClient', () => {
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

  it('shows a loading state while dashboard forms are being fetched', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );

    renderWithQueryClient();

    expect(screen.getByRole('status', { name: 'Loading dashboard' })).toBeInTheDocument();
  });

  it('derives stats, chart rows, and recent forms from the forms API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(apiForms));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    expect(
      await screen.findByRole('link', { name: 'Beneficial Ownership Declaration' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Company Ownership Change' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Director Details Update' })).toBeInTheDocument();
    expect(screen.getByText('Published forms')).toBeInTheDocument();
    expect(screen.getByText('Draft forms')).toBeInTheDocument();
    expect(screen.getByText('Total submissions')).toBeInTheDocument();
    expect(screen.getByText('170')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beneficial Ownership Declaration' })).toHaveAttribute(
      'href',
      '/forms/beneficial-ownership-declaration',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms',
      expect.any(Object),
    );
  });

  it('shows an error state and retries the dashboard query', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(500, 'Dashboard failed.'))
      .mockResolvedValueOnce(okResponse(apiForms));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard failed.');
    expect(
      screen.queryByText('Create and publish a form to start seeing submissions.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('No forms have been created yet.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('link', { name: 'Beneficial Ownership Declaration' }),
    ).toBeInTheDocument();
  });

  it('shows empty dashboard copy when there are no forms', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([])));

    renderWithQueryClient();

    expect(
      await screen.findByText('Create and publish a form to start seeing submissions.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No forms have been created yet.')).toBeInTheDocument();
  });
});
