import {
  type BuilderField,
  type BuilderOption,
  isOptionListType,
  transitionFieldType,
  uniqueKey,
} from '@/app/forms/new/field-types';

export type DraftOption = BuilderOption & {
  id: string;
};

export type FieldSettingsDraft = Omit<BuilderField, 'options'> & {
  options?: DraftOption[];
};

type FieldSettingsState = {
  draft: FieldSettingsDraft;
};

type FieldSettingsAction =
  | { type: 'patch'; patch: Partial<FieldSettingsDraft> }
  | { type: 'typeChanged'; typeId: string }
  | { type: 'optionLabelChanged'; id: string; label: string }
  | { type: 'optionValueChanged'; id: string; value: string }
  | { type: 'optionRemoved'; id: string }
  | { type: 'optionAdded' };

export function createFieldSettingsState(field: BuilderField): FieldSettingsState {
  return { draft: toDraftField(field) };
}

export function fieldSettingsReducer(
  state: FieldSettingsState,
  action: FieldSettingsAction,
): FieldSettingsState {
  switch (action.type) {
    case 'patch':
      return { draft: { ...state.draft, ...action.patch } };
    case 'typeChanged': {
      const transitioned = transitionFieldType(toBuilderField(state.draft), action.typeId);
      return { draft: toDraftField(transitioned, state.draft.options) };
    }
    case 'optionLabelChanged':
      return {
        draft: {
          ...state.draft,
          options: state.draft.options?.map((option) =>
            option.id === action.id ? { ...option, label: action.label } : option,
          ),
        },
      };
    case 'optionValueChanged':
      return {
        draft: {
          ...state.draft,
          options: state.draft.options?.map((option) =>
            option.id === action.id ? { ...option, value: action.value } : option,
          ),
        },
      };
    case 'optionRemoved':
      return {
        draft: {
          ...state.draft,
          options: state.draft.options?.filter((option) => option.id !== action.id),
        },
      };
    case 'optionAdded': {
      const options = state.draft.options ?? [];
      const label = `Option ${options.length + 1}`;
      return {
        draft: {
          ...state.draft,
          options: [
            ...options,
            {
              id: crypto.randomUUID(),
              label,
              value: uniqueKey(
                `option${options.length + 1}`,
                options.map((option) => option.value),
              ),
            },
          ],
        },
      };
    }
  }
}

export function toBuilderField(draft: FieldSettingsDraft): BuilderField {
  const field: BuilderField = {
    ...draft,
    options: draft.options?.map(({ label, value }) => ({ label, value })),
  };
  if (!draft.options) delete field.options;
  return field;
}

export function hasInvalidOptions(field: FieldSettingsDraft): boolean {
  if (!isOptionListType(field.type.id)) return false;
  const options = field.options ?? [];
  const values = new Set<string>();
  if (options.length === 0) return true;

  for (const option of options) {
    const value = option.value.trim();
    if (!option.label.trim() || !value || values.has(value)) return true;
    values.add(value);
  }

  return false;
}

export function hasInvalidValidationRange(field: FieldSettingsDraft): boolean {
  if (
    (field.type.id === 'short-text' || field.type.id === 'long-text') &&
    field.minLength !== undefined &&
    field.maxLength !== undefined
  ) {
    return field.minLength > field.maxLength;
  }

  if (field.type.id === 'number' && field.min !== undefined && field.max !== undefined) {
    return field.min > field.max;
  }

  return false;
}

export function findDuplicateOptionValues(options: Array<{ value: string }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const option of options) {
    const value = option.value.trim();
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return duplicates;
}

function toDraftField(
  field: BuilderField,
  previousOptions: DraftOption[] = [],
): FieldSettingsDraft {
  return {
    ...field,
    options: field.options?.map((option, index) => ({
      id: previousOptions[index]?.id ?? crypto.randomUUID(),
      ...option,
    })),
  };
}
