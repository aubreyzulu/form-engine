import { describe, expect, it } from 'vitest';

import { schemaFieldRecords } from '@/lib/schema-fields';

describe('schemaFieldRecords', () => {
  it('deduplicates uiSchema order entries before rendering fields', () => {
    const records = schemaFieldRecords(
      {
        type: 'object',
        properties: {
          status: { type: 'string' },
          name: { type: 'string' },
        },
      },
      {
        order: ['status', 'status', 'name'],
      },
    );

    expect(records.map((record) => record.key)).toEqual(['status', 'name']);
  });
});
