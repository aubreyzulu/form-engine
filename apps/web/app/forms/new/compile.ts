import {
  validateSchemaDocument,
  validateSupportedFields,
  validateUiSchemaReferences,
} from '@formbuilder/shared';
import type { FieldWidget, JsonSchema, UiFieldConfig, UiSchema } from '@formbuilder/shared';

import {
  type BuilderField,
  type BuilderOption,
  FIELD_TYPES,
  fieldType,
} from '@/app/forms/new/field-types';

export type FormConfig = {
  schema: JsonSchema;
  uiSchema: UiSchema;
};

/** uiSchema field config plus the builder's own field-type marker. `x-` keys are
 *  ignored by JSON Schema/the engine, so this keeps presentation in uiSchema while
 *  letting the builder restore the exact field type on a round-trip. */
type BuilderUiFieldConfig = UiFieldConfig & {
  'x-fieldType'?: string;
  'x-options'?: BuilderOption[];
};

const WIDGET_BY_TYPE: Record<string, FieldWidget> = {
  'short-text': 'text',
  'long-text': 'textarea',
  number: 'number',
  date: 'date',
  dropdown: 'select',
  checkboxes: 'checkboxes',
  'yes-no': 'checkbox',
  email: 'text',
  phone: 'text',
  url: 'text',
};

/** Per-field JSON Schema — restricted to shapes the shared engine can render
 *  (see docs/04-validation-strategy.md: no `integer`, `format: uri`, etc.). */
function propertySchema(field: BuilderField): JsonSchema {
  switch (field.type.id) {
    case 'number': {
      const schema: JsonSchema = { type: 'number' };
      if (field.min !== undefined) schema.minimum = field.min;
      if (field.max !== undefined) schema.maximum = field.max;
      return schema;
    }
    case 'date':
      return { type: 'string', format: 'date' };
    case 'dropdown':
      return { type: 'string', enum: field.options?.map((option) => option.value) ?? [] };
    case 'checkboxes':
      return {
        type: 'array',
        items: { type: 'string', enum: field.options?.map((option) => option.value) ?? [] },
        uniqueItems: true,
      };
    case 'yes-no':
      return { type: 'boolean' };
    case 'email':
      return { type: 'string', format: 'email' };
    default: {
      // short-text, long-text, phone, url — all plain strings to the engine.
      const schema: JsonSchema = { type: 'string' };
      if (field.minLength !== undefined) schema.minLength = field.minLength;
      if (field.maxLength !== undefined) schema.maxLength = field.maxLength;
      return schema;
    }
  }
}

