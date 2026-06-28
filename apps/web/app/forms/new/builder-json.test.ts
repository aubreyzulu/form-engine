import { describe, expect, it } from 'vitest';

import { parseBuilderJson, toBuilderJson } from '@/app/forms/new/builder-json';
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

describe('builder JSON mapping', () => {
  it('shows option fields as label/value objects', () => {
    expect(toBuilderJson('Company form', '', [dropdownField])).toEqual({
      name: 'Company form',
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
    });
  });

  it('parses option label/value objects back into builder fields', () => {
    const result = parseBuilderJson(`{
      "name": "Company form",
      "description": "",
      "fields": [
        {
          "key": "status",
          "label": "Status",
          "type": "checkboxes",
          "required": true,
          "options": [
            { "label": "Active company", "value": "active" },
            { "label": "Inactive company", "value": "inactive" }
          ]
        }
      ]
    }`);

    expect(result.errors).toEqual([]);
    expect(result.value?.fields[0]).toMatchObject({
      key: 'status',
      label: 'Status',
      type: fieldType('checkboxes'),
      options: [
        { label: 'Active company', value: 'active' },
        { label: 'Inactive company', value: 'inactive' },
      ],
    });
  });

  it('accepts legacy string options by treating the string as both label and value', () => {
    const result = parseBuilderJson(`{
      "name": "",
      "description": "",
      "fields": [
        {
          "key": "status",
          "label": "Status",
          "type": "dropdown",
          "required": true,
          "options": ["active", "inactive"]
        }
      ]
    }`);

    expect(result.errors).toEqual([]);
    expect(result.value?.fields[0]?.options).toEqual([
      { label: 'active', value: 'active' },
      { label: 'inactive', value: 'inactive' },
    ]);
  });

  it('rejects duplicate submitted option values', () => {
    const result = parseBuilderJson(`{
      "name": "",
      "description": "",
      "fields": [
        {
          "key": "status",
          "label": "Status",
          "type": "dropdown",
          "required": true,
          "options": [
            { "label": "Active", "value": "active" },
            { "label": "Enabled", "value": "active" }
          ]
        }
      ]
    }`);

    expect(result.value).toBeNull();
    expect(result.errors).toContain('fields[0].options[1].value must be unique.');
  });
});
