import { describe, expect, it } from 'vitest';

import {
  builderSignature,
  createBuilderState,
  builderReducer,
  type BuilderState,
  initialBuilderState,
} from '@/app/forms/new/builder-state';
import { fieldType, type BuilderField } from '@/app/forms/new/field-types';

function field(overrides: Partial<BuilderField> = {}): BuilderField {
  return {
    id: 'field-1',
    key: 'fieldOne',
    label: 'Field One',
    type: fieldType('short-text'),
    required: true,
    ...overrides,
  };
}

function state(overrides: Partial<BuilderState> = {}): BuilderState {
  return {
    ...initialBuilderState,
    ...overrides,
  };
}

describe('builderReducer', () => {
  it('adds a field and starts editing the newly-created field', () => {
    const newField = field();
    const next = builderReducer(initialBuilderState, { type: 'fieldAdded', field: newField });

    expect(next.fields).toEqual([newField]);
    expect(next.editingId).toBe(newField.id);
  });

  it('duplicates a field after the source index and ignores invalid duplicate indexes', () => {
    const first = field({ id: 'field-1', key: 'first', label: 'First' });
    const second = field({ id: 'field-2', key: 'second', label: 'Second' });
    const duplicate = field({ id: 'field-3', key: 'first2', label: 'First' });
    const initial = state({ fields: [first, second] });

    expect(
      builderReducer(initial, { type: 'fieldDuplicated', field: duplicate, index: 0 }).fields.map(
        (item) => item.id,
      ),
    ).toEqual(['field-1', 'field-3', 'field-2']);
    expect(builderReducer(initial, { type: 'fieldDuplicated', field: duplicate, index: 99 })).toBe(
      initial,
    );
  });

  it('moves fields only when the target index exists', () => {
    const first = field({ id: 'field-1', key: 'first', label: 'First' });
    const second = field({ id: 'field-2', key: 'second', label: 'Second' });
    const initial = state({ fields: [first, second] });

    expect(
      builderReducer(initial, { type: 'fieldMoved', index: 0, direction: 1 }).fields.map(
        (item) => item.id,
      ),
    ).toEqual(['field-2', 'field-1']);
    expect(builderReducer(initial, { type: 'fieldMoved', index: 0, direction: -1 })).toBe(initial);
    expect(builderReducer(initial, { type: 'fieldMoved', index: 1, direction: 1 })).toBe(initial);
  });

  it('applies field edits and closes the field editor', () => {
    const original = field({ label: 'Original' });
    const updated = field({ label: 'Updated' });
    const next = builderReducer(state({ fields: [original], editingId: original.id }), {
      type: 'fieldApplied',
      field: updated,
    });

    expect(next.fields[0]?.label).toBe('Updated');
    expect(next.editingId).toBeNull();
  });

  it('applies JSON edits as the new source of truth and returns to builder mode', () => {
    const jsonField = field({ id: 'json-field', key: 'jsonField', label: 'JSON Field' });
    const next = builderReducer(
      state({ editingId: 'field-1', tab: 'json', name: 'Old', description: 'Old description' }),
      {
        type: 'jsonApplied',
        value: {
          name: 'New form',
          description: 'New description',
          fields: [jsonField],
        },
      },
    );

    expect(next).toMatchObject({
      name: 'New form',
      description: 'New description',
      fields: [jsonField],
      editingId: null,
      tab: 'builder',
    });
  });

  it('tracks save and publish signatures independently', () => {
    const saved = builderReducer(initialBuilderState, {
      type: 'savedSignatureChanged',
      signature: 'draft-signature',
    });
    const published = builderReducer(saved, {
      type: 'publishedSignatureChanged',
      signature: 'published-signature',
    });

    expect(published.savedSignature).toBe('draft-signature');
    expect(published.publishedSignature).toBe('published-signature');
  });

  it('hydrates an existing draft as already saved', () => {
    const fields = [field()];
    const hydrated = createBuilderState({
      name: 'Saved draft',
      description: 'Existing description',
      fields,
    });

    expect(hydrated).toMatchObject({
      name: 'Saved draft',
      description: 'Existing description',
      fields,
      publishedSignature: null,
    });
    expect(hydrated.savedSignature).toBe(builderSignature(hydrated));
  });

  it('ignores runtime field ids when calculating the save signature', () => {
    const first = state({ name: 'Form', fields: [field({ id: 'runtime-1' })] });
    const second = state({ name: 'Form', fields: [field({ id: 'runtime-2' })] });

    expect(builderSignature(first)).toBe(builderSignature(second));
  });
});
