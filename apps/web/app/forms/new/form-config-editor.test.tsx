import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormConfigEditor } from '@/app/forms/new/form-config-editor';

const baseValue = {
  name: '',
  description: '',
  fields: [
    {
      key: 'status',
      label: 'Status',
      type: 'dropdown',
      required: true,
      options: [
        { label: 'Active company', value: 'active' },
        { label: 'Inactive company', value: 'inactive' },
      ],
    },
  ],
};
const originalClipboard = navigator.clipboard;

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

describe('FormConfigEditor', () => {
  it('renders friendly builder JSON and applies edited values', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(<FormConfigEditor onApply={onApply} value={baseValue} />);

    const editor = screen.getByLabelText('Form builder JSON') as HTMLTextAreaElement;
    expect(editor.value).toContain('"fields"');
    expect(editor.value).toContain('"label": "Active company"');
    expect(editor.value).not.toContain('"schema"');
    expect(editor.value).not.toContain('"uiSchema"');

    fireEvent.change(editor, {
      target: {
        value: JSON.stringify(
          {
            name: 'Ownership declaration',
            description: '',
            fields: [
              {
                key: 'status',
                label: 'Status',
                type: 'checkboxes',
                required: true,
                options: [
                  { label: 'Active company', value: 'active' },
                  { label: 'Inactive company', value: 'inactive' },
                ],
              },
            ],
          },
          null,
          2,
        ),
      },
    });
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ownership declaration',
        fields: [
          expect.objectContaining({
            key: 'status',
            type: expect.objectContaining({ id: 'checkboxes' }),
            options: [
              { label: 'Active company', value: 'active' },
              { label: 'Inactive company', value: 'inactive' },
            ],
          }),
        ],
      }),
    );
  });

  it('syncs the editor buffer when value changes', () => {
    const { rerender } = render(<FormConfigEditor onApply={vi.fn()} value={baseValue} />);

    rerender(
      <FormConfigEditor
        onApply={vi.fn()}
        value={{
          ...baseValue,
          name: 'Ownership declaration',
        }}
      />,
    );

    expect((screen.getByLabelText('Form builder JSON') as HTMLTextAreaElement).value).toContain(
      '"name": "Ownership declaration"',
    );
  });

  it('does not show copied feedback when clipboard writes fail', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    render(<FormConfigEditor onApply={vi.fn()} value={baseValue} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
