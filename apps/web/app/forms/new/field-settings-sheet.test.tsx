import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FieldSettingsSheet } from '@/app/forms/new/field-settings-sheet';
import { fieldType, type BuilderField } from '@/app/forms/new/field-types';

const dropdownField: BuilderField = {
  id: 'field-1',
  key: 'status',
  label: 'Status',
  type: fieldType('dropdown'),
  required: true,
  options: [
    { label: 'Active company', value: 'active' },
    { label: 'Inactive company', value: 'inactive' },
  ],
};

describe('FieldSettingsSheet', () => {
  it('edits option labels separately from submitted values', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(<FieldSettingsSheet field={dropdownField} onApply={onApply} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Option 1 label')).toHaveValue('Active company');
    expect(screen.getByLabelText('Option 1 submitted value')).toHaveValue('active');
    expect(screen.getByLabelText('Option 2 label')).toHaveValue('Inactive company');
    expect(screen.getByLabelText('Option 2 submitted value')).toHaveValue('inactive');

    await user.clear(screen.getByLabelText('Option 1 label'));
    await user.type(screen.getByLabelText('Option 1 label'), 'Currently active');
    await user.clear(screen.getByLabelText('Option 1 submitted value'));
    await user.type(screen.getByLabelText('Option 1 submitted value'), 'currently_active');
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { label: 'Currently active', value: 'currently_active' },
          { label: 'Inactive company', value: 'inactive' },
        ],
      }),
    );
  });

  it('blocks apply when submitted option values are duplicated', async () => {
    const user = userEvent.setup();

    render(<FieldSettingsSheet field={dropdownField} onApply={vi.fn()} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Option 2 submitted value'));
    await user.type(screen.getByLabelText('Option 2 submitted value'), 'active');

    expect(screen.getByText('Submitted values must be unique.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled();
  });

  it('marks trimmed duplicate submitted values as invalid', async () => {
    const user = userEvent.setup();

    render(<FieldSettingsSheet field={dropdownField} onApply={vi.fn()} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Option 2 submitted value'));
    await user.type(screen.getByLabelText('Option 2 submitted value'), ' active ');

    expect(screen.getByText('Submitted values must be unique.')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 1 submitted value')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Option 2 submitted value')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled();
  });

  it('blocks invalid validation ranges', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <FieldSettingsSheet
        field={{
          ...dropdownField,
          type: fieldType('short-text'),
          options: undefined,
        }}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Min length'), '10');
    await user.type(screen.getByLabelText('Max length'), '2');

    expect(screen.getByText('Minimum cannot be greater than maximum.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled();
  });
});
