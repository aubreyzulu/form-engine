import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AddFieldMenu } from '@/app/forms/new/add-field-menu';

describe('AddFieldMenu', () => {
  it('opens the field type menu, adds the selected type, and closes', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddFieldMenu onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.click(screen.getByText('Short Text'));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({ id: 'short-text', label: 'Short Text' });
    expect(screen.queryByText('One-line response')).not.toBeInTheDocument();
  });

  it('supports the dashed trigger variant used inside the empty builder table', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <AddFieldMenu
        align="center"
        label="Add another field"
        onAdd={onAdd}
        triggerVariant="dashed"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add another field' }));
    await user.click(screen.getByText('Number'));

    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({ id: 'number', label: 'Number' });
  });
});
