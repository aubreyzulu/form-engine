import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FillFormPageClient } from '@/app/f/[key]/fill-form-page-client';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

function renderWithQueryClient(formKey = 'ownership-declaration') {
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

  const view = render(
    <QueryClientProvider client={queryClient}>
      <FillFormPageClient formKey={formKey} />
    </QueryClientProvider>,
  );

  return {
    ...view,
    renderForm: (nextFormKey: string) =>
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <FillFormPageClient formKey={nextFormKey} />
        </QueryClientProvider>,
      ),
  };
}

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function errorResponse(status: number, message: string, details?: unknown[]): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: { message, details } }),
  } as unknown as Response;
}

const publishedForm = {
  id: 'form-1',
  key: 'ownership-declaration',
  name: 'Ownership Declaration',
  description: 'Submit beneficial ownership details.',
  version: 3,
  schema: {
    type: 'object',
    properties: {
      fullName: { type: 'string', minLength: 2 },
      country: { type: 'string', enum: ['GB', 'ZM'] },
      ownershipPercent: { type: 'number', minimum: 0, maximum: 100 },
    },
    required: ['fullName', 'country'],
    additionalProperties: false,
  },
  uiSchema: {
    order: ['fullName', 'country', 'ownershipPercent'],
    fields: {
      fullName: { widget: 'text', label: 'Full legal name' },
      country: {
        widget: 'select',
        label: 'Country',
        'x-options': [
          { label: 'United Kingdom', value: 'GB' },
          { label: 'Zambia', value: 'ZM' },
        ],
      },
      ownershipPercent: { widget: 'number', label: 'Ownership percent' },
    },
  },
  publishedAt: '2026-06-28T10:00:00.000Z',
};

