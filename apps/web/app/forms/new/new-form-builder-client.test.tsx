import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewFormBuilderClient } from '@/app/forms/new/new-form-builder-client';

const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
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

function okResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response;
}

describe('NewFormBuilderClient', () => {
  beforeEach(() => {
    mockMatchMedia();
    mockResizeObserver();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves a draft through the forms API and disables repeated saves after success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    render(<NewFormBuilderClient />);

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/forms',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"key":"ownership-declaration"'),
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

    render(<NewFormBuilderClient />);

    await user.type(screen.getByLabelText('Form name'), 'Ownership Declaration');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/forms/ownership-declaration/versions/1/publish',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('"Ownership Declaration" was published.');
  });
});
