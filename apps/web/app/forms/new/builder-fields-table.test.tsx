import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BuilderFieldsTable } from '@/app/forms/new/builder-fields-table';
import { fieldType, type BuilderField } from '@/app/forms/new/field-types';

function field(overrides: Partial<BuilderField> = {}): BuilderField {
  return {
    id: 'field-1',
    key: 'fieldOne',
    label: 'Field One',
    type: fieldType('short-text'),
    required: true,
    ...overrides,
  };
}

function renderTable(overrides: Partial<Parameters<typeof BuilderFieldsTable>[0]> = {}) {
  const props = {
    fields: [
      field({ id: 'field-1', key: 'first', label: 'First name', helperText: 'Legal name' }),
      field({
        id: 'field-2',
        key: 'email',
        label: 'Email address',
        type: fieldType('email'),
        required: false,
      }),
    ],
    editingId: 'field-1',
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onMove: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };

  render(<BuilderFieldsTable {...props} />);
  return props;
}

describe('BuilderFieldsTable', () => {
  it('shows an empty state when no fields exist', () => {
    renderTable({ fields: [] });

    expect(
      screen.getByText('No fields yet. Add your first field to start building the form.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add another field' })).toBeEnabled();
  });

  it('renders field metadata and disables boundary move buttons', () => {
    renderTable();

    expect(screen.getByText('First name')).toBeVisible();
    expect(screen.getByText('Legal name')).toBeVisible();
    expect(screen.getByText('Email address')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Move First name up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Email address down' })).toBeDisabled();
  });

  it('fires row, duplicate, and move callbacks without bubbling action clicks into edit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const props = renderTable({ onEdit });

    await user.click(screen.getByText('First name'));
    expect(onEdit).toHaveBeenCalledWith('field-1');

    onEdit.mockClear();
    await user.click(screen.getByRole('button', { name: 'Duplicate First name' }));
    expect(props.onDuplicate).toHaveBeenCalledWith(0);
    expect(onEdit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Move First name down' }));
    expect(props.onMove).toHaveBeenCalledWith(0, 1);
  });
});