const allInputsForm = {
  id: 'form-2',
  key: 'supplier-onboarding',
  name: 'Supplier Onboarding',
  description: 'Collect supplier compliance details.',
  version: 1,
  schema: {
    type: 'object',
    properties: {
      legalName: { type: 'string', minLength: 2 },
      contactEmail: { type: 'string', format: 'email' },
      country: { type: 'string', enum: ['GB', 'ZM'] },
      ownershipBand: { type: 'number', enum: [10, 25] },
      riskTier: { type: 'string', enum: ['low', 'medium', 'high'] },
      services: {
        type: 'array',
        items: { type: 'string', enum: ['logistics', 'consulting', 'software'] },
        minItems: 1,
        uniqueItems: true,
      },
      ownershipInterests: {
        type: 'array',
        items: { type: 'number', enum: [10, 25] },
        minItems: 1,
        uniqueItems: true,
      },
      employeeCount: { type: 'number', minimum: 1, maximum: 10000 },
      insuranceExpiry: { type: 'string', format: 'date' },
      acceptsTerms: { type: 'boolean', const: true },
      notes: { type: 'string', maxLength: 200 },
    },
    required: [
      'legalName',
      'contactEmail',
      'country',
      'ownershipBand',
      'riskTier',
      'services',
      'ownershipInterests',
      'employeeCount',
      'insuranceExpiry',
      'acceptsTerms',
    ],
    additionalProperties: false,
  },
  uiSchema: {
    order: [
      'legalName',
      'contactEmail',
      'country',
      'ownershipBand',
      'riskTier',
      'services',
      'ownershipInterests',
      'employeeCount',
      'insuranceExpiry',
      'acceptsTerms',
      'notes',
    ],
    fields: {
      legalName: { widget: 'text', label: 'Legal supplier name' },
      contactEmail: { widget: 'text', label: 'Contact email' },
      country: {
        widget: 'select',
        label: 'Country',
        'x-options': [
          { label: 'United Kingdom', value: 'GB' },
          { label: 'Zambia', value: 'ZM' },
        ],
      },
      ownershipBand: {
        widget: 'select',
        label: 'Ownership band',
        'x-options': [
          { label: '10 percent', value: 10 },
          { label: '25 percent', value: 25 },
        ],
      },
      riskTier: {
        widget: 'radio',
        label: 'Risk tier',
        'x-options': [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
      },
      services: {
        widget: 'checkboxes',
        label: 'Services provided',
        'x-options': [
          { label: 'Logistics', value: 'logistics' },
          { label: 'Consulting', value: 'consulting' },
          { label: 'Software', value: 'software' },
        ],
      },
      ownershipInterests: {
        widget: 'checkboxes',
        label: 'Ownership interests',
        'x-options': [
          { label: '10 percent', value: 10 },
          { label: '25 percent', value: 25 },
        ],
      },
      employeeCount: { widget: 'number', label: 'Employee count' },
      insuranceExpiry: { widget: 'date', label: 'Insurance expiry date' },
      acceptsTerms: { widget: 'checkbox', label: 'I confirm the supplier terms' },
      notes: { widget: 'textarea', label: 'Additional notes' },
    },
  },
  publishedAt: '2026-06-28T10:00:00.000Z',
};

describe('FillFormPageClient', () => {
  beforeEach(() => {
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

  it('shows a loading state while the published config is being fetched', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );

    renderWithQueryClient();

    expect(screen.getByRole('status', { name: 'Loading public form' })).toBeInTheDocument();
  });

  it('renders a published form and submits valid data', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(publishedForm))
      .mockResolvedValueOnce(
        okResponse({
          id: 'submission-1',
          formVersionId: 'version-3',
          formVersion: { version: 3 },
          data: { fullName: 'Ada Lovelace', country: 'GB', ownershipPercent: 42 },
          createdAt: '2026-06-28T11:00:00.000Z',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(await screen.findByLabelText('Full legal name *'), 'Ada Lovelace');
    await user.selectOptions(screen.getByLabelText('Country *'), 'GB');
    await user.type(screen.getByLabelText('Ownership percent'), '42');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/forms/ownership-declaration',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/forms/ownership-declaration/submissions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          data: { fullName: 'Ada Lovelace', country: 'GB', ownershipPercent: 42 },
        }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Response submitted' })).toBeInTheDocument();
    expect(screen.getByText(/version 3/)).toBeInTheDocument();
  });

  it('resets a submitted success state when the form key changes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(publishedForm))
      .mockResolvedValueOnce(
        okResponse({
          id: 'submission-1',
          formVersionId: 'version-3',
          formVersion: { version: 3 },
          data: { fullName: 'Ada Lovelace', country: 'GB' },
          createdAt: '2026-06-28T11:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        okResponse({ ...publishedForm, key: 'second-form', name: 'Second Form' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { renderForm } = renderWithQueryClient();

    await user.type(await screen.findByLabelText('Full legal name *'), 'Ada Lovelace');
    await user.selectOptions(screen.getByLabelText('Country *'), 'GB');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    expect(await screen.findByRole('heading', { name: 'Response submitted' })).toBeInTheDocument();

    renderForm('second-form');

    expect(await screen.findByRole('heading', { name: 'Second Form' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Response submitted' })).not.toBeInTheDocument();
  });

  it('uses the shared validator before posting invalid data', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(publishedForm));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await screen.findByRole('heading', { name: 'Ownership Declaration' });
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Fix the highlighted fields before submitting.')).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'fullName'/)).toBeInTheDocument();
  });

  it('maps backend 422 details back to the matching field', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(publishedForm))
      .mockResolvedValueOnce(
        errorResponse(422, 'The submission did not match the form configuration.', [
          { field: 'fullName', keyword: 'pattern', message: 'Use a legal full name.' },
        ]),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(await screen.findByLabelText('Full legal name *'), 'Ada');
    await user.selectOptions(screen.getByLabelText('Country *'), 'GB');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    expect(await screen.findByText('Use a legal full name.')).toBeInTheDocument();
    expect(
      screen.getByText('The submission did not match the form configuration.'),
    ).toBeInTheDocument();
  });

  it('renders supported shadcn controls and submits their backend values', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(allInputsForm))
      .mockResolvedValueOnce(
        okResponse({
          id: 'submission-2',
          formVersionId: 'version-1',
          formVersion: { version: 1 },
          data: {},
          createdAt: '2026-06-28T11:00:00.000Z',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(await screen.findByLabelText('Legal supplier name *'), 'Acme Logistics');
    await user.type(screen.getByLabelText('Contact email *'), 'compliance@acme.example');
    await user.selectOptions(screen.getByLabelText('Country *'), 'ZM');
    await user.selectOptions(screen.getByLabelText('Ownership band *'), '25');
    await user.click(screen.getByLabelText('Medium'));
    await user.click(screen.getByLabelText('Logistics'));
    await user.click(screen.getByLabelText('Software'));
    await user.click(screen.getByLabelText('25 percent'));
    await user.type(screen.getByLabelText('Employee count *'), '120');
    await user.click(screen.getByLabelText('Insurance expiry date *'));
    const dayButtons = await screen.findAllByText('15');
    await user.click(dayButtons[0]!);
    await user.click(screen.getByLabelText('I confirm the supplier terms *'));
    await user.type(screen.getByLabelText('Additional notes'), 'Requires annual review.');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { data: Record<string, unknown> };
    expect(body.data).toEqual({
      legalName: 'Acme Logistics',
      contactEmail: 'compliance@acme.example',
      country: 'ZM',
      ownershipBand: 25,
      riskTier: 'medium',
      services: ['logistics', 'software'],
      ownershipInterests: [25],
      employeeCount: 120,
      insuranceExpiry: expect.stringMatching(/^\d{4}-\d{2}-15$/),
      acceptsTerms: true,
      notes: 'Requires annual review.',
    });
  });

  it('blocks invalid public form values with the shared schema validator', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(allInputsForm));
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient();

    await user.type(await screen.findByLabelText('Legal supplier name *'), 'A');
    await user.type(screen.getByLabelText('Contact email *'), 'not-an-email');
    await user.selectOptions(screen.getByLabelText('Country *'), 'GB');
    await user.type(screen.getByLabelText('Employee count *'), '0');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('Fix the highlighted fields before submitting.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/must NOT have fewer than 2 characters/)).toBeInTheDocument();
    expect(screen.getByText(/must match format "email"/)).toBeInTheDocument();
    expect(screen.getByText(/must be >= 1/)).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'ownershipBand'/)).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'riskTier'/)).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'services'/)).toBeInTheDocument();
    expect(
      screen.getByText(/must have required property 'ownershipInterests'/),
    ).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'insuranceExpiry'/)).toBeInTheDocument();
    expect(screen.getByText(/must have required property 'acceptsTerms'/)).toBeInTheDocument();
  });
});
