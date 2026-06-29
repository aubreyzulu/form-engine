import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BuilderHeader } from '@/app/forms/new/builder-header';

function renderHeader(overrides: Partial<Parameters<typeof BuilderHeader>[0]> = {}) {
  const props = {
    name: '',
    description: '',
    visibleSaveState: { status: 'idle' as const },
    canSave: true,
    canPublish: true,
    canPreview: true,
    saveState: { status: 'idle' as const },
    onNameChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onAddField: vi.fn(),
    onSaveDraft: vi.fn(),
    onPublish: vi.fn(),
    onLivePreview: vi.fn(),
    ...overrides,
  };

  render(<BuilderHeader {...props} />);
  return props;
}

describe('BuilderHeader', () => {
  it('uses an untitled breadcrumb fallback and forwards input edits', async () => {
    const props = renderHeader();

    expect(screen.getByText('Untitled form')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Form name'), { target: { value: 'Disclosure' } });
    fireEvent.change(screen.getByLabelText('Form description'), {
      target: { value: 'Short description' },
    });

    expect(props.onNameChange).toHaveBeenLastCalledWith('Disclosure');
    expect(props.onDescriptionChange).toHaveBeenLastCalledWith('Short description');
  });

  it('honors disabled save and publish states', () => {
    renderHeader({ canSave: false, canPublish: false, canPreview: false });

    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Live preview' })).toBeDisabled();
  });

  it('calls preview, save, and publish handlers when actions are available', async () => {
    const user = userEvent.setup();
    const props = renderHeader();

    await user.click(screen.getByRole('button', { name: 'Live preview' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(props.onLivePreview).toHaveBeenCalledTimes(1);
    expect(props.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(props.onPublish).toHaveBeenCalledTimes(1);
  });

  it('renders success and error save feedback in accessible regions', () => {
    const { rerender } = render(
      <BuilderHeader
        canPublish
        canSave
        description=""
        name="Disclosure"
        canPreview
        onAddField={vi.fn()}
        onDescriptionChange={vi.fn()}
        onLivePreview={vi.fn()}
        onNameChange={vi.fn()}
        onPublish={vi.fn()}
        onSaveDraft={vi.fn()}
        saveState={{ status: 'idle' }}
        visibleSaveState={{ status: 'success', message: 'Saved.' }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Saved.');

    rerender(
      <BuilderHeader
        canPublish
        canSave
        description=""
        name="Disclosure"
        canPreview
        onAddField={vi.fn()}
        onDescriptionChange={vi.fn()}
        onLivePreview={vi.fn()}
        onNameChange={vi.fn()}
        onPublish={vi.fn()}
        onSaveDraft={vi.fn()}
        saveState={{ status: 'idle' }}
        visibleSaveState={{ status: 'error', message: 'Failed.' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed.');
  });
});
