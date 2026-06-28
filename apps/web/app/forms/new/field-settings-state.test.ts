import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFieldSettingsState,
  fieldSettingsReducer,
  findDuplicateOptionValues,
  hasInvalidOptions,
  toBuilderField,
} from '@/app/forms/new/field-settings-state';
import { fieldType, type BuilderField } from '@/app/forms/new/field-types';

const dropdownField: BuilderField = {
  id: 'field-1',
  key: 'status',
  label: 'Status',
  type: fieldType('dropdown'),
  required: true,
  options: [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ],
};

describe('field settings state', () => {
  beforeEach(() => {
    let id = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `option-id-${++id}`);
  });

  it('adds internal option ids but strips them from applied builder fields', () => {
    const state = createFieldSettingsState(dropdownField);

    expect(state.draft.options).toEqual([
      { id: 'option-id-1', label: 'Active', value: 'active' },
      { id: 'option-id-2', label: 'Inactive', value: 'inactive' },
    ]);
    expect(toBuilderField(state.draft).options).toEqual(dropdownField.options);
  });

  it('updates, removes, and appends options by internal id', () => {
    let state = createFieldSettingsState(dropdownField);
    const firstId = state.draft.options?.[0]?.id ?? '';

    state = fieldSettingsReducer(state, {
      type: 'optionLabelChanged',
      id: firstId,
      label: 'Currently active',
    });
    state = fieldSettingsReducer(state, {
      type: 'optionValueChanged',
      id: firstId,
      value: 'currently_active',
    });
    state = fieldSettingsReducer(state, { type: 'optionAdded' });
    state = fieldSettingsReducer(state, { type: 'optionRemoved', id: firstId });

    expect(toBuilderField(state.draft).options).toEqual([
      { label: 'Inactive', value: 'inactive' },
      { label: 'Option 3', value: 'option3' },
    ]);
  });

  it('detects duplicate and empty option values after trimming', () => {
    const duplicate = createFieldSettingsState({
      ...dropdownField,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Also active', value: ' active ' },
      ],
    });
    const empty = createFieldSettingsState({
      ...dropdownField,
      options: [{ label: 'Empty', value: '' }],
    });

    expect(hasInvalidOptions(duplicate.draft)).toBe(true);
    expect(hasInvalidOptions(empty.draft)).toBe(true);
    expect(findDuplicateOptionValues(duplicate.draft.options ?? [])).toEqual(new Set(['active']));
  });

  it('preserves option ids when moving between option-list field types', () => {
    const state = createFieldSettingsState(dropdownField);
    const optionIds = state.draft.options?.map((option) => option.id);
    const transitioned = fieldSettingsReducer(state, {
      type: 'typeChanged',
      typeId: 'checkboxes',
    });

    expect(transitioned.draft.type.id).toBe('checkboxes');
    expect(transitioned.draft.options?.map((option) => option.id)).toEqual(optionIds);
  });

  it('drops option metadata when moving to a scalar field type', () => {
    const transitioned = fieldSettingsReducer(createFieldSettingsState(dropdownField), {
      type: 'typeChanged',
      typeId: 'yes-no',
    });

    expect(transitioned.draft.type.id).toBe('yes-no');
    expect(transitioned.draft.options).toBeUndefined();
  });
});
