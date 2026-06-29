import { describe, expect, it } from 'vitest';

import {
  buildSubmissionData,
  defaultValuesFor,
  formatDateValue,
  formatSubmittedValue,
  getRenderFields,
  parseDateValue,
  selectValue,
} from '@/app/f/[key]/fill-form-utils';
import type { RenderField } from '@/app/f/[key]/fill-form-types';

function renderField(overrides: Partial<RenderField>): RenderField {
  return {
    key: 'field',
    label: 'Field',
    widget: 'text',
    type: 'string',
    format: null,
    required: false,
    options: [],
    ...overrides,
  };
}

describe('fill form utilities', () => {
  it('maps JSON Schema and uiSchema into render fields with label/value options', () => {
    const fields = getRenderFields(
      {
        type: 'object',
        required: ['country', 'services'],
        properties: {
          country: { type: 'string', enum: ['ZM', 'GB'] },
          services: {
            type: 'array',
            items: { type: 'string', enum: ['logistics', 'software'] },
          },
          acceptsTerms: { type: 'boolean' },
        },
      },
      {
        order: ['country', 'services', 'acceptsTerms'],
        fields: {
          country: {
            widget: 'select',
            label: 'Country',
            'x-options': [
              { label: 'Zambia', value: 'ZM' },
              { label: 'United Kingdom', value: 'GB' },
            ],
          },
          services: { label: 'Services' },
          acceptsTerms: { label: 'Terms' },
        },
      },
    );

    expect(fields).toMatchObject([
      {
        key: 'country',
        label: 'Country',
        widget: 'select',
        required: true,
        options: [
          { label: 'Zambia', value: 'ZM' },
          { label: 'United Kingdom', value: 'GB' },
        ],
      },
      {
        key: 'services',
        label: 'Services',
        widget: 'checkboxes',
        required: true,
        options: [
          { label: 'logistics', value: 'logistics' },
          { label: 'software', value: 'software' },
        ],
      },
      { key: 'acceptsTerms', label: 'Terms', widget: 'checkbox', required: false },
    ]);
  });

  it('creates default form values for scalar, checkbox, and checkbox-group fields', () => {
    const fields = getRenderFields(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          services: { type: 'array', items: { type: 'string', enum: ['a'] } },
          acceptsTerms: { type: 'boolean' },
        },
      },
      {},
    );

    expect(defaultValuesFor(fields)).toEqual({
      name: '',
      services: [],
      acceptsTerms: undefined,
    });
  });

  it('builds compact submission data and skips untouched optional checkboxes', () => {
    const fields = getRenderFields(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          optionalText: { type: 'string' },
          count: { type: 'number' },
          services: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
          acceptsTerms: { type: 'boolean' },
        },
      },
      {},
    );

    expect(
      buildSubmissionData(fields, {
        name: 'Ada',
        optionalText: '',
        count: 0,
        services: [],
        acceptsTerms: undefined,
      }),
    ).toEqual({
      name: 'Ada',
      count: 0,
    });

    expect(buildSubmissionData(fields, { acceptsTerms: false })).toEqual({
      acceptsTerms: false,
    });
  });

  it('preserves primitive enum option values for renderer submissions', () => {
    const [field] = getRenderFields(
      {
        type: 'object',
        properties: {
          ownershipBand: { type: 'number', enum: [10, 25] },
        },
      },
      {
        fields: {
          ownershipBand: {
            widget: 'checkboxes',
            label: 'Ownership band',
            'x-options': [
              { label: '10 percent', value: 10 },
              { label: '25 percent', value: 25 },
            ],
          },
        },
      },
    );

    expect(field?.options).toEqual([
      { label: '10 percent', value: 10 },
      { label: '25 percent', value: 25 },
    ]);
    expect(buildSubmissionData([field!], { ownershipBand: [25] })).toEqual({
      ownershipBand: [25],
    });
  });

  it('coerces select values and formats submitted values for display', () => {
    expect(selectValue(renderField({ type: 'number' }), '25')).toBe(25);
    expect(selectValue(renderField({ type: 'boolean' }), 'true')).toBe(true);
    expect(selectValue(renderField({ type: 'string' }), '')).toBeUndefined();
    expect(formatSubmittedValue(['a', 'b'])).toBe('a, b');
    expect(formatSubmittedValue(false)).toBe('No');
  });

  it('round-trips date-only values without accepting non-date strings', () => {
    expect(formatDateValue(new Date(2026, 5, 15))).toBe('2026-06-15');
    expect(parseDateValue('2026-06-15')).toEqual(new Date(2026, 5, 15));
    expect(parseDateValue('2026-06')).toBeUndefined();
    expect(parseDateValue('2026-02-31')).toBeUndefined();
  });
});
