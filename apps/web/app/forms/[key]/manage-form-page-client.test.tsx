import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageFormPageClient } from '@/app/forms/[key]/manage-form-page-client';

const push = vi.hoisted(() => vi.fn());
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
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

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ManageFormPageClient formKey="ownership-declaration" />
    </QueryClientProvider>,
  );
}

function getVersionHistory() {
  return within(screen.getByRole('region', { name: 'Version history' }));
}

function getVersionRow(version: string) {
  return within(getVersionHistory().getByRole('article', { name: `Version ${version}` }));
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

function mockFetchRoutes(routes: Record<string, Response[]>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const route = Object.keys(routes).find((path) => url.endsWith(path));
    if (!route) return Promise.reject(new Error(`Unhandled request: ${url}`));
    const response = routes[route]?.shift();
    if (!response) return Promise.reject(new Error(`No mock response left for: ${url}`));
    return Promise.resolve(response);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const draftManageResponse = {
  id: 'form-1',
  key: 'ownership-declaration',
  name: 'Ownership Declaration',
  description: 'Collect beneficial ownership details.',
  publishedVersion: null,
  submissionCount: 12,
  version: {
    version: 2,
    status: 'DRAFT',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        country: { type: 'string', enum: ['GB', 'ZM'] },
      },
      required: ['fullName'],
      additionalProperties: false,
    },
    uiSchema: {
      order: ['country', 'fullName'],
      fields: {
        fullName: { widget: 'text', label: 'Full legal name' },
        country: { widget: 'select', label: 'Country' },
      },
    },
    publishedAt: null,
    createdAt: '2026-06-28T10:00:00.000Z',
  },
};

const publishedManageResponse = {
  ...draftManageResponse,
  publishedVersion: 2,
  version: {
    ...draftManageResponse.version,
    status: 'PUBLISHED',
    publishedAt: '2026-06-28T11:00:00.000Z',
  },
};

const draftWithLiveVersionResponse = {
  ...draftManageResponse,
  publishedVersion: 1,
};

const draftVersionsResponse = [
  {
    id: 'version-1',
    formId: 'form-1',
    version: 1,
    status: 'PUBLISHED',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        acceptedTerms: { type: 'boolean' },
      },
      required: ['fullName'],
      additionalProperties: false,
    },
    uiSchema: {
      order: ['fullName', 'acceptedTerms'],
      fields: {
        fullName: { widget: 'text', label: 'Full legal name' },
        acceptedTerms: { widget: 'checkbox', label: 'Terms accepted' },
      },
    },
    publishedAt: '2026-06-27T10:00:00.000Z',
    createdAt: '2026-06-27T09:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
  },
  {
    id: 'version-2',
    formId: 'form-1',
    version: 2,
    status: 'DRAFT',
    schema: draftManageResponse.version.schema,
    uiSchema: draftManageResponse.version.uiSchema,
    publishedAt: null,
    createdAt: '2026-06-28T10:00:00.000Z',
    updatedAt: '2026-06-28T10:00:00.000Z',
  },
];

const publishedVersionsResponse = [
  draftVersionsResponse[0],
  {
    ...draftVersionsResponse[1],
    status: 'PUBLISHED',
    publishedAt: '2026-06-28T11:00:00.000Z',
    updatedAt: '2026-06-28T11:00:00.000Z',
  },
];

const versionOneSchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string' },
    country: { type: 'string', enum: ['GB', 'ZM'] },
    acceptedTerms: { type: 'boolean' },
  },
  required: ['fullName', 'acceptedTerms'],
  additionalProperties: false,
};

const versionOneUiSchema = {
  order: ['fullName', 'country', 'acceptedTerms'],
  fields: {
    fullName: { widget: 'text', label: 'Full legal name' },
    country: { widget: 'select', label: 'Country' },
    acceptedTerms: { widget: 'checkbox', label: 'Terms accepted' },
  },
};

const versionTwoSchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string' },
    country: { type: 'string', enum: ['GB', 'US', 'ZM'] },
    reviewNote: { type: 'string' },
  },
  required: ['fullName', 'country'],
  additionalProperties: false,
};

const versionTwoUiSchema = {
  order: ['fullName', 'country', 'reviewNote'],
  fields: {
    fullName: { widget: 'text', label: 'Applicant legal name' },
    country: { widget: 'select', label: 'Registration country' },
    reviewNote: { widget: 'textarea', label: 'Reviewer note' },
  },
};

const submissionsResponse = {
  items: [
    {
      id: 'submission-1',
      formVersionId: 'version-1',
      formVersion: { version: 1, schema: versionOneSchema, uiSchema: versionOneUiSchema },
      data: { fullName: 'Ada Lovelace', country: 'GB', acceptedTerms: true },
      createdAt: '2026-06-28T12:00:00.000Z',
    },
  ],
  total: 1,
  skip: 0,
  take: 50,
};

const multipleSubmissionsResponse = {
  items: [
    submissionsResponse.items[0],
    {
      id: 'submission-2',
      formVersionId: 'version-2',
      formVersion: { version: 2, schema: versionTwoSchema, uiSchema: versionTwoUiSchema },
      data: { fullName: 'Grace Hopper', country: 'US', reviewNote: 'Needs follow-up' },
      createdAt: '2026-06-28T13:00:00.000Z',
    },
  ],
  total: 2,
  skip: 0,
  take: 50,
};

const emptySubmissionsResponse = {
  items: [],
  total: 0,
  skip: 0,
  take: 50,
};

