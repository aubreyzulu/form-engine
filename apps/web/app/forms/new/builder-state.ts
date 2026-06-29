import type { BuilderJsonApplyValue } from '@/app/forms/new/builder-json';
import type { BuilderField, BuilderOption, FieldType } from '@/app/forms/new/field-types';

export type BuilderTab = 'builder' | 'json';

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' | 'publishing' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export type BuilderState = {
  name: string;
  description: string;
  fields: BuilderField[];
  editingId: string | null;
  tab: BuilderTab;
  saveState: SaveState;
  savedSignature: string | null;
  publishedSignature: string | null;
};

export type BuilderInitialValue = {
  name: string;
  description: string;
  fields: BuilderField[];
};

type BuilderAction =
  | { type: 'nameChanged'; name: string }
  | { type: 'descriptionChanged'; description: string }
  | { type: 'tabChanged'; tab: BuilderTab }
  | { type: 'saveStateChanged'; saveState: SaveState }
  | { type: 'savedSignatureChanged'; signature: string }
  | { type: 'publishedSignatureChanged'; signature: string }
  | { type: 'fieldAdded'; field: BuilderField }
  | { type: 'fieldDuplicated'; field: BuilderField; index: number }
  | { type: 'fieldMoved'; index: number; direction: -1 | 1 }
  | { type: 'fieldEdited'; id: string }
  | { type: 'fieldEditorClosed' }
  | { type: 'fieldApplied'; field: BuilderField }
  | { type: 'jsonApplied'; value: BuilderJsonApplyValue };

export const initialBuilderState: BuilderState = {
  name: '',
  description: '',
  fields: [],
  editingId: null,
  tab: 'builder',
  saveState: { status: 'idle' },
  savedSignature: null,
  publishedSignature: null,
};

export function builderSignature({
  name,
  description,
  fields,
}: Pick<BuilderState, 'name' | 'description' | 'fields'>): string {
  return JSON.stringify({
    name: name.trim(),
    description: description.trim(),
    fields: fields.map(signatureField),
  });
}

function signatureField(field: BuilderField): Omit<BuilderField, 'id'> {
  const serializable: {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    helperText?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    options?: BuilderOption[];
  } = {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
  };
  if (field.helperText !== undefined) serializable.helperText = field.helperText;
  if (field.placeholder !== undefined) serializable.placeholder = field.placeholder;
  if (field.min !== undefined) serializable.min = field.min;
  if (field.max !== undefined) serializable.max = field.max;
  if (field.minLength !== undefined) serializable.minLength = field.minLength;
  if (field.maxLength !== undefined) serializable.maxLength = field.maxLength;
  if (field.options !== undefined) serializable.options = field.options;
  return serializable;
}

export function createBuilderState(initialValue?: BuilderInitialValue): BuilderState {
  if (!initialValue) return initialBuilderState;
  const state = {
    ...initialBuilderState,
    name: initialValue.name,
    description: initialValue.description,
    fields: initialValue.fields,
  };
  return { ...state, savedSignature: builderSignature(state) };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'nameChanged':
      return { ...state, name: action.name };
    case 'descriptionChanged':
      return { ...state, description: action.description };
    case 'tabChanged':
      return { ...state, tab: action.tab };
    case 'saveStateChanged':
      return { ...state, saveState: action.saveState };
    case 'savedSignatureChanged':
      return { ...state, savedSignature: action.signature };
    case 'publishedSignatureChanged':
      return { ...state, publishedSignature: action.signature };
    case 'fieldAdded':
      return {
        ...state,
        fields: [...state.fields, action.field],
        editingId: action.field.id,
      };
    case 'fieldDuplicated': {
      if (!state.fields[action.index]) return state;
      return {
        ...state,
        fields: [
          ...state.fields.slice(0, action.index + 1),
          action.field,
          ...state.fields.slice(action.index + 1),
        ],
      };
    }
    case 'fieldMoved': {
      const target = action.index + action.direction;
      const current = state.fields[action.index];
      const swap = state.fields[target];
      if (!current || !swap) return state;

      const fields = [...state.fields];
      fields[action.index] = swap;
      fields[target] = current;
      return { ...state, fields };
    }
    case 'fieldEdited':
      return { ...state, editingId: action.id };
    case 'fieldEditorClosed':
      return { ...state, editingId: null };
    case 'fieldApplied':
      return {
        ...state,
        fields: state.fields.map((field) => (field.id === action.field.id ? action.field : field)),
        editingId: null,
      };
    case 'jsonApplied':
      return {
        ...state,
        name: action.value.name,
        description: action.value.description,
        fields: action.value.fields,
        editingId: null,
        tab: 'builder',
      };
  }
}
