import { validateSubmission, type JsonSchema, type ValidationError } from '@formbuilder/shared';
import type { FieldErrors, Resolver } from 'react-hook-form';

import type { FieldOption, FormValues, RenderField } from '@/app/f/[key]/fill-form-types';
import {
  readObject,
  readPrimitiveArray,
  readPrimitiveOptionValue,
  readString,
  schemaFieldRecords,
} from '@/lib/schema-fields';

export function createSchemaResolver(schema: unknown, fields: RenderField[]): Resolver<FormValues> {
  return async (values) => {
    const result = validateSubmission(schema as JsonSchema, buildSubmissionData(fields, values));
    if (result.valid) return { values, errors: {} };
    return { values: {}, errors: validationErrorsToFormErrors(result.errors) };
  };
}

export function validationErrorsToFormErrors(errors: ValidationError[]): FieldErrors<FormValues> {
  const next: FieldErrors<FormValues> = {};
  for (const error of errors) {
    if (error.field && !next[error.field]) {
      next[error.field] = { type: error.keyword, message: error.message };
    }
  }
  return next;
}

export function defaultValuesFor(fields: RenderField[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.widget === 'checkbox') {
      values[field.key] = undefined;
    } else if (field.widget === 'checkboxes') {
      values[field.key] = [];
    } else {
      values[field.key] = '';
    }
  }
  return values;
}

export function getRenderFields(schema: unknown, uiSchema: unknown): RenderField[] {
  return schemaFieldRecords(schema, uiSchema).map(({ key, property, required, uiField }) => ({
    key,
    label: readString(uiField.label) ?? key,
    help: readString(uiField.help) ?? undefined,
    placeholder: readString(uiField.placeholder) ?? undefined,
    widget: resolveWidget(property, uiField),
    type: readString(property.type),
    format: readString(property.format),
    required,
    options: fieldOptions(property, uiField),
  }));
}

export function buildSubmissionData(
  fields: RenderField[],
  values: FormValues,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.key];
    if (field.widget === 'checkbox') {
      if (typeof value === 'boolean') data[field.key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      data[field.key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) data[field.key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      data[field.key] = value;
      continue;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      data[field.key] = value;
    }
  }

  return data;
}

export function inputTypeFor(field: RenderField) {
  if (field.widget === 'number' || field.type === 'number') return 'number';
  if (field.format === 'email') return 'email';
  return 'text';
}

export function numberValue(value: string) {
  return value === '' ? undefined : Number(value);
}

export function selectValue(field: RenderField, value: string) {
  if (value === '') return undefined;
  if (field.type === 'number') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  if (field.type === 'boolean') return value === 'true';
  return value;
}

export function parseDateValue(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
  if (
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth - 1 ||
    date.getDate() !== parsedDay
  ) {
    return undefined;
  }
  return date;
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSubmittedValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '';
  return String(value);
}

function resolveWidget(property: Record<string, unknown>, uiField: Record<string, unknown>) {
  const widget = readString(uiField.widget);
  if (widget) return widget;
  if (property.type === 'array') return 'checkboxes';
  if (property.type === 'boolean') return 'checkbox';
  if (property.enum) return 'select';
  if (property.format === 'date') return 'date';
  return property.type === 'number' ? 'number' : 'text';
}

function fieldOptions(
  property: Record<string, unknown>,
  uiField: Record<string, unknown>,
): FieldOption[] {
  const schemaValues =
    property.type === 'array'
      ? readPrimitiveArray(readObject(property.items).enum)
      : readPrimitiveArray(property.enum);
  const uiOptions = readBuilderOptions(uiField['x-options']);
  const optionByValue = new Map(uiOptions.map((option) => [option.value, option]));
  return schemaValues.map((schemaValue) => {
    return (
      optionByValue.get(schemaValue) ??
      uiOptions.find((option) => String(option.value) === String(schemaValue)) ?? {
        label: String(schemaValue),
        value: schemaValue,
      }
    );
  });
}

function readBuilderOptions(value: unknown): FieldOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    const record = readObject(option);
    const label = readString(record.label);
    const optionValue = readPrimitiveOptionValue(record.value);
    return label && optionValue !== null ? [{ label, value: optionValue }] : [];
  });
}