describe('ManageFormPageClient', () => {
  beforeEach(() => {
    mockMatchMedia();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
    push.mockClear();
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

  it('shows a loading state while the latest form config is being fetched', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );

    renderWithQueryClient();

    expect(screen.getByRole('status', { name: 'Loading form' })).toBeInTheDocument();
  });

  it('renders the authoring response as a friendly field summary', async () => {
    const fetchMock = mockFetchRoutes({
      '/forms/ownership-declaration/manage': [okResponse(draftManageResponse)],
      '/forms/ownership-declaration/versions': [okResponse(draftVersionsResponse)],
      '/forms/ownership-declaration/submissions': [okResponse(submissionsResponse)],
    });

    renderWithQueryClient();

    expect(
      await screen.findByRole('heading', { name: 'Ownership Declaration' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 required')).toBeInTheDocument();
    expect(screen.queryByText('Latest configuration')).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Country' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'country' })).not.toBeInTheDocument();
    const latestVersionRow = getVersionRow('v2');
    expect(latestVersionRow.getByRole('heading', { name: 'v2' })).toBeInTheDocument();
    expect(latestVersionRow.getByText('Latest')).toBeInTheDocument();
    expect(latestVersionRow.getByText(/2 fields/)).toHaveTextContent('1 required');
    expect(screen.getAllByText(/fullName: Ada Lovelace/)).toHaveLength(2);
    expect(screen.getAllByText(/acceptedTerms: Yes/)).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Response detail' })).not.toBeInTheDocument();
    expect(screen.queryByText('Form version v1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No live form' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Responses' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Officer')).not.toBeInTheDocument();
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms/ownership-declaration/manage',
      expect.any(Object),
    );
  });

  it('opens a selected response detail from the submissions table', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      '/forms/ownership-declaration/manage': [okResponse(draftManageResponse)],
      '/forms/ownership-declaration/versions': [okResponse(draftVersionsResponse)],
      '/forms/ownership-declaration/submissions': [okResponse(multipleSubmissionsResponse)],
    });

    renderWithQueryClient();

    expect(await screen.findAllByText(/fullName: Ada Lovelace/)).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    await user.click(viewButtons[1]!);

    const detail = await screen.findByRole('dialog');
    expect(detail).toHaveTextContent('Response detail');
    expect(detail).toHaveTextContent('Grace Hopper');
    expect(detail).toHaveTextContent('Applicant legal name');
    expect(detail).toHaveTextContent('Registration country');
    expect(detail).toHaveTextContent('Reviewer note');
    expect(detail).toHaveTextContent('Form version v2');
    expect(screen.getByText('Needs follow-up')).toBeInTheDocument();
  });

  it('shows an error state and retries both authoring queries', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes({
      '/forms/ownership-declaration/manage': [
        errorResponse(500, 'Could not load this form.'),
        okResponse(draftManageResponse),
      ],
      '/forms/ownership-declaration/versions': [
        okResponse(draftVersionsResponse),
        okResponse(draftVersionsResponse),
      ],
      '/forms/ownership-declaration/submissions': [
        errorResponse(500, 'Could not load submissions.'),
        okResponse(emptySubmissionsResponse),
      ],
    });

    renderWithQueryClient();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this form.');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(
      await screen.findByRole('heading', { name: 'Ownership Declaration' }),
    ).toBeInTheDocument();
  });

  it('keeps the live form link visible when the latest version is a draft', async () => {
    mockFetchRoutes({
      '/forms/ownership-declaration/manage': [okResponse(draftWithLiveVersionResponse)],
      '/forms/ownership-declaration/versions': [okResponse(draftVersionsResponse)],
      '/forms/ownership-declaration/submissions': [okResponse(emptySubmissionsResponse)],
    });

    renderWithQueryClient();

    expect(
      await screen.findByRole('heading', { name: 'Ownership Declaration' }),
    ).toBeInTheDocument();
    expect(getVersionRow('v1').getByRole('link', { name: 'Open live form' })).toHaveAttribute(
      'href',
      '/f/ownership-declaration',
    );
    expect(getVersionRow('v1').getByText('Current live')).toBeInTheDocument();
    expect(getVersionRow('v2').getByRole('link', { name: 'Edit draft' })).toHaveAttribute(
      'href',
      '/forms/ownership-declaration/edit?version=2',
    );
  });

  it('publishes a draft version and refreshes the latest config', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes({
      '/forms/ownership-declaration/manage': [
        okResponse(draftManageResponse),
        okResponse(publishedManageResponse),
      ],
      '/forms/ownership-declaration/versions': [
        okResponse(draftVersionsResponse),
        okResponse(publishedVersionsResponse),
      ],
      '/forms/ownership-declaration/submissions': [okResponse(emptySubmissionsResponse)],
      '/forms/ownership-declaration/versions/2/publish': [okResponse({})],
    });

    renderWithQueryClient();

    await screen.findByRole('heading', { name: 'Ownership Declaration' });
    await user.click(screen.getByRole('button', { name: 'Publish draft' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms/ownership-declaration/versions/2/publish',
      expect.objectContaining({ method: 'POST' }),
    );
    await waitFor(() => expect(screen.getAllByText('Published').length).toBeGreaterThan(1));
  });

  it('creates a new draft from a published form before editing', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes({
      '/forms/ownership-declaration/manage': [
        okResponse(publishedManageResponse),
        okResponse(draftManageResponse),
      ],
      '/forms/ownership-declaration/versions': [
        okResponse(publishedVersionsResponse),
        okResponse({ version: 3 }),
        okResponse(draftVersionsResponse),
      ],
      '/forms/ownership-declaration/submissions': [okResponse(emptySubmissionsResponse)],
    });

    renderWithQueryClient();

    await screen.findByRole('heading', { name: 'Ownership Declaration' });
    expect(getVersionRow('v2').getByRole('link', { name: 'Open live form' })).toHaveAttribute(
      'href',
      '/f/ownership-declaration',
    );
    await user.click(screen.getByRole('button', { name: 'Edit as draft' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/forms/ownership-declaration/versions',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/forms/ownership-declaration/edit?version=3');
  });
});
