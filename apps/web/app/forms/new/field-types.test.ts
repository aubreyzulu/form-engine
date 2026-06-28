import { describe, expect, it } from 'vitest';

import {
  createField,
  fieldType,
  isOptionListType,
  transitionFieldType,
  type BuilderField,
} from '@/app/forms/new/field-types';

function baseField(overrides: Partial<BuilderField> = {}): BuilderField {
  return {
    id: 'field-1',
    key: 'status',
    label: 'Status',
    type: fieldType('dropdown'),
    required: true,
    helperText: 'Choose one',
    placeholder: 'Select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
    ...overrides,
  };
}

describe('field type transitions', () => {
  it('creates default label/value options for option-list fields', () => {
    expect(createField(fieldType('dropdown')).options).toEqual([
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ]);
    expect(createField(fieldType('checkboxes')).options).toEqual([
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ]);
  });

  it('preserves option labels and submitted values between option-list field types', () => {
    const transitioned = transitionFieldType(baseField(), 'checkboxes');

    expect(transitioned.type.id).toBe('checkboxes');
    expect(transitioned.options).toEqual([
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]);
    expect(transitioned.helperText).toBe('Choose one');
    expect(transitioned.placeholder).toBe('Select');
  });

  it('drops option metadata when moving to a scalar checkbox field', () => {
    const transitioned = transitionFieldType(baseField(), 'yes-no');

    expect(transitioned.type.id).toBe('yes-no');
    expect(transitioned.options).toBeUndefined();
    expect(transitioned.helperText).toBe('Choose one');
  });

  it('keeps text length validation only across text-compatible field types', () => {
    const textField = baseField({
      type: fieldType('short-text'),
      options: undefined,
      minLength: 2,
      maxLength: 80,
    });

    expect(transitionFieldType(textField, 'long-text')).toMatchObject({
      minLength: 2,
      maxLength: 80,
    });
    expect(transitionFieldType(textField, 'number').minLength).toBeUndefined();
  });

  it('keeps numeric validation only across number fields', () => {
    const numberField = baseField({
      type: fieldType('number'),
      options: undefined,
      min: 1,
      max: 100,
    });

    expect(transitionFieldType(numberField, 'number')).toMatchObject({ min: 1, max: 100 });
    expect(transitionFieldType(numberField, 'short-text').min).toBeUndefined();
  });

  it('identifies the field types that own label/value options', () => {
    expect(isOptionListType('dropdown')).toBe(true);
    expect(isOptionListType('checkboxes')).toBe(true);
    expect(isOptionListType('yes-no')).toBe(false);
  });
});
