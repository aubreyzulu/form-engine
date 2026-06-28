import { describe, expect, it } from 'vitest';

import { compileForm, decompile, parseConfig, type FormConfig } from '@/app/forms/new/compile';
import { fieldType, type BuilderField } from '@/app/forms/new/field-types';

function optionField(typeId: 'dropdown' | 'checkboxes'): BuilderField {
  return {
    id: 'field-1',
    key: 'status',
    label: 'Status',
    type: fieldType(typeId),
    required: true,
    options: [
      { label: 'Active company', value: 'active' },
      { label: 'Inactive company', value: 'inactive' },
    ],
  };
}

describe('compileForm', () => {
  it('compiles dropdowns to submitted values while preserving option labels in uiSchema', () => {
    const config = compileForm('Company form', '', [optionField('dropdown')]);

    expect(config.schema.properties).toEqual({
      status: { type: 'string', enum: ['active', 'inactive'] },
    });
    expect(config.uiSchema.fields?.status).toMatchObject({
      widget: 'select',
      label: 'Status',
      'x-fieldType': 'dropdown',
      'x-options': [
        { label: 'Active company', value: 'active' },
        { label: 'Inactive company', value: 'inactive' },
      ],
    });
  });

  it('compiles checkbox groups to arrays of submitted values', () => {
    const config = compileForm('', '', [optionField('checkboxes')]);

    expect(config.schema.properties).toEqual({
      status: {
        type: 'array',
        items: { type: 'string', enum: ['active', 'inactive'] },
        uniqueItems: true,
      },
    });
    expect(config.uiSchema.fields?.status).toMatchObject({
      widget: 'checkboxes',
      'x-fieldType': 'checkboxes',
    });
  });
});

describe('decompile', () => {
  it('round-trips option labels and submitted values from uiSchema metadata', () => {
    const rebuilt = decompile(compileForm('', '', [optionField('checkboxes')]));

    expect(rebuilt.fields[0]?.options).toEqual([
      { label: 'Active company', value: 'active' },
      { label: 'Inactive company', value: 'inactive' },
    ]);
  });

  it('loads legacy dropdown enums as matching label/value pairs', () => {
    const legacy: FormConfig = {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      uiSchema: {
        order: ['status'],
        fields: {
          status: { widget: 'select', label: 'Status' },
        },
      },
    };

    expect(decompile(legacy).fields[0]?.options).toEqual([
      { label: 'active', value: 'active' },
      { label: 'inactive', value: 'inactive' },
    ]);
  });

  it('loads legacy checkbox-group arrays as matching label/value pairs', () => {
    const legacy: FormConfig = {
      schema: {
        type: 'object',
        properties: {
          roles: {
            type: 'array',
            items: { type: 'string', enum: ['owner', 'director'] },
            uniqueItems: true,
          },
        },
      },
      uiSchema: {
        order: ['roles'],
        fields: {
          roles: { widget: 'checkboxes', label: 'Roles' },
        },
      },
    };

    expect(decompile(legacy).fields[0]).toMatchObject({
      key: 'roles',
      label: 'Roles',
      type: fieldType('checkboxes'),
      options: [
        { label: 'owner', value: 'owner' },
        { label: 'director', value: 'director' },
      ],
    });
  });

  it('falls back to schema option values when uiSchema metadata drifts', () => {
    const config = {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      uiSchema: {
        order: ['status'],
        fields: {
          status: {
            widget: 'select',
            label: 'Status',
            'x-options': [
              { label: 'Active company', value: 'active' },
              { label: 'Dormant company', value: 'dormant' },
            ],
          },
        },
      },
    } as unknown as FormConfig;

    expect(decompile(config).fields[0]?.options).toEqual([
      { label: 'active', value: 'active' },
      { label: 'inactive', value: 'inactive' },
    ]);
  });

  it('keeps option labels while normalizing uiSchema metadata to schema order', () => {
    const config = {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      uiSchema: {
        order: ['status'],
        fields: {
          status: {
            widget: 'select',
            label: 'Status',
            'x-options': [
              { label: 'Inactive company', value: 'inactive' },
              { label: 'Active company', value: 'active' },
            ],
          },
        },
      },
    } as unknown as FormConfig;

    expect(decompile(config).fields[0]?.options).toEqual([
      { label: 'Active company', value: 'active' },
      { label: 'Inactive company', value: 'inactive' },
    ]);
  });

  it('de-duplicates repeated uiSchema order entries while rebuilding fields', () => {
    const config: FormConfig = {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      uiSchema: {
        order: ['status', 'status'],
        fields: {
          status: { widget: 'select', label: 'Status' },
        },
      },
    };

    expect(decompile(config).fields).toHaveLength(1);
  });
});

describe('parseConfig', () => {
  it('rejects duplicate ordered keys', () => {
    const result = parseConfig(`{
      "schema": {
        "type": "object",
        "properties": {
          "status": { "type": "string", "enum": ["active", "inactive"] }
        }
      },
      "uiSchema": {
        "order": ["status", "status"],
        "fields": {
          "status": { "widget": "select", "label": "Status" }
        }
      }
    }`);

    expect(result.config).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('duplicate property "status"');
  });
});
