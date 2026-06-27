import {
  validateSubmission,
  validateSchemaDocument,
  validateUiSchemaReferences,
  validateSupportedFields,
} from './validator';
import type { JsonSchema } from './types';

/** A representative form schema exercising the common field types/rules. */
const schema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['fullName', 'country', 'ownershipPercent'],
  properties: {
    fullName: { type: 'string', minLength: 1, maxLength: 200 },
    email: { type: 'string', format: 'email' },
    country: { type: 'string', enum: ['GB', 'US', 'ZM', 'NG'] },
    ownershipPercent: { type: 'number', minimum: 0, maximum: 100 },
    isPEP: { type: 'boolean' },
    appointedOn: { type: 'string', format: 'date' },
  },
};

describe('validateSubmission', () => {
  it('accepts a fully valid payload', () => {
    const result = validateSubmission(schema, {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      country: 'GB',
      ownershipPercent: 42,
      isPEP: false,
      appointedOn: '2020-01-15',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a missing required field and names it', () => {
    const result = validateSubmission(schema, { country: 'GB', ownershipPercent: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'required' && e.field === 'fullName')).toBe(
      true,
    );
  });

  it('enforces numeric maximum', () => {
    const result = validateSubmission(schema, {
      fullName: 'A',
      country: 'GB',
      ownershipPercent: 150,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'ownershipPercent', keyword: 'maximum' }),
    );
  });

  it('enforces enum membership', () => {
    const result = validateSubmission(schema, {
      fullName: 'A',
      country: 'ZW',
      ownershipPercent: 10,
    });
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'country', keyword: 'enum' }),
    );
  });

  it('enforces string formats (email, date)', () => {
    const result = validateSubmission(schema, {
      fullName: 'A',
      country: 'GB',
      ownershipPercent: 10,
      email: 'not-an-email',
      appointedOn: '15/01/2020',
    });
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('email');
    expect(fields).toContain('appointedOn');
  });

  it('rejects unknown properties (additionalProperties: false)', () => {
    const result = validateSubmission(schema, {
      fullName: 'A',
      country: 'GB',
      ownershipPercent: 10,
      hacker: 'extra',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'additionalProperties')).toBe(true);
  });

  it('returns ALL errors at once (allErrors)', () => {
    const result = validateSubmission(schema, { ownershipPercent: 150, country: 'ZW' });
    // missing fullName + bad ownershipPercent + bad country => at least 3
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateSchemaDocument', () => {
  it('accepts a well-formed schema', () => {
    expect(validateSchemaDocument(schema).valid).toBe(true);
  });

  it('rejects a malformed schema', () => {
    const broken = { type: 'object', properties: { x: { type: 'not-a-type' } } };
    expect(validateSchemaDocument(broken).valid).toBe(false);
  });
});

describe('validateUiSchemaReferences', () => {
  it('accepts an absent uiSchema', () => {
    expect(validateUiSchemaReferences(schema, null).valid).toBe(true);
    expect(validateUiSchemaReferences(schema, undefined).valid).toBe(true);
  });

  it('accepts a uiSchema whose order/fields all exist in the schema', () => {
    const ui = { order: ['fullName', 'country'], fields: { ownershipPercent: { widget: 'number' } } };
    expect(validateUiSchemaReferences(schema, ui).valid).toBe(true);
  });

  it('rejects a uiSchema referencing an unknown property and names it', () => {
    const ui = { order: ['fullName', 'ghost'], fields: { phantom: { widget: 'text' } } };
    const result = validateUiSchemaReferences(schema, ui);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field).sort()).toEqual(['ghost', 'phantom']);
  });
});

describe('validateSupportedFields', () => {
  it('accepts every supported field shape', () => {
    const supported: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        when: { type: 'string', format: 'date' },
        country: { type: 'string', enum: ['GB', 'US'] },
        percent: { type: 'number', minimum: 0, maximum: 100 },
        active: { type: 'boolean' },
        roles: { type: 'array', items: { type: 'string', enum: ['a', 'b'] }, uniqueItems: true },
      },
    };
    expect(validateSupportedFields(supported).valid).toBe(true);
  });

  it('accepts an empty form (no properties)', () => {
    expect(validateSupportedFields({ type: 'object', properties: {} }).valid).toBe(true);
  });

  it('rejects an unsupported field type and names the field', () => {
    const result = validateSupportedFields({
      type: 'object',
      properties: { age: { type: 'integer' } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ field: 'age', keyword: 'type' });
  });

  it('rejects a nested object field', () => {
    const result = validateSupportedFields({
      type: 'object',
      properties: { addr: { type: 'object', properties: { city: { type: 'string' } } } },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects an unsupported string format', () => {
    const result = validateSupportedFields({
      type: 'object',
      properties: { site: { type: 'string', format: 'uri' } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ field: 'site', keyword: 'format' });
  });

  it('rejects an array field without string+enum items', () => {
    const result = validateSupportedFields({
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'number' } } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ field: 'tags', keyword: 'items' });
  });

  it('rejects a non-object root', () => {
    expect(validateSupportedFields({ type: 'array' }).valid).toBe(false);
  });
});
