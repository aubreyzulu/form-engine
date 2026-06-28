import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import type { JsonSchema, UiSchema, ValidationError, ValidationResult } from './types';

/**
 * Create a configured Ajv instance (JSON Schema draft 2020-12).
 *
 * - `allErrors`: collect every problem in one pass so users see all field errors
 *   at once instead of one-at-a-time.
 * - `strict: false`: tolerate the wide range of user-authored schemas the engine
 *   stores without Ajv rejecting harmless constructs.
 * - `ajv-formats`: adds `email`, `date`, `uri`, etc.
 */
function createValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

/** Map an Ajv error to our normalised, transport-agnostic shape. */
function normaliseError(error: ErrorObject): ValidationError {
  // `instancePath` is like "/ownershipPercent"; for `required` the offending
  // property is in params, not the path.
  let field = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    field = field ? `${field}.${missing}` : (missing ?? '');
  }
  return {
    field,
    keyword: error.keyword,
    message: error.message ?? 'is invalid',
  };
}

function normaliseErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];
  return errors.map(normaliseError);
}

/**
 * The field shapes the engine can render and therefore agrees to store. This is
 * the allowlist behind `validateSupportedFields`: a structurally valid JSON
 * Schema can still describe a field we have no widget for (e.g. `integer`,
 * nested `object`, `format: uri`), and we refuse to persist those.
 */
export const SUPPORTED_FIELD_TYPES = ['string', 'number', 'boolean', 'array'] as const;
/** Formats we support on a `string` field (everything else is rejected). */
export const SUPPORTED_STRING_FORMATS = ['email', 'date'] as const;

/** Validate a submission payload against a stored form schema. */
export function validateSubmission(schema: JsonSchema, data: unknown): ValidationResult {
  const validate = createValidator().compile(schema);
  const valid = validate(data) as boolean;
  return {
    valid,
    errors: valid ? [] : normaliseErrors(validate.errors),
  };
}

/**
 * Check that a uiSchema only references properties that exist in the schema.
 * A `uiSchema.order` entry or `uiSchema.fields` key pointing at a missing
 * property would render (or order) a field that has no validation rule — a
 * broken config we refuse to create or publish. Empty/absent uiSchema is valid.
 */
