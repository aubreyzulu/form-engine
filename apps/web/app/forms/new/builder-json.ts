import {
  type BuilderField,
  type BuilderOption,
  FIELD_TYPES,
  fieldType,
  slugifyKey,
  uniqueKey,
} from '@/app/forms/new/field-types';

export type BuilderJsonConfig = {
  name: string;
  description: string;
  fields: BuilderJsonField[];
};

type BuilderJsonField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  helperText?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options?: BuilderOption[];
};

export type BuilderJsonApplyValue = {
  name: string;
  description: string;
  fields: BuilderField[];
};

const VALID_TYPE_IDS = new Set(FIELD_TYPES.map((type) => type.id));

export function toBuilderJson(
  name: string,
  description: string,
  fields: BuilderField[],
): BuilderJsonConfig {
  return {
    name,
    description,
    fields: fields.map((field) => {
      const jsonField: BuilderJsonField = {
        key: field.key,
        label: field.label,
        type: field.type.id,
        required: field.required,
      };

      if (field.helperText) jsonField.helperText = field.helperText;
      if (field.placeholder) jsonField.placeholder = field.placeholder;
      if (field.type.id === 'number') {
        if (field.min !== undefined) jsonField.min = field.min;
        if (field.max !== undefined) jsonField.max = field.max;
      }
      if (field.type.id === 'short-text' || field.type.id === 'long-text') {
        if (field.minLength !== undefined) jsonField.minLength = field.minLength;
        if (field.maxLength !== undefined) jsonField.maxLength = field.maxLength;
      }
      if (field.type.id === 'dropdown' || field.type.id === 'checkboxes') {
        jsonField.options = field.options ?? [];
      }

      return jsonField;
    }),
  };
}

export function parseBuilderJson(text: string): {
  value: BuilderJsonApplyValue | null;
  errors: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      value: null,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'could not parse'}`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { value: null, errors: ['Top level must be an object.'] };
  }

  const root = parsed as Record<string, unknown>;
  const errors: string[] = [];
  const name = readOptionalString(root.name, 'name', errors);
  const description = readOptionalString(root.description, 'description', errors);

  if (!Array.isArray(root.fields)) {
    errors.push('fields must be an array.');
    return { value: null, errors };
  }

  const usedKeys = new Set<string>();
  const fields: BuilderField[] = [];
  root.fields.forEach((raw, index) => {
    const field = parseField(raw, index, usedKeys, errors);
    if (field) fields.push(field);
  });

  if (errors.length > 0) return { value: null, errors };
  return { value: { name, description, fields }, errors: [] };
}

function parseField(
  raw: unknown,
  index: number,
  usedKeys: Set<string>,
  errors: string[],
): BuilderField | null {
  const path = `fields[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  const object = raw as Record<string, unknown>;
  const label = readRequiredString(object.label, `${path}.label`, errors);
  const typeId = readRequiredString(object.type, `${path}.type`, errors);
  if (!typeId || !VALID_TYPE_IDS.has(typeId)) {
    errors.push(`${path}.type must be one of: ${FIELD_TYPES.map((type) => type.id).join(', ')}.`);
    return null;
  }

  const rawKey = readOptionalString(object.key, `${path}.key`, errors);
  const key = rawKey || uniqueKey(slugifyKey(label || fieldType(typeId).label), usedKeys);
  if (usedKeys.has(key)) {
    errors.push(`${path}.key must be unique.`);
    return null;
  }
  usedKeys.add(key);

  const field: BuilderField = {
    id: crypto.randomUUID(),
    key,
    label: label || fieldType(typeId).label,
    type: fieldType(typeId),
    required: object.required === undefined ? true : object.required === true,
  };

  if (object.required !== undefined && typeof object.required !== 'boolean') {
    errors.push(`${path}.required must be true or false.`);
  }

  const helperText = readOptionalString(object.helperText, `${path}.helperText`, errors);
  if (helperText) field.helperText = helperText;
  const placeholder = readOptionalString(object.placeholder, `${path}.placeholder`, errors);
  if (placeholder) field.placeholder = placeholder;

  if (typeId === 'number') {
    readOptionalNumber(object.min, `${path}.min`, errors, (value) => {
      field.min = value;
    });
    readOptionalNumber(object.max, `${path}.max`, errors, (value) => {
      field.max = value;
    });
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      errors.push(`${path}.min must be less than or equal to ${path}.max.`);
    }
  }

  if (typeId === 'short-text' || typeId === 'long-text') {
    readOptionalNonNegativeInteger(object.minLength, `${path}.minLength`, errors, (value) => {
      field.minLength = value;
    });
    readOptionalNonNegativeInteger(object.maxLength, `${path}.maxLength`, errors, (value) => {
      field.maxLength = value;
    });
    if (
      field.minLength !== undefined &&
      field.maxLength !== undefined &&
      field.minLength > field.maxLength
    ) {
      errors.push(`${path}.minLength must be less than or equal to ${path}.maxLength.`);
    }
  }

  if (typeId === 'dropdown' || typeId === 'checkboxes') {
    field.options = parseOptions(object.options, `${path}.options`, errors);
  }

  return field;
}

function parseOptions(value: unknown, path: string, errors: string[]): BuilderOption[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of { "label": "...", "value": "..." } objects.`);
    return [];
  }
  if (value.length === 0) {
    errors.push(`${path} must include at least one option.`);
    return [];
  }

  const usedValues = new Set<string>();
  const options: BuilderOption[] = [];
  value.forEach((raw, index) => {
    const optionPath = `${path}[${index}]`;

    if (typeof raw === 'string') {
      const option = raw.trim();
      if (!option) {
        errors.push(`${optionPath} must not be empty.`);
        return;
      }
      if (usedValues.has(option)) {
        errors.push(`${optionPath} value must be unique.`);
        return;
      }
      usedValues.add(option);
      options.push({ label: option, value: option });
      return;
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`${optionPath} must be an object with label and value.`);
      return;
    }

    const object = raw as Record<string, unknown>;
    const label = readRequiredString(object.label, `${optionPath}.label`, errors);
    const value = readRequiredString(object.value, `${optionPath}.value`, errors).trim();
    if (!label || !value) return;

    if (usedValues.has(value)) {
      errors.push(`${optionPath}.value must be unique.`);
      return;
    }
    usedValues.add(value);
    options.push({ label, value });
  });

  return options;
}

function readRequiredString(value: unknown, path: string, errors: string[]): string {
  if (typeof value === 'string' && value.trim()) return value;
  errors.push(`${path} must be a non-empty string.`);
  return '';
}

function readOptionalString(value: unknown, path: string, errors: string[]): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  errors.push(`${path} must be a string.`);
  return '';
}

function readOptionalNumber(
  value: unknown,
  path: string,
  errors: string[],
  apply: (value: number) => void,
) {
  if (value === undefined) return;
  if (typeof value === 'number' && Number.isFinite(value)) {
    apply(value);
    return;
  }
  errors.push(`${path} must be a number.`);
}

function readOptionalNonNegativeInteger(
  value: unknown,
  path: string,
  errors: string[],
  apply: (value: number) => void,
) {
  if (value === undefined) return;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    apply(value);
    return;
  }
  errors.push(`${path} must be a non-negative integer.`);
}
