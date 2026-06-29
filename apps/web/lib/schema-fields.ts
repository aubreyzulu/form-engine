export type PrimitiveOptionValue = string | number | boolean;

export type SchemaFieldRecord = {
  key: string;
  property: Record<string, unknown>;
  uiField: Record<string, unknown>;
  required: boolean;
};

export function schemaFieldRecords(schema: unknown, uiSchema: unknown): SchemaFieldRecord[] {
  const schemaObject = readObject(schema);
  const properties = readObject(schemaObject.properties);
  const uiObject = readObject(uiSchema);
  const uiFields = readObject(uiObject.fields);
  const required = new Set(readStringArray(schemaObject.required));

  return orderedFieldKeys(properties, uiObject).map((key) => ({
    key,
    property: readObject(properties[key]),
    uiField: readObject(uiFields[key]),
    required: required.has(key),
  }));
}

function orderedFieldKeys(properties: Record<string, unknown>, uiSchema: Record<string, unknown>) {
  const seen = new Set<string>();
  const orderedKeys = readStringArray(uiSchema.order).filter((key) => {
    if (!(key in properties) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const remainingKeys = Object.keys(properties).filter((key) => !orderedKeys.includes(key));
  return [...orderedKeys, ...remainingKeys];
}

export function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function readPrimitiveArray(value: unknown): PrimitiveOptionValue[] {
  return Array.isArray(value) ? value.filter(isPrimitiveOptionValue) : [];
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function readPrimitiveOptionValue(value: unknown): PrimitiveOptionValue | null {
  return isPrimitiveOptionValue(value) ? value : null;
}

function isPrimitiveOptionValue(value: unknown): value is PrimitiveOptionValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