export function validateUiSchemaReferences(
  schema: JsonSchema,
  uiSchema: unknown,
): ValidationResult {
  if (uiSchema === null || typeof uiSchema !== 'object') {
    return { valid: true, errors: [] };
  }

  const rawProperties = schema.properties;
  const known = new Set(
    rawProperties && typeof rawProperties === 'object' ? Object.keys(rawProperties) : [],
  );

  const ui = uiSchema as UiSchema;
  const referenced = new Set<string>();
  const errors: ValidationError[] = [];

  if (ui.order !== undefined) {
    if (!Array.isArray(ui.order)) {
      errors.push({
        field: 'order',
        keyword: 'uiSchema',
        message: 'uiSchema.order must be an array of field names',
      });
    } else {
      const ordered = new Set<string>();
      ui.order.forEach((field, index) => {
        if (typeof field !== 'string') {
          errors.push({
            field: `order.${index}`,
            keyword: 'uiSchema',
            message: `uiSchema.order[${index}] must be a string`,
          });
          return;
        }
        if (ordered.has(field)) {
          errors.push({
            field,
            keyword: 'uiSchema',
            message: `uiSchema.order contains duplicate property "${field}"`,
          });
          return;
        }
        ordered.add(field);
        referenced.add(field);
      });
    }
  }

  if (ui.fields && typeof ui.fields === 'object') {
    for (const field of Object.keys(ui.fields)) referenced.add(field);
  }

  for (const field of referenced) {
    if (!known.has(field)) {
      errors.push({
        field,
        keyword: 'uiSchema',
        message: `uiSchema references unknown property "${field}"`,
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Check that every field in the schema uses a type/format the engine supports
 * and can render. Ajv accepts any structurally valid JSON Schema, but our
 * renderer only knows a fixed set of widgets — so we refuse to save a config
 * using anything outside that set. Supported shapes (mirrors docs/04):
 *
 *   - `string`  (optional `format` ∈ email|date, optional `enum` of strings)
 *   - `number`  (`minimum`/`maximum`)
 *   - `boolean`
 *   - `array`   (multi-choice: `items` must be `string` + `enum`)
 *
 * An empty `properties` (a not-yet-built form) is valid.
 */
export function validateSupportedFields(schema: JsonSchema): ValidationResult {
  const errors: ValidationError[] = [];

  if (schema.type !== 'object') {
    errors.push({ field: '', keyword: 'type', message: 'root schema must be type "object"' });
  }

  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') {
    return { valid: errors.length === 0, errors };
  }

  for (const [name, raw] of Object.entries(properties as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') {
      errors.push({ field: name, keyword: 'type', message: 'field must be an object' });
      continue;
    }
    const prop = raw as Record<string, unknown>;
    const type = prop.type;

    if (typeof type !== 'string' || !(SUPPORTED_FIELD_TYPES as readonly string[]).includes(type)) {
      errors.push({
        field: name,
        keyword: 'type',
        message: `unsupported field type "${String(type)}"`,
      });
      continue;
    }

    if (prop.format !== undefined) {
      if (type !== 'string') {
        errors.push({
          field: name,
          keyword: 'format',
          message: 'format is only supported on string fields',
        });
      } else if (
        typeof prop.format !== 'string' ||
        !(SUPPORTED_STRING_FORMATS as readonly string[]).includes(prop.format)
      ) {
        errors.push({
          field: name,
          keyword: 'format',
          message: `unsupported string format "${String(prop.format)}"`,
        });
      }
    }

    if (prop.enum !== undefined && !isStringArray(prop.enum)) {
      errors.push({
        field: name,
        keyword: 'enum',
        message: 'enum must be a list of strings',
      });
    }

    if (type === 'string') {
      const minLength = prop.minLength;
      const maxLength = prop.maxLength;
      if (typeof minLength === 'number' && typeof maxLength === 'number' && minLength > maxLength) {
        errors.push({
          field: name,
          keyword: 'minLength',
          message: 'minLength must be less than or equal to maxLength',
        });
      }
    }

    if (type === 'number') {
      const minimum = prop.minimum;
      const maximum = prop.maximum;
      if (typeof minimum === 'number' && typeof maximum === 'number' && minimum > maximum) {
        errors.push({
          field: name,
          keyword: 'minimum',
          message: 'minimum must be less than or equal to maximum',
        });
      }
    }

    if (type === 'array') {
      const items = prop.items;
      const itemsObj =
        items && typeof items === 'object' ? (items as Record<string, unknown>) : null;
      if (!itemsObj || itemsObj.type !== 'string' || !isStringArray(itemsObj.enum)) {
        errors.push({
          field: name,
          keyword: 'items',
          message: 'array fields must declare string items with an enum (multi-choice)',
        });
      }
      if (prop.uniqueItems !== true) {
        errors.push({
          field: name,
          keyword: 'uniqueItems',
          message: 'array fields must set uniqueItems: true',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Check that a value is itself a structurally valid JSON Schema. Used before a
 * form version is published so we never freeze a config that would reject every
 * submission. Returns errors describing why the schema is invalid.
 */
export function validateSchemaDocument(schema: unknown): ValidationResult {
  const ajv = createValidator();
  try {
    const valid = ajv.validateSchema(schema as JsonSchema, true) as boolean;
    return { valid, errors: valid ? [] : normaliseErrors(ajv.errors) };
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          field: '',
          keyword: 'schema',
          message: err instanceof Error ? err.message : 'invalid schema',
        },
      ],
    };
  }
}