export function compileForm(name: string, description: string, fields: BuilderField[]): FormConfig {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const order: string[] = [];
  const uiFields: Record<string, BuilderUiFieldConfig> = {};

  for (const field of fields) {
    const key = field.key;

    properties[key] = propertySchema(field);
    order.push(key);
    if (field.required) required.push(key);

    const ui: BuilderUiFieldConfig = {
      widget: WIDGET_BY_TYPE[field.type.id] ?? 'text',
      label: field.label,
      'x-fieldType': field.type.id,
    };
    if (field.placeholder) ui.placeholder = field.placeholder;
    if (field.helperText) ui.help = field.helperText;
    if (field.options) ui['x-options'] = field.options;
    uiFields[key] = ui;
  }

  const schema: JsonSchema = { $schema: 'https://json-schema.org/draft/2020-12/schema' };
  if (name.trim()) schema.title = name.trim();
  if (description.trim()) schema.description = description.trim();
  schema.type = 'object';
  schema.properties = properties;
  if (required.length) schema.required = required;
  schema.additionalProperties = false;

  return { schema, uiSchema: { order, fields: uiFields } };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Parse + validate an edited config string. Runs the *same* engine checks the
 * API gates on (schema validity, supported fields, uiSchema references), so a
 * config that passes here is one the backend would also accept.
 */
export function parseConfig(text: string): { config: FormConfig | null; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      config: null,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'could not parse'}`],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { config: null, errors: ['Top level must be an object with "schema" and "uiSchema".'] };
  }

  const root = parsed as Record<string, unknown>;
  const schema = root.schema;
  if (!schema || typeof schema !== 'object') {
    return { config: null, errors: ['Missing "schema" object.'] };
  }
  const uiSchema = root.uiSchema && typeof root.uiSchema === 'object' ? root.uiSchema : {};

  const errors: string[] = [];
  for (const result of [
    validateSchemaDocument(schema),
    validateSupportedFields(schema as JsonSchema),
    validateUiSchemaReferences(schema as JsonSchema, uiSchema),
  ]) {
    for (const error of result.errors) {
      errors.push(error.field ? `${error.field}: ${error.message}` : error.message);
    }
  }

  if (errors.length > 0) return { config: null, errors };
  return { config: { schema: schema as JsonSchema, uiSchema: uiSchema as UiSchema }, errors: [] };
}

function detectTypeId(prop: Record<string, unknown>, widget: FieldWidget | undefined): string {
  if (prop.type === 'number') return 'number';
  if (prop.type === 'boolean') return 'yes-no';
  if (prop.type === 'array') return 'checkboxes';
  if (prop.type === 'string') {
    if (prop.format === 'date') return 'date';
    if (prop.format === 'email') return 'email';
    if (Array.isArray(prop.enum)) return 'dropdown';
    if (widget === 'textarea') return 'long-text';
  }
  // Plain strings (and any shape the builder can't model) become short text.
  return 'short-text';
}

function isBuilderOptions(value: unknown): value is BuilderOption[] {
  return (
    Array.isArray(value) &&
    value.every(
      (option) =>
        option &&
        typeof option === 'object' &&
        typeof (option as Record<string, unknown>).label === 'string' &&
        typeof (option as Record<string, unknown>).value === 'string',
    )
  );
}

function decompileOptions(
  prop: Record<string, unknown>,
  ui: BuilderUiFieldConfig,
): BuilderOption[] {
  const schemaValues = schemaOptionValues(prop);

  if (isBuilderOptions(ui['x-options'])) {
    const values = ui['x-options'].map((option) => option.value);
    const schemaValueSet = new Set(schemaValues);
    const hasSameSchemaValues =
      new Set(values).size === values.length &&
      values.length === schemaValues.length &&
      values.every((value) => schemaValueSet.has(value));

    if (hasSameSchemaValues) {
      const optionsByValue = new Map(ui['x-options'].map((option) => [option.value, option]));
      return schemaValues.map((value) => optionsByValue.get(value) ?? { label: value, value });
    }
  }

  return schemaValues.map((value) => ({ label: value, value }));
}

function schemaOptionValues(prop: Record<string, unknown>): string[] {
  if (prop.type === 'array') {
    const items =
      prop.items && typeof prop.items === 'object' ? (prop.items as Record<string, unknown>) : {};
    return isStringArray(items.enum) ? items.enum : [];
  }
  return isStringArray(prop.enum) ? prop.enum : [];
}

/** Inverse of {@link compileForm}: rebuild editable builder state from a config. */
export function decompile(config: FormConfig): {
  name: string;
  description: string;
  fields: BuilderField[];
} {
  const { schema, uiSchema } = config;
  const properties =
    schema.properties && typeof schema.properties === 'object'
      ? (schema.properties as Record<string, unknown>)
      : {};
  const required = isStringArray(schema.required) ? schema.required : [];
  const uiFields =
    uiSchema.fields && typeof uiSchema.fields === 'object'
      ? (uiSchema.fields as Record<string, UiFieldConfig>)
      : {};
  const order =
    Array.isArray(uiSchema.order) && uiSchema.order.length > 0
      ? Array.from(new Set(uiSchema.order.filter((key): key is string => typeof key === 'string')))
      : Object.keys(properties);

  const fields: BuilderField[] = [];
  for (const key of order) {
    const raw = properties[key];
    if (!raw || typeof raw !== 'object') continue;
    const prop = raw as Record<string, unknown>;
    const ui = (uiFields[key] ?? {}) as BuilderUiFieldConfig;
    const savedType = ui['x-fieldType'];
    const typeId =
      typeof savedType === 'string' && FIELD_TYPES.some((type) => type.id === savedType)
        ? savedType
        : detectTypeId(prop, ui.widget);

    const field: BuilderField = {
      id: crypto.randomUUID(),
      key,
      label: ui.label ?? key,
      type: fieldType(typeId),
      required: required.includes(key),
    };
    if (ui.help) field.helperText = ui.help;
    if (ui.placeholder) field.placeholder = ui.placeholder;

    if (typeId === 'number') {
      if (typeof prop.minimum === 'number') field.min = prop.minimum;
      if (typeof prop.maximum === 'number') field.max = prop.maximum;
    } else if (typeId === 'dropdown' || typeId === 'checkboxes') {
      field.options = decompileOptions(prop, ui);
    } else if (typeId === 'short-text' || typeId === 'long-text') {
      if (typeof prop.minLength === 'number') field.minLength = prop.minLength;
      if (typeof prop.maxLength === 'number') field.maxLength = prop.maxLength;
    }

    fields.push(field);
  }

  return {
    name: typeof schema.title === 'string' ? schema.title : '',
    description: typeof schema.description === 'string' ? schema.description : '',
    fields,
  };
}
