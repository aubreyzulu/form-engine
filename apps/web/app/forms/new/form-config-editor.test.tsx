import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormConfigEditor } from '@/app/forms/new/form-config-editor';

describe('FormConfigEditor', () => {
  it('renders friendly builder JSON and applies edited values', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <FormConfigEditor
        onApply={onApply}
        value={{
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
        }}
      />,
    );

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
});
